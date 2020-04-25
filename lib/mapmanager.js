/**
 * Copyright reelyActive 2020
 * We believe in an open Internet of Things
 */


const Raddec = require('raddec');
const Device = require('./device');


const DEFAULT_DELAY_MILLISECONDS = 1000;
const DEFAULT_DECODING_COMPILATION_MILLISECONDS = 2000;
const DEFAULT_PACKET_COMPILATION_MILLISECONDS = 5000;
const DEFAULT_HISTORY_MILLISECONDS = 5000;
const DEFAULT_KEEP_ALIVE_MILLISECONDS = 5000;
const DEFAULT_OBSERVED_EVENTS = [
    Raddec.events.APPEARANCE,
    Raddec.events.DISPLACEMENT,
    Raddec.events.PACKETS,
    Raddec.events.KEEPALIVE
];


/**
 * MapManager Class
 * Manages a JavaScript Map instance.
 */
class MapManager {

  /**
   * MapManager constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    this.delayMilliseconds = options.delayMilliseconds ||
                             DEFAULT_DELAY_MILLISECONDS;
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

    this.store = new Map();
  }

  /**
   * Insert the given raddec.
   * @param {Raddec} raddec The given Raddec instance.
   * @param {function} handleEvent The function to call if event is triggered.
   */
  insertRaddec(raddec, handleEvent) {
    let self = this;
    let device;
    let isDevicePresent = self.store.has(raddec.signature);

    if(isDevicePresent) {
      device = self.store.get(raddec.signature);
    }
    else {
      device = new Device();
      self.store.set(raddec.signature, device);
    }

    device.handleRaddec(raddec);
  }

  /**
   * Determine if there are events to handle.
   * @param {function} handleEvent The function to call for each event.
   * @param {function} callback The function to call on completion.
   */
  determineEvents(handleEvent, callback) {
    return callback();  // TODO: implement this
  }

}


module.exports = MapManager;