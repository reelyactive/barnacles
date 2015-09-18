/**
 * Copyright reelyActive 2014-2015
 * We believe in an open Internet of Things
 */

var util = require('util');
var events = require('events');
var nedb = require('nedb');
var reelib = require('reelib');


var TEMPORAL_EVENTS_INTERVAL_MILLISECONDS = 1000;
var DEFAULT_DELAY_MILLISECONDS = 1000;
var DEFAULT_MIN_DELAY_MILLISECONDS = 100;
var DEFAULT_DISAPPEARANCE_MILLISECONDS = 10000;
var DEFAULT_KEEP_ALIVE_MILLISECONDS = 5000;
var DEFAULT_HISTORY_MILLISECONDS = 5000;
var OMIT_TIMESTAMP = 'timestamp';
var OMIT_RADIO_DECODINGS = 'radioDecodings';
var OMIT_IDENTIFIER = 'identifier';


/**
 * EventsManager Class
 * Collects and manages events in a database
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function EventsManager(options) {
  var self = this;
  self.delayMilliseconds = options.delayMilliseconds ||
                           DEFAULT_DELAY_MILLISECONDS;
  self.minDelayMilliseconds = options.minDelayMilliseconds ||
                              DEFAULT_MIN_DELAY_MILLISECONDS;
  self.disappearanceMilliseconds = options.disappearanceMilliseconds ||
                                   DEFAULT_DISAPPEARANCE_MILLISECONDS;
  self.keepAliveMilliseconds = options.keepAliveMilliseconds ||
                               DEFAULT_KEEP_ALIVE_MILLISECONDS;
  self.historyMilliseconds = options.historyMilliseconds ||
                             DEFAULT_HISTORY_MILLISECONDS;
  self.db = new nedb();
  self.db.ensureIndex({ fieldName: "timeout" });
  self.db.ensureIndex({
    fieldName: "lastEvent.radioDecodings.identifier.value"
  });

  function temporalEventDetection() {
    updateStatisticsRecords(self);
  }

  setInterval(temporalEventDetection, TEMPORAL_EVENTS_INTERVAL_MILLISECONDS);

  self.handleTimeoutEvents();

  events.EventEmitter.call(this);
}
util.inherits(EventsManager, events.EventEmitter);


/**
 * Handle all expired timeouts.  This function sets itself to run again when
 * the next timeout is due to expire, or after the minimum sleep milliseconds,
 * whichever is greater.
 */
EventsManager.prototype.handleTimeoutEvents = function() {
  var self = this;
  var currentTimestamp = reelib.time.getCurrent();
  var timeoutMilliseconds;

  removeStaleDecodings(self, currentTimestamp, function() {
    determineAndEmitEvents(self, currentTimestamp, function(updates, removes) {
      updateState(self, updates, currentTimestamp, function() {
        removeDisappearances(self, removes, function() {
          determineNextTimeout(self, currentTimestamp, function(nextTimeout) {
            timeoutMilliseconds = reelib.time.getCurrentOffset(nextTimeout);
            setTimeout(self.handleTimeoutEvents.bind(self),
                       timeoutMilliseconds);
          });
        });
      });
    });
  });
};


/**
 * Handle a tiraid, update the database and detect Displacement and
 * Appearance events.
 * @param {Object} tiraid The tiraid object.
 * @param {callback} callback Function to call on completion.
 */
EventsManager.prototype.handleTiraid = function(tiraid, callback) {
  var self = this;
  var id = tiraid.identifier.value;
  var decoding = { radioDecodings: tiraid.radioDecodings,
                   timestamp: tiraid.timestamp };
  var payload = { identifier: tiraid.identifier };

  if(self.currentStatistics === undefined) { updateStatisticsRecords(self); }
  self.currentStatistics.tiraids++;

  self.db.update({ _id: id },
                 { $push: { decodings: decoding },
                   $addToSet: { payloads: payload } },
                 { upsert: true },
                 function(err, numReplaced, newDoc) {

    // The device ID does not exist in the database, set the timeout as this
    // is the first event which will become an appearance
    if(newDoc) {
      var timeout = reelib.time.getFuture(self.delayMilliseconds);
      tiraid.isPreliminaryAppearance = true;
      self.db.update({ _id: id },
                     { $set: { timeout: timeout, lastEvent: tiraid } },
                     {}, function(err, numReplaced) {
      });
    }
    callback(); // TODO: anything worth responding?
  });
};


/**
 * Removes all stale decodings from all objects in the database that have an
 * expired timestamp.
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Number} currentTimestamp The current timestamp.
 * @param {callback} callback The function to call on completion.
 */
function removeStaleDecodings(instance, currentTimestamp, callback) {
  var historyTimeout = reelib.time.toFuture(currentTimestamp,
                                            -instance.historyMilliseconds);
  var historyTimeoutISO = new Date(historyTimeout).toISOString();

  instance.db.update({ timeout: { $lt: currentTimestamp } },
                     { $pull: { decodings: { timestamp:
                                             { $lt: historyTimeoutISO } } } },
                     { multi: true },
                     function(err, numReplaced) {
    callback();
  });
}


/**
 * Finds all timeout events in the database, determines and emits the event,
 * prepares database updates and removes to include in the callback.
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Number} currentTimestamp The current timestamp.
 * @param {callback} callback The function to call on completion.
 */
function determineAndEmitEvents(instance, currentTimestamp, callback) {
  var updates = [];
  var removes = [];

  instance.db.find({ timeout: { $lt: currentTimestamp } },
                   function(err, docs) {
    for(var cEvent = 0; cEvent < docs.length; cEvent++) {
      var event = handleTimeoutEvent(instance, docs[cEvent],
                                     currentTimestamp);
      if(event.type === 'disappearance') {
        removes.push(event._id);
      }
      else {
        updates.push(event);
      }
    }
    callback(updates, removes);
  });
}


/**
 * Updates the state of the database based on the given array of updates as a
 * self-recursive function that handles a single update per iteration.
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Array} updates The updates to make.
 * @param {Number} currentTimestamp The current timestamp.
 * @param {callback} callback The function to call on completion.
 */
function updateState(instance, updates, currentTimestamp, callback) {
  if(updates.length > 0) {
    var update = updates.pop();
    var updateFields = { timeout: update.timeout };
    var isNewEvent = (update.type !== null);
    if(isNewEvent) {
      updateFields.lastEvent = update.tiraid;
      updateFields.payloads = [];
      updateFields.eventTimestamp = currentTimestamp;
    }
    instance.db.update({ _id: update._id }, { $set: updateFields }, {},
                       function(err, numReplaced) {
      updateState(instance, updates, currentTimestamp, callback); // Recursion
    });
  }
  else {
    callback(); // All state updates complete (end self-recursion)
  }
}


/**
 * Remove all disappeared ids from the database.
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Array} removes The array of ids to remove.
 * @param {callback} callback The function to call on completion.
 */
function removeDisappearances(instance, removes, callback) {
  instance.db.remove({ _id: { $in: removes } }, { multi: true },
                     function(err, numRemoved) {
    callback();
  });
}


/**
 * Determine the next timeout as either the earliest timeout in the database
 * or the timeout after the minimum delay, whichever is greater.
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Number} currentTimestamp The current timestamp.
 * @param {callback} callback The function to call on completion.
 */
function determineNextTimeout(instance, currentTimestamp, callback) {
  instance.db.find({}).sort({ timeout: 1 }).limit(1).exec(function (err, docs) {
    var nextTimeout;
    var isEmptyDatabase = (docs.length === 0);

    if(isEmptyDatabase) {
      nextTimeout = reelib.time.toFuture(currentTimestamp,
                                         instance.delayMilliseconds);
    }
    else {
      nextTimeout = reelib.time.toFuture(currentTimestamp,
                                         instance.minDelayMilliseconds);
      if(typeof(docs[0].timeout !== 'undefined')) {
        nextTimeout = Math.max(nextTimeout, docs[0].timeout);
      }
    }
    callback(nextTimeout);
  });
}


/**
 * Handle a single timeout event
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Object} device The device with the timeout.
 * @param {Number} currentTimestamp The current timestamp.
 * @return {Object} Event details (new lastEvent).
 */
function handleTimeoutEvent(instance, device, currentTimestamp) {
  var event = {};

  if(isAppearance(instance, device)) {
    event.type = 'appearance';
    instance.currentStatistics.appearances++;
  }
  else if(isDisappearance(instance, device, currentTimestamp)) {
    event.type = 'disappearance';
    instance.currentStatistics.disappearances++;
  }
  else if(isDisplacement(device)) {
    event.type = 'displacement';
    instance.currentStatistics.displacements++;
  }
  else if(isKeepAlive(instance, device, currentTimestamp)) {
    event.type = 'keep-alive';
  }
  else {
    event.type = null;
  }

  if(event.type) {
    event.tiraid = createEventTiraid(instance, device);
    instance.emit(event.type, event.tiraid);
  }

  event._id = device._id;
  event.timeout = device.timeout + instance.delayMilliseconds;
  return event;
}


/**
 * Determine if the given event is an appearance
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Object} device The device with the timeout.
 * @return {boolean} True if the given event is an appearance.
 */
function isAppearance(instance, device, currentTimestamp) {
  return device.lastEvent.isPreliminaryAppearance || false;
}


/**
 * Determine if the given event is a disappearance
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Object} device The device with the timeout.
 * @param {Number} currentTimestamp The current timestamp.
 * @return {boolean} True if the given event is a disappearance.
 */
function isDisappearance(instance, device, currentTimestamp) {
  var lastEventTimestamp = device.lastEvent.timestamp;
  var disappearanceTimestamp = reelib.time.toFuture(lastEventTimestamp,
                                          instance.disappearanceMilliseconds);
  return reelib.time.isEarlier(disappearanceTimestamp, currentTimestamp);
}


/**
 * Determine if the given event is a displacement
 * @param {Object} device The device with the timeout.
 * @return {boolean} True if the given event is a displacement.
 */
function isDisplacement(device) {
  var lastStrongestDecoding = device.lastEvent.radioDecodings[0];
  var lastStrongestDecoder = lastStrongestDecoding.identifier.value;
  var sortedDecodings = sortDecodings(device.decodings);
  device.sortedDecodings = sortedDecodings;

  if(sortedDecodings.length === 0) {
    return false;
  }

  var currentStrongestDecoder = sortedDecodings[0].identifier.value;

  return (currentStrongestDecoder !== lastStrongestDecoder);
}


/**
 * Determine if the given event is a keep-alive
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Object} device The device with the timeout.
 * @param {Number} currentTimestamp The current timestamp.
 * @return {boolean} True if the given event is a displacement.
 */
function isKeepAlive(instance, device, currentTimestamp) {
  var lastEventTimestamp = device.eventTimestamp;
  var nextKeepAliveTimestamp = reelib.time.toFuture(lastEventTimestamp,
                                              instance.keepAliveMilliseconds);
  return reelib.time.isEarlier(nextKeepAliveTimestamp, currentTimestamp);
}


/**
 * Create the tiraid for the current event based on all available data
 * @param {EventsManager} instance The given EventsManager instance.
 * @param {Object} device The device with the timeout.
 * @return {Object} The created tiraid.
 */
function createEventTiraid(instance, device) {

  // No decodings within the history, copy last event
  if(device.decodings.length === 0) {
    return device.lastEvent;
  }

  // Create tiraid from recent decodings
  else {
    var identifier = mergePayloads(device.payloads) ||
                     device.lastEvent.identifier;
    var radioDecodings = device.sortedDecodings ||
                         sortDecodings(device.decodings);
    var timestamp = device.decodings[device.decodings.length - 1].timestamp;

    return { identifier: identifier,
             timestamp: timestamp,
             radioDecodings: radioDecodings };
  }
}


/**
 * Sort the given decodings by average RSSI.
 * @param {Array} decodings The array of decodings.
 * @return {Array} Sorted array of decodings, strongest average RSSI first.
 */
function sortDecodings(decodings) {
  var receivers = {};
  var sortedList = [];

  // Organise by receiver IDs
  for(var cDecoding = 0; cDecoding < decodings.length; cDecoding++) {
    var radioDecodings = decodings[cDecoding].radioDecodings;
    for(var cDecoder = 0; cDecoder < radioDecodings.length; cDecoder++) {
      var radioDecoding = radioDecodings[cDecoder];
      var receiverId = radioDecoding.identifier.value;
      if(typeof(receivers[receiverId]) === 'undefined') {
        receivers[receiverId] = { identifier: radioDecoding.identifier,
                                  rssis: [] };
      }
      receivers[receiverId].rssis.push(radioDecoding.rssi);
    }
  }

  // Calculate average RSSI
  for(var receiverId in receivers) {
    if(receivers.hasOwnProperty(receiverId)) {
      var receiver = receivers[receiverId];
      var rssiSum = 0;
      var rssiCount = 0;
      for(var cRssi = 0; cRssi < receiver.rssis.length; cRssi++) {
        rssiSum += receiver.rssis[cRssi];
        rssiCount++;
      }
      receiver.rssi = Math.round(rssiSum / rssiCount);
      delete receiver.rssis;
      sortedList.push(receiver);
    }
  }

  // Organise by average RSSI
  sortedList.sort(function(a,b) { return b.rssi - a.rssi });

  return sortedList;
}


/**
 * Merge the given payloads into a single one.
 * @param {Array} payloads The array of payloads.
 * @return {Object} The merged payload.
 */
function mergePayloads(payloads) {
  // TODO: actually perform a merge rather than simply taking the most recent
  if(payloads.length > 0) {
    var lastPayloadIndex = payloads.length - 1;
    return payloads[lastPayloadIndex].identifier;
  }
  return null;
}



/**
 * Handle an event.
 * @param {String} event The name of the event type.
 * @param {Object} tiraid The tiraid object.
 * @param {callback} callback Function to call on completion.
 */
EventsManager.prototype.handleEvent = function(event, tiraid, callback) {
  var self = this;

  if(event === 'disappearance') {
    callback( { event: "disappearance" } );  // TODO: anything else to do?
  }
  else {
    self.handleTiraid(tiraid, callback);
  }
};


/**
 * Get the current state of events.
 * @param {Object} options The options as a JSON object.
 * @param {callback} callback Function to call on completion.
 */
EventsManager.prototype.getState = function(options, callback) {
  var self = this;
  var hasIds = options.ids instanceof Array;

  if(!hasIds) {
    callback( { devices: {} } );
  }
  else {
    switch(options.query) {

      // Get everything decoded by the devices with the given ids
      case 'receivedBy':
        self.db.find({ "lastEvent.radioDecodings.identifier.value":
                         { $in: options.ids } }, { lastEvent: 1 })
               .sort({ "lastEvent.identifier.value": 1 })
               .exec(function(err, docs) {
                       convertToState(err, docs, options, callback);
        });
        break;

      // Get everything decoded strongest by the devices with the given ids
      case 'receivedStrongestBy':
        self.db.find({ "lastEvent.radioDecodings.0.identifier.value":
                         { $in: options.ids } }, { lastEvent: 1 })
               .sort({ "lastEvent.identifier.value": 1 })
               .exec(function(err, docs) {
                       convertToState(err, docs, options, callback);
        });
        break;

      // Get everything decoded by the devices which decoded the given
      //   transmitter ids the strongest (requires two database calls)
      case 'receivedBySame':
        self.db.find({ _id: { $in: options.ids } }, { lastEvent: 1 },
                     function(err, docs) {
          var decoderIds = getDecoderIds(docs);
          self.db.find({ "lastEvent.radioDecodings.identifier.value":
                           { $in: decoderIds } })
               .sort({ "lastEvent.identifier.value": 1 })
               .exec(function(err, docs) {
                       convertToState(err, docs, options, callback);
          });
        });
        break;

      // Get the transmissions by the devices with the given ids (default)
      case 'transmittedBy':
      default:
        self.db.find({ _id: { $in: options.ids } }, { lastEvent: 1 },
                     function(err, docs) {
          convertToState(err, docs, options, callback);
        });
    }
  }
};


/**
 * Get the latest statistics record.
 */
EventsManager.prototype.getStatistics = function() {
  var self = this;

  return self.compiledStatistics;
};


/**
 * Convert database query results into state
 * @param {error} err The error message from the database query.
 * @param {Array} matching The array of matching query results.
 * @param {Object} options The options as a JSON object.
 * @param {callback} callback Function to call on completion.
 */
function convertToState(err, matching, options, callback) {
  options.omit = options.omit || [];
  var state = { devices: {} };
  for(var cId = 0; cId < matching.length; cId++) {
    var id = matching[cId]._id;
    var tiraid = matching[cId].lastEvent;
    if(options.omit.indexOf(OMIT_TIMESTAMP) > -1) {
      delete tiraid.timestamp;
    }
    if(options.omit.indexOf(OMIT_RADIO_DECODINGS) > -1) {
      delete tiraid.radioDecodings;
    }
    if(options.omit.indexOf(OMIT_IDENTIFIER) > -1) {
      delete tiraid.identifier;
    }
    state.devices[id] = tiraid;
  }
  callback(state);
}


/**
 * Get all the strongest decoder IDs from the given docs and return as an array
 * @param {Array} matching The array of docs.
 * @return {Array} Array of strongest decoder IDs with no duplicates.
 */
function getDecoderIds(docs) {
  var decoderIds = [];
  for(var cId = 0; cId < docs.length; cId++) {
    var tiraid = docs[cId].lastEvent;
    var strongestDecoderId = tiraid.radioDecodings[0].identifier.value;
    if(decoderIds.indexOf(strongestDecoderId) === -1) {
      decoderIds.push(strongestDecoderId);
    }
  }
  return decoderIds;
}


/**
 * Handle timeout events (disappearance and keep-alive) from the database
 * @param {EventsManager} instance The given instance.
 */
/*function handleTimeoutEvents(instance) {
  getTimeoutEvents(instance, function(disappearances, keepAlives) {
    handleDisappearances(instance, disappearances, function() {
      handleKeepAlives(instance, keepAlives, function() { });
    });
  });
}*/


/**
 * Get timeout events (disappearance and keep-alive) from the database
 * @param {EventsManager} instance The given instance.
 * @param {callback} callback Function to call on completion.
 */
/*function getTimeoutEvents(instance, callback) {
  var disappearances = { ids: [], tiraids: [] };
  var keepAlives = { ids: [], tiraids: [] };
  var currentTime = new Date();
  var currentMilliseconds = currentTime.getMilliseconds();
  var disappearanceCutoffTime = new Date().setMilliseconds(
                                  currentMilliseconds -
                                  instance.disappearanceMilliseconds);
  var keepAliveCutoffTime = new Date().setMilliseconds(
                                  currentMilliseconds -
                                  instance.keepAliveMilliseconds);
  disappearanceCutoffTime = new Date(disappearanceCutoffTime).toISOString();
  keepAliveCutoffTime = new Date(keepAliveCutoffTime).toISOString();
  currentTime = currentTime.toISOString();
  instance.db.find({ $or: [ { "tiraid.timestamp": { $lt: disappearanceCutoffTime } },
                            { eventTimestamp: { $lt: keepAliveCutoffTime } } ] },
                   function(err, docs) {
    for(var cDoc = 0; cDoc < docs.length; cDoc++) {
      var doc = docs[cDoc];
      var id = doc._id;
      var tiraid = doc.tiraid;
      var isDisappearance = (tiraid.timestamp < disappearanceCutoffTime);
      var isKeepAlive = (doc.eventTimestamp < keepAliveCutoffTime);
      if(isDisappearance) {
        disappearances.ids.push(id);
        disappearances.tiraids.push(tiraid);
      }
      else if(isKeepAlive) {
        keepAlives.ids.push(id);
        keepAlives.tiraids.push(tiraid);
      }
    }
    callback(disappearances, keepAlives);
  });
}*/


/**
 * Handle disappearance events from the database
 * @param {EventsManager} instance The given instance.
 * @param {Object} disappearances The disappearance ids and tiraids.
 * @param {callback} callback Function to call on completion.
 */
/*function handleDisappearances(instance, disappearances, callback) {
  for(var cDisappearance = 0; cDisappearance < disappearances.ids.length;
      cDisappearance++) {
    instance.emit('disappearance', disappearances.tiraids[cDisappearance]);
    instance.currentStatistics.disappearances++;
  }
  instance.db.remove({ _id: { $in: disappearances.ids } }, { multi: true },
                     function(err, numRemoved) {
    callback();
  });
}*/


/**
 * Handle keep-alive events
 * @param {EventsManager} instance The given instance.
 * @param {Object} keepAlives The keep-alive ids and tiraids.
 * @param {callback} callback Function to call on completion.
 */
/*function handleKeepAlives(instance, keepAlives, callback) {
  var currentTime = new Date().toISOString();
  for(var cKeepAlive = 0; cKeepAlive < keepAlives.ids.length; cKeepAlive++) {
    instance.emit('keep-alive', keepAlives.tiraids[cKeepAlive]);
  }
  instance.db.update({ _id: { $in: keepAlives.ids } }, { $set:
                     { eventTimestamp: currentTime } }, { multi: true },
                     function(err, numReplaced) { callback(); });
}*/


/**
 * Update statistics records on the captured events
 * @param {EventsManager} instance The given instance.
 */
function updateStatisticsRecords(instance) {
  if(instance.compiledStatistics === undefined) {
    instance.compiledStatistics = { devices: 0, tiraids: 0, appearances: 0,
                                    displacements: 0, disappearances: 0 };
    instance.currentStatistics = { tiraids: 0, appearances: 0,
                                   displacements: 0, disappearances: 0 };
  }
  else {
    var seconds = TEMPORAL_EVENTS_INTERVAL_MILLISECONDS / 1000;
    for(var key in instance.currentStatistics) {
      instance.compiledStatistics[key] = instance.currentStatistics[key] / seconds;
      instance.currentStatistics[key] = 0;
    }
    instance.db.count({}, function (err, count) {
      instance.compiledStatistics.devices = count;
    });
  }
}


module.exports = EventsManager;
