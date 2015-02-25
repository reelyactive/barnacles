/**
 * Copyright reelyActive 2014
 * We believe in an open Internet of Things
 */

var util = require('util');
var events = require('events');
var nedb = require('nedb');

var TEMPORAL_EVENTS_INTERVAL_MILLISECONDS = 1000;
var DISAPPEARANCE_MILLISECONDS = 10000;


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
  this.db = new nedb();
  this.db.ensureIndex({ fieldName: "tiraid.timestamp" });
  this.db.ensureIndex({ fieldName: "tiraid.radioDecodings.0.identifier.value" });

  function temporalEventDetection() {
    detectDisappearances(self);
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
 */
EventsManager.prototype.handleTiraid = function(tiraid) {
  var self = this;
  var id = tiraid.identifier.value;
  var strongestDecoder = tiraid.radioDecodings[0].identifier.value;
  self.currentStatistics.tiraids++;

  // Try to update a record with the same ID and strongestDecoder,
  // if successful, no event occurred.
  this.db.update({ _id: id, "tiraid.radioDecodings.0.identifier.value": strongestDecoder },
                 { $set: { tiraid: tiraid } }, { upsert: true },
                 function(err, numReplaced, newDoc) {

    // ID exists but strongestDecoder is different, this is a Displacement
    if(err && (err.errorType == "uniqueViolated")) {
      self.db.update({ _id: id }, { $set: { tiraid: tiraid } }, { upsert: true },
                     function(err, numReplaced, newDoc) {
        // TODO: tiraid mashup if multiple origins
        self.emit('displacement', tiraid);
        self.currentStatistics.displacements++;
      });
    }

    // A new record was created, this is an Appearance
    else if(newDoc) {
      self.emit('appearance', tiraid);
      self.currentStatistics.appearances++;
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
  if(event === "disappearance") {
    callback({}, 200);  // TODO: anything to do for disappearances?
  }
  else {
    self.handleTiraid(tiraid);  // TODO: handleTiraid callback?
    callback({}, 200);
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

    // Include the full tiraid if the id matches that of a transmitter
    if(isMatchingTransmitter) {
      state[identifierValue] = tiraid;
    }

    // Include only the tiraid identifier if the id matches that of a receiver
    else {
      state[identifierValue] = { "identifier": tiraid.identifier };
    }
  }
  callback(state);
}


/**
 * Detect disappearances from the database
 * @param {EventsManager} instance The given instance.
 */
function detectDisappearances(instance) {
  var currentTime = new Date();
  var cutoffTime = currentTime.setMilliseconds(currentTime.getMilliseconds() -
                                          instance.disappearanceMilliseconds);
  cutoffTime = new Date(cutoffTime).toISOString();
  instance.db.find({ "tiraid.timestamp": { $lt: cutoffTime } }, function(err, docs) {
    docs.forEach(function(value, index, array) {
      var id = value._id;
      instance.db.remove({ _id: value._id }, {}, function(err, numRemoved) {
        instance.emit('disappearance', value.tiraid);
        instance.currentStatistics.disappearances++;
      });
    });
  });
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
