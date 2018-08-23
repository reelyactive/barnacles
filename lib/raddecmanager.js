/**
 * Copyright reelyActive 2014-2018
 * We believe in an open Internet of Things
 */


const Nedb = require('nedb');


const DEFAULT_DELAY_MILLISECONDS = 1000;
const DEFAULT_HISTORY_MILLISECONDS = 5000;


/**
 * RaddecManager Class
 * Collects and manages raddecs in an in-memory database.
 */
class RaddecManager {

  /**
   * RaddecManager constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    this.delayMilliseconds = options.delayMilliseconds ||
                             DEFAULT_DELAY_MILLISECONDS;
    this.historyMilliseconds = options.historyMilliseconds ||
                               DEFAULT_HISTORY_MILLISECONDS;

    this.db = new Nedb();

    manageTimeouts(this);
  }

  /**
   * Handle the given raddec.
   * @param {Raddec} raddec The given Raddec instance.
   */
  handleRaddec(raddec) {
    let id = raddec.transmitterId + '/' + raddec.transmitterIdType;
    let query = { _id: id };
    let update = { $push: { raddecs: raddec } };
    let options = { upsert: true };

    // TODO: ensure time is part of raddec
    raddec.time = raddec.earliestDecodingTime || raddec.creationTime;

    this.db.update(query, update, options, function(err, numReplaced, newDoc) {
      if(newDoc) {
        // TODO: set isPreliminaryAppearance to true
      }
    });
  }

}


/**
 * Manage all timeouts and stale data.
 * Auto-repeating function, calls itself after the preset delay.
 * @param {RaddecManager} instance The RaddecManager instance.
 */
function manageTimeouts(instance) {
  let currentTime = new Date().getTime();

  removeStaleRaddecs(instance, currentTime, function() {
    removeDisappearances(instance, function() {
      setTimeout(manageTimeouts, instance.delayMilliseconds, instance);
    });
  });
}


/**
 * Remove all raddecs stale beyond the history threshold.
 * @param {RaddecManager} instance The RaddecManager instance.
 * @param {Number} currentTime The current time.
 * @param {function} callback The function to call on completion.
 */
function removeStaleRaddecs(instance, currentTime, callback) {
  let timeout = currentTime - instance.historyMilliseconds;
  let query = {};
  let update = { $pull: { raddecs: { time: { $lt: timeout } } } };
  let options = { multi: true };

  instance.db.update(query, update, options, callback);
}


/**
 * Remove all entries with zero raddecs.
 * @param {RaddecManager} instance The RaddecManager instance.
 * @param {function} callback The function to call on completion.
 */
function removeDisappearances(instance, callback) {
  let query = { raddecs: { $size: 0 } };
  let options = { multi: true };

  instance.db.remove(query, options, callback);
}


module.exports = RaddecManager;
