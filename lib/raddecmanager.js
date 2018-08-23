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
    let self = this;
    let id = raddec.transmitterId + '/' + raddec.transmitterIdType;
    let query = { _id: id };
    let update = { $push: { raddecs: raddec } };
    let options = { upsert: true, returnUpdatedDocs: true };

    // TODO: ensure time is part of raddec
    raddec.time = raddec.earliestDecodingTime || raddec.creationTime;

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
        setTimeout(manageTimeouts, instance.delayMilliseconds, instance);
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
  return callback();
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

  let previousRssiSignature = raddecs[raddecs.length - 2].rssiSignature;
  let latestRssiSignature = raddecs[raddecs.length - 1].rssiSignature;
  let isNoReceiver = (previousRssiSignature.length === 0) ||
                     (latestRssiSignature.length === 0);

  if(isNoReceiver) {
    return false;
  }

  // TODO: use raddec method to get receiver
  let latestStrongestReceiver = latestRssiSignature[0].receiverId + '/' +
                                latestRssiSignature[0].receiverIdType;
  let previousStrongestReceiver = previousRssiSignature[0].receiverId + '/' +
                                  previousRssiSignature[0].receiverIdType;
  let isDifferentStrongestReceiver = (latestStrongestReceiver !==
                                      previousStrongestReceiver);

  return isDifferentStrongestReceiver;
}


/**
 * Return if the given element is true.
 * @param {boolean} element The element to test.
 */
function isTrue(element) {
  return (element === true);
}


module.exports = RaddecManager;
