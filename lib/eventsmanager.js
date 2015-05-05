/**
 * Copyright reelyActive 2014
 * We believe in an open Internet of Things
 */

var util = require('util');
var events = require('events');
var nedb = require('nedb');

var TEMPORAL_EVENTS_INTERVAL_MILLISECONDS = 1000;
var DISAPPEARANCE_MILLISECONDS = 10000;
var KEEP_ALIVE_MILLISECONDS = 5000;


/**
 * EventsManager Class
 * Collects and manages events in a database
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function EventsManager(options) {
  var self = this;
  this.disappearanceMilliseconds = options.disappearanceMilliseconds ||
                                   DISAPPEARANCE_MILLISECONDS;
  this.keepAliveMilliseconds = options.keepAliveMilliseconds ||
                               KEEP_ALIVE_MILLISECONDS;
  this.db = new nedb();
  this.db.ensureIndex({ fieldName: "tiraid.timestamp" });
  this.db.ensureIndex({ fieldName: "tiraid.radioDecodings.0.identifier.value" });

  function temporalEventDetection() {
    handleTimeoutEvents(self);
    updateStatisticsRecords(self);
  }

  setInterval(temporalEventDetection, TEMPORAL_EVENTS_INTERVAL_MILLISECONDS);

  events.EventEmitter.call(this);
};
util.inherits(EventsManager, events.EventEmitter);


/**
 * Handle a tiraid, update the database and detect Displacement and
 * Appearance events.
 * @param {Object} tiraid The tiraid object.
 * @param {callback} callback Function to call on completion.
 */
EventsManager.prototype.handleTiraid = function(tiraid, callback) {
  var self = this;
  var id = tiraid.identifier.value;
  var strongestDecoder = tiraid.radioDecodings[0].identifier.value;
  var eventTimestamp = tiraid.timestamp; // TODO: validate against current time?
  if(self.currentStatistics === undefined) { updateStatisticsRecords(self); }
  self.currentStatistics.tiraids++;

  // Try to update a record with the same ID and strongestDecoder,
  // if successful, no event occurred.
  this.db.update({ _id: id, "tiraid.radioDecodings.0.identifier.value": strongestDecoder },
                 { $set: { tiraid: tiraid } }, { upsert: true },
                 function(err, numReplaced, newDoc) {

    // ID exists but strongestDecoder is different, this is a Displacement
    if(err && (err.errorType == "uniqueViolated")) {
      self.db.update({ _id: id }, { $set: { tiraid: tiraid,
                     eventTimestamp: eventTimestamp } }, { upsert: true },
                     function(err, numReplaced, newDoc) {
        // TODO: tiraid mashup if multiple origins
        self.emit('displacement', tiraid);
        self.currentStatistics.displacements++;
        callback( { event: "displacement" } );
      });
    }

    // A new record was created, this is an Appearance, update eventTimestamp
    else if(newDoc) {
      self.db.update({ _id: id }, { $set: { eventTimestamp: eventTimestamp } },
                     {}, function(err, numReplaced) {
        self.emit('appearance', tiraid);
        self.currentStatistics.appearances++;
        callback( { event: "appearance" } );
      });
    }
  });
};


/**
 * Handle a tiraid, update the database and detect Displacement and
 * Appearance events.
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
}


/**
 * Get the current state of events.
 * @param {Object} options The options as a JSON object.
 * @param {callback} callback Function to call on completion.
 */
EventsManager.prototype.getState = function(options, callback) {
  var self = this;

  if(options.ids) {
    this.db.find({ $or: [{ _id: { $in: options.ids } },
                         { "tiraid.radioDecodings.identifier.value":
                           { $in: options.ids } }] },
                 { _id: 0 }, function(err, matching) {
      convertToState(err, matching, options, callback);
    });
  }
  else {
    callback({});
  }
}


/**
 * Get the latest statistics record.
 */
EventsManager.prototype.getStatistics = function() {
  var self = this;

  return self.compiledStatistics;
}


/**
 * Convert database query results into state
 * @param {error} err The error message from the database query.
 * @param {Array} matching The array of matching query results.
 * @param {Object} options The options as a JSON object.
 * @param {callback} callback Function to call on completion.
 */
function convertToState(err, matching, options, callback) {
  var state = {};
  for(var cId = 0; cId < matching.length; cId++) {
    var tiraid = matching[cId].tiraid;
    var identifierValue = tiraid.identifier.value;
    var isMatchingTransmitter = (options.ids.indexOf(identifierValue) != -1);
    var condenseState = (options.condenseState === true);

    // Include the full tiraid if the id matches that of a transmitter
    if(isMatchingTransmitter || !condenseState) {
      state[identifierValue] = tiraid;
    }

    // Include only the tiraid identifier if the id matches that of a receiver
    // when condenseState option is set
    else {
      state[identifierValue] = { "identifier": tiraid.identifier };
    }
  }
  callback(state);
}


/**
 * Handle timeout events (disappearance and keep-alive) from the database
 * @param {EventsManager} instance The given instance.
 */
function handleTimeoutEvents(instance) {
  getTimeoutEvents(instance, function(disappearances, keepAlives) {
    handleDisappearances(instance, disappearances, function() {
      handleKeepAlives(instance, keepAlives, function() { });
    });
  });
}


/**
 * Get timeout events (disappearance and keep-alive) from the database
 * @param {EventsManager} instance The given instance.
 * @param {callback} callback Function to call on completion.
 */
function getTimeoutEvents(instance, callback) {
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
}


/**
 * Handle disappearance events from the database
 * @param {EventsManager} instance The given instance.
 * @param {Object} disappearances The disappearance ids and tiraids.
 * @param {callback} callback Function to call on completion.
 */
function handleDisappearances(instance, disappearances, callback) {
  for(var cDisappearance = 0; cDisappearance < disappearances.ids.length;
      cDisappearance++) {
    instance.emit('disappearance', disappearances.tiraids[cDisappearance]);
    instance.currentStatistics.disappearances++;
  }
  instance.db.remove({ _id: { $in: disappearances.ids } }, { multi: true },
                     function(err, numRemoved) {
    callback();
  });
}


/**
 * Handle keep-alive events
 * @param {EventsManager} instance The given instance.
 * @param {Object} keepAlives The keep-alive ids and tiraids.
 * @param {callback} callback Function to call on completion.
 */
function handleKeepAlives(instance, keepAlives, callback) {
  var currentTime = new Date().toISOString();
  for(var cKeepAlive = 0; cKeepAlive < keepAlives.ids.length; cKeepAlive++) {
    instance.emit('keep-alive', keepAlives.tiraids[cKeepAlive]);
  }
  instance.db.update({ _id: { $in: keepAlives.ids } }, { $set:
                     { eventTimestamp: currentTime } }, { multi: true },
                     function(err, numReplaced) { callback() });
}


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
    for(key in instance.currentStatistics) {
      instance.compiledStatistics[key] = instance.currentStatistics[key] / seconds;
      instance.currentStatistics[key] = 0;
    }
    instance.db.count({}, function (err, count) {
      instance.compiledStatistics.devices = count;
    });
  }
}


module.exports = EventsManager;
