/**
 * Copyright reelyActive 2014-2020
 * We believe in an open Internet of Things
 */


const Raddec = require('raddec');
const RaddecFilter = require('raddec-filter');


const DEFAULT_DELAY_MILLISECONDS = 1000;
const DEFAULT_MIN_DELAY_MILLISECONDS = 100;
const DEFAULT_DECODING_COMPILATION_MILLISECONDS = 2000;
const DEFAULT_PACKET_COMPILATION_MILLISECONDS = 5000;
const DEFAULT_HISTORY_MILLISECONDS = 5000;
const DEFAULT_KEEP_ALIVE_MILLISECONDS = 5000;
const DEFAULT_ACCEPT_STALE_RADDECS = false;
const DEFAULT_ACCEPT_FUTURE_RADDECS = true;
const DEFAULT_OBSERVED_EVENTS = [
    Raddec.events.APPEARANCE,
    Raddec.events.DISPLACEMENT,
    Raddec.events.PACKETS,
    Raddec.events.KEEPALIVE
];
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

    this.delayMilliseconds = options.delayMilliseconds ||
                             DEFAULT_DELAY_MILLISECONDS;
    this.minDelayMilliseconds = options.minDelayMilliseconds ||
                                DEFAULT_MIN_DELAY_MILLISECONDS;
    this.decodingCompilationMilliseconds =
                                    options.decodingCompilationMilliseconds ||
                                    DEFAULT_DECODING_COMPILATION_MILLISECONDS;
    this.packetCompilationMilliseconds =
                                      options.packetCompilationMilliseconds ||
                                      DEFAULT_PACKET_COMPILATION_MILLISECONDS;
    this.historyMilliseconds = options.historyMilliseconds ||
                               DEFAULT_HISTORY_MILLISECONDS;
    this.keepAliveMilliseconds = options.keepAliveMilliseconds ||
                                 DEFAULT_KEEP_ALIVE_MILLISECONDS;
    this.observedEvents = options.observedEvents ||
                          DEFAULT_OBSERVED_EVENTS;
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
      this.store.insertRaddec(raddec, function(raddec) {
        if(self.outputFilter.isPassing(raddec)) {
          self.barnacles.handleEvent('raddec', raddec);
        }
      });
    }
  }
}


/**
 * Manage all timeouts and stale data.
 * Auto-repeating function, calls itself after the preset delay.
 * @param {RaddecManager} instance The RaddecManager instance.
 */
function manageTimeouts(instance) {
  let currentTime = new Date().getTime();
  let interval = instance.keepAliveMilliseconds; // TODO: make dynamic

  setTimeout(manageTimeouts, interval, instance);
}


module.exports = RaddecManager;
