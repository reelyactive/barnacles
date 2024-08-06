/**
 * Copyright reelyActive 2014-2024
 * We believe in an open Internet of Things
 */


const advlibEpc = require('advlib-epc');
const Raddec = require('raddec');
const RaddecFilter = require('raddec-filter');


const DEFAULT_MIN_DELAY_MILLISECONDS = 100;
const DEFAULT_KEEP_ALIVE_MILLISECONDS = 5000;
const DEFAULT_ACCEPT_STALE_RADDECS = false;
const DEFAULT_ACCEPT_FUTURE_RADDECS = true;
const DEFAULT_FILTER_PARAMETERS = {};


/**
 * RaddecManager Class
 * Collects and manages raddecs in an in-memory database.
 */
class RaddecManager {

  /**
   * RaddecManager constructor
   * @param {Barnacles} barnacles The barnacles instance.
   * @param {StoreManager} store The data store interface.
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(barnacles, store, options) {
    options = options || {};

    this.minDelayMilliseconds = options.minDelayMilliseconds ||
                                DEFAULT_MIN_DELAY_MILLISECONDS;
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

    this.inputFilter = new RaddecFilter(options.inputFilterParameters ||
                                        DEFAULT_FILTER_PARAMETERS);
    this.outputFilter = new RaddecFilter(options.outputFilterParameters ||
                                         DEFAULT_FILTER_PARAMETERS);

    this.barnacles = barnacles;
    this.store = store;

    manageTimeouts(this);
  }

  /**
   * Handle the given raddec.
   * @param {Raddec} raddec The given Raddec instance.
   */
  handleRaddec(raddec) {
    let self = this;

    if(self.inputFilter.isPassing(raddec)) {
      if(isValidOrCorrectedTimestamp(raddec, self)) {
        if(raddec.protocolSpecificData) { // Assumes no duplicates!
          self.barnacles.protocolSpecificDataManager.handleRaddec(raddec);
        }
        this.store.insertRaddec(raddec, (raddec) => {
          if(self.outputFilter.isPassing(raddec)) {
            let isPacketsEvent = raddec.events.includes(Raddec.events.PACKETS);

            self.barnacles.handleEvent('raddec', raddec);

            if(isPacketsEvent) {
              self.barnacles.handleEvent('packets', raddec);
            }
          }
        });

        if(raddec.transmitterIdType === Raddec.identifiers.TYPE_EPC96) {
          decodeEPC(raddec.transmitterId, raddec.transmitterIdType, self);
        }
      }
    }
  }
}


/**
 * Manage all timeouts and stale data.
 * Auto-repeating function, calls itself after the preset delay.
 * @param {RaddecManager} instance The RaddecManager instance.
 */
function manageTimeouts(instance) {
  let startTime = new Date().getTime();

  instance.store.determineEvents(handleEvent, function(nextTimeout) {
    let endTime = new Date().getTime();
    let processDuration = endTime - startTime;
    nextTimeout = nextTimeout || (endTime + instance.keepAliveMilliseconds);

    let interval = Math.max(instance.minDelayMilliseconds,
                            nextTimeout - endTime);

    // Set timeout to execute function again
    instance.timeoutId = setTimeout(manageTimeouts, interval, instance);
  });

  function handleEvent(raddec) {
    if(instance.outputFilter.isPassing(raddec)) {
      let isPacketsEvent = raddec.events.includes(Raddec.events.PACKETS);

      instance.barnacles.handleEvent('raddec', raddec);

      if(isPacketsEvent) {
        instance.barnacles.handleEvent('packets', raddec);
      }
    }
  }
}


/**
 * Determine if the raddec has a valid timestamp, correcting it if necessary
 * and possible.
 * @param {Raddec} raddec The radio decoding.
 * @param {RaddecManager} instance The RaddecManager instance.
 */
function isValidOrCorrectedTimestamp(raddec, instance) {
  let currentTimestamp = Date.now();
  let staleTime = currentTimestamp - instance.keepAliveMilliseconds;
  let isStale = (raddec.timestamp < staleTime);
  let isFuture = (raddec.timestamp > currentTimestamp);

  if(!isStale && !isFuture) {
    return true;
  }

  if(isStale && instance.acceptStaleRaddecs) {
    raddec.timestamp = currentTimestamp;
    return true;
  }

  if(isFuture && instance.acceptFutureRaddecs) {
    raddec.timestamp = currentTimestamp;
    return true;
  }

  return false;
}


/**
 * Decode the given Electronic Product Code (EPC).
 * @param {String} epc The EPC as a hexadecimal string.
 * @param {Number} deviceIdType The device identifier type.
 * @param {RaddecManager} instance The RaddecManager instance.
 */
function decodeEPC(epc, deviceIdType, instance) {
  let data;

  try {
    data = advlibEpc.processEPC(epc);
  }
  catch(error) { console.log(error); }

  if(data) {
    let statid = { deviceId: epc, deviceIdType: deviceIdType };

    for(const property in data) {
      statid[property] = data[property]; // TODO: filter on statid properties?
    }

    instance.store.insertStatid(statid);
  }
}


module.exports = RaddecManager;
