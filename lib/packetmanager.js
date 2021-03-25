/**
 * Copyright reelyActive 2014-2021
 * We believe in an open Internet of Things
 */


const advlib = require('advlib');


const DEFAULT_PROCESSORS = {};
const DEFAULT_DYNAMIC_PROPERTIES = [
    'acceleration',
    'batteryPercentage',
    'batteryVoltage',
    'relativeHumidity',
    'temperature'
];


/**
 * PacketManager Class
 * Handles the decoding of packets and classification of their data.
 */
class PacketManager {

  /**
   * PacketManager constructor
   * @param {Barnacles} barnacles The barnacles instance.
   * @param {StoreManager} store The data store interface.
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(barnacles, store, options) {
    options = options || {};

    this.processors = options.packetProcessors || DEFAULT_PROCESSORS;
    this.barnacles = barnacles;
    this.store = store;
    this.dynamicProperties = options.dynamicProperties ||
                             DEFAULT_DYNAMIC_PROPERTIES;
  }

  /**
   * Handle the packets in the given raddec.
   * @param {Raddec} raddec The raddec with packets to be handled.
   */
  handleRaddec(raddec) {
    let self = this;
    let isDynamic = false;
    let dynamb = { deviceId: raddec.transmitterId,
                   deviceIdType: raddec.transmitterIdType,
                   timestamp: raddec.initialTime };
    let data = {};

    try {
      data = advlib.process(raddec.packets, self.processors);
    }
    catch(error) {}

    for(const property in data) {
      if(self.dynamicProperties.includes(property)) {
        dynamb[property] = data[property];
        isDynamic = true;
      }
    }

    if(isDynamic) {
      self.barnacles.handleEvent('dynamb', dynamb);
      self.store.insertDynamb(dynamb);
    }

    // TODO: handle nearest
    // TODO: handle statid
  }
}


module.exports = PacketManager;
