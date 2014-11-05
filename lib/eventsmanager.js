/**
 * Copyright reelyActive 2014
 * We believe in an open Internet of Things
 */

var util = require('util');
var events = require('events');
var nedb = require('nedb');

var MAINTENANCE_INTERVAL_MILLISECONDS = 1000;
var MAX_STALE_SECONDS = 5;


/**
 * EventsManager Class
 * Collects and manages events in a database
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function EventsManager(options) {
  var self = this;
  this.db = new nedb();
  this.db.ensureIndex({ fieldName: "tiraid.timestamp" });
  this.db.ensureIndex({ fieldName: "tiraid.radioDecodings.0.identifier.value" });

  function periodicMaintenance() {
    detectDisappearances(self, MAX_STALE_SECONDS);
  }

  setInterval(periodicMaintenance, MAINTENANCE_INTERVAL_MILLISECONDS);

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
        var event = { type: "Displacement", tiraid: tiraid };
        self.emit('event', event);
      });
    }

    // A new record was created, this is an Appearance
    else if(newDoc) {
      var event = { type: "Appearance", tiraid: tiraid };
      self.emit('event', event);
    }
  });
};


/**
 * Detect disappearances from the database
 * @param {EventsManager} instance The given instance.
 * @param {Number} maxStaleSeconds The maximum number of stale seconds.
 */
function detectDisappearances(instance, maxStaleSeconds) {
  var currentTime = new Date();
  var cutoffTime = currentTime.setSeconds(currentTime.getSeconds()
                                          - maxStaleSeconds);
  cutoffTime = new Date(cutoffTime).toISOString();
  instance.db.find({ "tiraid.timestamp": { $lt: cutoffTime } }, function(err, docs) {
    docs.forEach(function(value, index, array) {
      var id = value._id;
      instance.db.remove({ _id: value._id }, {}, function(err, numRemoved) {
        var event = { type: "Disappearance", tiraid: value.tiraid };
        instance.emit('event', event);
      });
    });
  });
}


module.exports = EventsManager;
