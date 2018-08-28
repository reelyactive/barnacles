/**
 * Copyright reelyActive 2014-2018
 * We believe in an open Internet of Things
 */


const EventEmitter = require('events').EventEmitter;
const Nedb = require('nedb');
const Raddec = require('raddec');


const DEFAULT_DELAY_MILLISECONDS = 1000;
const DEFAULT_HISTORY_MILLISECONDS = 5000;


/**
 * RaddecManager Class
 * Collects and manages raddecs in an in-memory database.
 */
class RaddecManager extends EventEmitter {

  /**
   * RaddecManager constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    super();
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
    let self = this;
    let id = raddec.signature;
    let query = { _id: id };
    let update = { $push: { raddecs: raddec } };
    let options = { upsert: true, returnUpdatedDocs: true };

    raddec.time = raddec.initialTime;

    this.db.update(query, update, options, function(err, numAffected,
                                                    affectedDocs, upsert) {
      let newStatus = determineNewStatus(upsert, affectedDocs._status,
                                         affectedDocs.raddecs,
                                         self.delayMilliseconds);
      if(newStatus) {
        update = { $set: { _status: newStatus } };
        self.db.update(query, update, {}, function() {});
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
      determineAndEmitEvents(instance, currentTime, function(updates) {
        updateState(instance, updates, currentTime, function() {
          setTimeout(manageTimeouts, instance.delayMilliseconds, instance);
        });
      });
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


/**
 * Remove all entries with zero raddecs.
 * @param {RaddecManager} instance The RaddecManager instance.
 * @param {Number} currentTime The current time.
 * @param {function} callback The function to call on completion.
 */
function determineAndEmitEvents(instance, currentTime, callback) {
  let query = { "_status.timeout": { $lt: currentTime } };

  instance.db.find(query, function(err, transmitters) {
    let updates = [];

    transmitters.forEach(function(transmitter) {
      let event = handleTimeoutEvent(instance, transmitter, currentTime);
      updates.push(event);
    });

    return callback(updates);
  });
}


/**
 * Updates the state of the database based on the given array of updates as a
 * self-recursive function that handles a single update per iteration.
 * @param {RaddecManager} instance The RaddecManager instance.
 * @param {Array} transmitters The list of transmitter updates to make.
 * @param {Number} currentTime The current time.
 * @param {function} callback The function to call on completion.
 */
function updateState(instance, transmitters, currentTime, callback) {
  if(transmitters.length > 0) {
    let transmitter = transmitters.pop();
    let query = { _id: transmitter._id };
    let update = { $set: {
        "_status.timeout": transmitter.timeout,
        "_status.isAppearance": false,
        "_status.isNewPacket": false,
        "_status.isPossibleDisplacement": false
    } };
    let options = {};

    instance.db.update(query, update, options, function() {
      updateState(instance, transmitters, currentTime, callback); // Recursion
    });
  }
  else {
    return callback(); // All updates completed.  End self-recursion.
  }
}


/**
 * Determine the new status of the database entry.
 * @param {boolean} isNew Is this a new database entry?
 * @param {Object} previousStatus The previous status of the entry.
 * @param {Array} raddecs The array of raddecs, including current push.
 * @param {Number} delayMilliseconds The delay time for new timeouts.
 */
function determineNewStatus(isNew, previousStatus, raddecs,
                            delayMilliseconds) {
  if(isNew) {
    return {
        isAppearance: true,
        isNewPacket: false,
        isPossibleDisplacement: false,
        timeout: new Date().getTime() + delayMilliseconds
    }
  }

  let isNewPacket = determineNewPacket(raddecs);
  let isPossibleDisplacement = determinePossibleDisplacement(raddecs);
  let isStatusChange = (isNewPacket && !previousStatus.isNewPacket) ||
                       (isPossibleDisplacement && 
                        !previousStatus.isPossibleDisplacement);

  // Nothing new, return null
  if(!isStatusChange) {
    return null;
  }

  let timeout = previousStatus.timeout ||
                new Date().getTime() + delayMilliseconds;

  let isAppearance = (previousStatus.isAppearance === true);
  isNewPacket = isNewPacket || (previousStatus.isNewPacket === true);
  isPossibleDisplacement = isPossibleDisplacement ||
                           (previousStatus.isPossibleDisplacement === true); 

  return {
      isAppearance: isAppearance,
      isNewPacket: isNewPacket,
      isPossibleDisplacement: isPossibleDisplacement,
      timeout: timeout
  };
}


/**
 * Determine if the latest entry among the given raddecs has one or more new
 * packets compared to its predecessors.
 * @param {Array} raddecs The array of raddecs.
 */
function determineNewPacket(raddecs) {
  let isNoPredecessor = (raddecs.length <= 1);
  if(isNoPredecessor) {
    return false;
  }

  let numberOfPredecessors = raddecs.length - 1;
  let latestPackets = raddecs[numberOfPredecessors].packets;
  let isNoPackets = (latestPackets.length === 0);

  if(isNoPackets) {
    return false;
  }

  let isPacketFound = [];
  latestPackets.forEach(function(packet) {
    isPacketFound.push(false);
  });

  for(let cRaddec = 0; cRaddec < numberOfPredecessors; cRaddec++) {
    let predecessorPackets = raddecs[cRaddec].packets;
    for(let cPacket = 0; cPacket < latestPackets.length; cPacket++) {
      let packet = latestPackets[cPacket];
      if(predecessorPackets.includes(packet)) {
        isPacketFound[cPacket] = true;
        if(isPacketFound.every(isTrue)) {
          return false;
        }
      }
    }
  }

  return true;
}


/**
 * Determine if the latest entry among the given raddecs represents a possible
 * displacement compared to its predecessors.
 * @param {Array} raddecs The array of raddecs.
 */
function determinePossibleDisplacement(raddecs) {
  let isNoPredecessor = (raddecs.length <= 1);
  if(isNoPredecessor) {
    return false;
  }

  let previousRaddec = new Raddec(raddecs[raddecs.length - 2]);
  let latestRaddec = new Raddec(raddecs[raddecs.length - 1]);
  let isDifferentStrongestReceiver = (latestRaddec.receiverSignature !==
                                      previousRaddec.receiverSignature);

  return isDifferentStrongestReceiver;
}


/**
 * Handle a single timeout event
 * @param {RaddecManager} instance The given RaddecManager instance.
 * @param {Object} transmitter The transmitter with the timeout.
 * @param {Number} currentTimestamp The current timestamp.
 * @return {Object} Event details (new lastEvent).
 */
function handleTimeoutEvent(instance, transmitter, currentTimestamp) {
  var event = {};

  if(transmitter._status.isAppearance) {
    event.type = 'appearance';
    event.raddec = transmitter.raddecs[0]; // TODO: create merged raddec
  }
  else if(transmitter._status.isNewPacket) {
    event.type = 'packets';
    event.raddec = transmitter.raddecs[0]; // TODO: create merged raddec
  }
  else if(transmitter._status.isPossibleDisplacement) {
    event.type = 'displacement';  // TODO: check first if really displacement
    event.raddec = transmitter.raddecs[0]; // TODO: create merged raddec
  }
  // TODO: keep-alive
  else {
    event.type = null;
  }

  event._id = transmitter._id;
  event.timeout = transmitter._status.timeout + 5000; // TODO: constant
                                                      // based on last event?

  if(event.type) {
    instance.emit(event.type, event.raddec);
  }

  return event;
}


/**
 * Return if the given element is true.
 * @param {boolean} element The element to test.
 */
function isTrue(element) {
  return (element === true);
}


module.exports = RaddecManager;
