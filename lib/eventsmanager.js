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

  // Try to update a record with the same ID and strongestDecoder,
  // if successful, no event occurred.
  this.db.update({ _id: id, "tiraid.radioDecodings.0.identifier.value": strongestDecoder },
                 { tiraid: tiraid }, { upsert: true },
                 function(err, numReplaced, newDoc) {

    // ID exists but strongestDecoder is different, this is a Displacement
    if(err && (err.errorType == "uniqueViolated")) {
      self.db.update({ _id: id }, { tiraid: tiraid }, { upsert: true },
                     function(err, numReplaced, newDoc) {
        // TODO: tiraid mashup if multiple origins
        self.emit('displacement', tiraid);
      });
    }

    // A new record was created, this is an Appearance
    else if(newDoc) {
      self.emit('appearance', tiraid);
    }
  });
};


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
      });
    });
  });
}


module.exports = EventsManager;
