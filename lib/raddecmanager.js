/**
 * Copyright reelyActive 2014-2019
 * We believe in an open Internet of Things
 */


const EventEmitter = require('events').EventEmitter;
const Nedb = require('nedb');
const Raddec = require('raddec');


const DEFAULT_DELAY_MILLISECONDS = 1000;
const DEFAULT_MIN_DELAY_MILLISECONDS = 100;
const DEFAULT_HISTORY_MILLISECONDS = 5000;
const DEFAULT_KEEP_ALIVE_MILLISECONDS = 5000;
const DEFAULT_ACCEPT_STALE_RADDECS = false;
const DEFAULT_ACCEPT_FUTURE_RADDECS = true;


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
    this.minDelayMilliseconds = options.minDelayMilliseconds ||
                                DEFAULT_MIN_DELAY_MILLISECONDS;
    this.historyMilliseconds = options.historyMilliseconds ||
                               DEFAULT_HISTORY_MILLISECONDS;
    this.keepAliveMilliseconds = options.keepAliveMilliseconds ||
                                 DEFAULT_KEEP_ALIVE_MILLISECONDS;
    this.acceptStaleRaddecs = DEFAULT_ACCEPT_STALE_RADDECS;
    this.acceptFutureRaddecs = DEFAULT_ACCEPT_FUTURE_RADDECS;

    if(options.hasOwnProperty('acceptStaleRaddecs')) {
      this.acceptStaleRaddecs = options.acceptStaleRaddecs;
    }
    if(options.hasOwnProperty('acceptFutureRaddecs')) {
      this.acceptFutureRaddecs = options.acceptFutureRaddecs;
    }

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
    let timestamp = raddec.timestamp || raddec.initialTime;
    let currentTime = new Date().getTime();
    let isStale = (timestamp < (currentTime - this.historyMilliseconds));
    let isFuture = (timestamp > currentTime);

    if((isStale && !this.acceptStaleRaddecs) ||
       (isFuture && !this.acceptFutureRaddecs)) {
      return;
    }
    if(isStale || isFuture) {
      raddec.time = currentTime;
    }
    else {
      raddec.time = raddec.initialTime;
    }

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
      determineAndEmitEvents(instance, currentTime, function(events) {
        updateState(instance, events, currentTime, function() {
          determineTimeoutInterval(instance, currentTime, function(interval) {
            setTimeout(manageTimeouts, interval, instance);
          });
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
 * Determine and handle any event occurrences.
 * @param {RaddecManager} instance The RaddecManager instance.
 * @param {Number} currentTime The current time.
 * @param {function} callback The function to call on completion.
 */
function determineAndEmitEvents(instance, currentTime, callback) {
  let query = { "_status.timeout": { $lt: currentTime } };

  instance.db.find(query, function(err, transmitters) {
    let events = [];

    transmitters.forEach(function(transmitter) {
      let event = handleTimeoutEvent(instance, transmitter, currentTime);
      events.push(event);
    });

    return callback(events);
  });
}


/**
 * Updates the state of the database based on the given array of updates as a
 * self-recursive function that handles a single update per iteration.
 * @param {RaddecManager} instance The RaddecManager instance.
 * @param {Array} events The list of events from which to make updates.
 * @param {Number} currentTime The current time.
 * @param {function} callback The function to call on completion.
 */
function updateState(instance, events, currentTime, callback) {
  if(events.length > 0) {
    let event = events.pop();
    let query = { _id: event._id };
    let update = { $set: {
        "_status.timeout": event.nextTimeout,
        "_status.isAppearance": false,
        "_status.isNewPacket": false,
        "_status.isPossibleDisplacement": false,
        "_status.latestEventTimeout": event.timeout
    } };
    let options = {};

    if(event.hasOwnProperty('raddec')) {
      update.$set.latestEvent = { raddec: event.raddec };
    }

    instance.db.update(query, update, options, function() {
      updateState(instance, events, currentTime, callback); // Recursion
    });
  }
  else {
    return callback(); // All updates completed.  End self-recursion.
  }
}


/**
 * Determine the interval, in milliseconds, to the next timeout.
 * @param {RaddecManager} instance The RaddecManager instance.
 * @param {Number} currentTime The current time.
 * @param {function} callback The function to call on completion.
 */
function determineTimeoutInterval(instance, currentTime, callback) {
  let query = {};
  let sort = { "_status.timeout": 1 };

  instance.db.find(query).sort(sort).limit(1).exec(function (err, docs) {
    let interval = instance.delayMilliseconds;
    let isEmptyDatabase = (docs.length === 0);

    if(!isEmptyDatabase && docs[0].hasOwnProperty('_status')) {
      let closestInterval = docs[0]._status.timeout - new Date().getTime();

      interval = Math.max(instance.minDelayMilliseconds, closestInterval);
    }
    return callback(interval);
  });
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
  if(isNew || !previousStatus) { // TODO: why occasionally !previousStatus?
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

  let delayedTimeout = new Date().getTime() + delayMilliseconds;
  let timeout = Math.min(previousStatus.timeout, delayedTimeout);

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
 * @param {Number} currentTime The current time.
 * @return {Object} Event details (new lastEvent).
 */
function handleTimeoutEvent(instance, transmitter, currentTime) {
  let event = {
      _id: transmitter._id,
      nextTimeout: transmitter._status.timeout + instance.keepAliveMilliseconds
  };
  let events = [];

  if(transmitter._status.isAppearance) {
    events.push(Raddec.events.APPEARANCE);
  }
  else if((transmitter._status.isPossibleDisplacement) &&
          isDisplacement(instance, transmitter)) {
    events.push(Raddec.events.DISPLACEMENT);
  }
  else if(isKeepAlive(instance, transmitter, currentTime)) {
    events.push(Raddec.events.KEEPALIVE);
  }

  if(transmitter._status.isNewPacket) {
    events.push(Raddec.events.PACKETS);
  }

  let isAtLeastOneEvent = events.length > 0;

  if(isAtLeastOneEvent) {
    event.raddec = createEventRaddec(instance, transmitter, events);
    event.timeout = transmitter._status.timeout;
    instance.emit('raddec', event.raddec);
  }
  else {
    event.timeout = transmitter._status.latestEventTimeout;
  }

  return event;
}


/**
 * Create the event raddec from the transmitter's raddecs.
 * @param {RaddecManager} instance The given RaddecManager instance.
 * @param {Object} transmitter The transmitter entry.
 * @param {Array} events The index list of associated events.
 */
function createEventRaddec(instance, transmitter, events) {
  let latestTime = determineLatestRaddecTime(transmitter.raddecs);
  let earliestTime = latestTime - instance.delayMilliseconds;
  let transmitterId = transmitter.raddecs[0].transmitterId;
  let transmitterIdType = transmitter.raddecs[0].transmitterIdType;
  let packets = [];
  let rssiSignature = [];

  transmitter.raddecs.forEach(function(raddec) {
    Raddec.mergePackets(raddec.packets, packets);

    let isWithinTimeWindow = (raddec.time >= earliestTime);
    if(isWithinTimeWindow) {
      Raddec.mergeRssiSignatures(raddec.rssiSignature, rssiSignature);
    } 
  });

  let raddec = new Raddec({
      transmitterId: transmitterId,
      transmitterIdType: transmitterIdType,
      rssiSignature: rssiSignature,
      packets: packets,
      timestamp: latestTime,
      events: events
  });
  raddec.trim();

  return raddec;
}


/**
 * Return if the given transmitter has undergone a displacement.
 * @param {RaddecManager} instance The given RaddecManager instance.
 * @param {Object} transmitter The transmitter entry.
 */
function isDisplacement(instance, transmitter) {
  let latestTime = determineLatestRaddecTime(transmitter.raddecs);
  let earliestTime = latestTime - instance.delayMilliseconds;
  let rssiSignature = [];

  transmitter.raddecs.forEach(function(raddec) {
    let isWithinTimeWindow = (raddec.time >= earliestTime);
    if(isWithinTimeWindow) {
      Raddec.mergeRssiSignatures(raddec.rssiSignature, rssiSignature);
    } 
  });

  let previousRaddec = transmitter.latestEvent.raddec;
  let previousReceiverId = previousRaddec.rssiSignature[0].receiverId;
  let previousReceiverIdType = previousRaddec.rssiSignature[0].receiverIdType;
  let currentReceiverId = rssiSignature[0].receiverId;
  let currentReceiverIdType = rssiSignature[0].receiverIdType;
  let isDifferentReceiver = Raddec.identifiers.areMatch(previousReceiverId,
                                                        previousReceiverIdType,
                                                        currentReceiverId,
                                                        currentReceiverIdType);

  // TODO: compare the rssi difference against a hysteresis

  return isDifferentReceiver;
}


/**
 * Return if the given transmitter has reached a keep-alive.
 * @param {RaddecManager} instance The given RaddecManager instance.
 * @param {Object} transmitter The transmitter entry.
 * @param {Number} currentTime The current time.
 */
function isKeepAlive(instance, transmitter, currentTime) {
  let keepAliveTimeout = transmitter._status.latestEventTimeout +
                         instance.keepAliveMilliseconds;

  return (keepAliveTimeout <= currentTime);
}


/**
 * Return the latest time of the given array of raddecs.
 * @param {Array} raddecs The array of raddecs.
 */
function determineLatestRaddecTime(raddecs) {
  let latestTime = 0;

  raddecs.forEach(function(raddec) {
    if(raddec.time > latestTime) {
      latestTime = raddec.time;
    }
  });

  return latestTime;
}


/**
 * Return if the given element is true.
 * @param {boolean} element The element to test.
 */
function isTrue(element) {
  return (element === true);
}


module.exports = RaddecManager;
