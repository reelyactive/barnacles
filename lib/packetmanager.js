/**
 * Copyright reelyActive 2014-2021
 * We believe in an open Internet of Things
 */


const advlib = require('advlib');


const DEFAULT_PROCESSORS = {};
const DEFAULT_DYNAMB_PROPERTIES = [
    'acceleration',
    'batteryPercentage',
    'batteryVoltage',
    'relativeHumidity',
    'temperature'
];
const DEFAULT_STATID_PROPERTIES = [
    'appearance',
    'deviceIds',
    'name',
    'uri',
    'uuids',
    'version'
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
    this.dynambProperties = options.dynambProperties ||
                            DEFAULT_DYNAMB_PROPERTIES;
    this.statidProperties = options.statidProperties ||
                            DEFAULT_STATID_PROPERTIES;
  }

  /**
   * Handle the packets in the given raddec.
   * @param {Raddec} raddec The raddec with packets to be handled.
   */
  handleRaddec(raddec) {
    let self = this;
    let isDynamic = false;
    let isStatid = false;
    let dynamb = { deviceId: raddec.transmitterId,
                   deviceIdType: raddec.transmitterIdType,
                   timestamp: raddec.initialTime };
    let statid = { deviceId: raddec.transmitterId,
                   deviceIdType: raddec.transmitterIdType };
    let data = {};

    try {
      data = advlib.process(raddec.packets, self.processors);
    }
    catch(error) {}

    for(const property in data) {
      if(self.dynambProperties.includes(property)) {
        dynamb[property] = data[property];
        isDynamic = true;
      }
      else if(self.statidProperties.includes(property)) {
        statid[property] = data[property];
        isStatid = true;
      }
      // TODO: handle nearest
    }

    if(isDynamic) {
      self.barnacles.handleEvent('dynamb', dynamb);
      self.store.insertDynamb(dynamb);
    }

    if(isStatid) {
      self.store.insertStatid(statid);
    }
  }
}


module.exports = PacketManager;
