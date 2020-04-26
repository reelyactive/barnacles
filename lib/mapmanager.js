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

    this.parameters = createParameters(options);
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
      device = new Device(raddec.transmitterId, raddec.transmitterIdType,
                          self.parameters);
      self.store.set(raddec.signature, device);
    }

    device.handleRaddec(raddec, self.parameters);
  }

  /**
   * Determine if there are events to handle.
   * @param {function} handleEvent The function to call for each event.
   * @param {function} callback The function to call on completion.
   */
  determineEvents(handleEvent, callback) {
    let self = this;

    this.store.forEach(function(device, transmitterSignature) {
      device.determineEvents(self.parameters, handleEvent);
    });

    return callback();  // TODO: implement this
  }

}


/**
 * Create from the given options the parameters for determining and preparing
 * events.
 * @param {Object} options The options as a JSON object.
 */
function createParameters(options) {
  let delayMilliseconds = options.delayMilliseconds ||
                          DEFAULT_DELAY_MILLISECONDS;
  let decodingCompilationMilliseconds =
                                    options.decodingCompilationMilliseconds ||
                                    DEFAULT_DECODING_COMPILATION_MILLISECONDS;
  let packetCompilationMilliseconds = options.packetCompilationMilliseconds ||
                                      DEFAULT_PACKET_COMPILATION_MILLISECONDS;
  let historyMilliseconds = options.historyMilliseconds ||
                            DEFAULT_HISTORY_MILLISECONDS;
  let keepAliveMilliseconds = options.keepAliveMilliseconds ||
                              DEFAULT_KEEP_ALIVE_MILLISECONDS;
  let observedEvents = options.observedEvents || DEFAULT_OBSERVED_EVENTS;

  return {
      delayMilliseconds: delayMilliseconds,
      decodingCompilationMilliseconds: decodingCompilationMilliseconds,
      packetCompilationMilliseconds: packetCompilationMilliseconds,
      historyMilliseconds: historyMilliseconds,
      keepAliveMilliseconds: keepAliveMilliseconds,
      observedEvents: observedEvents
  };
}


module.exports = MapManager;