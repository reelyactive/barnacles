/**
 * Copyright reelyActive 2020
 * We believe in an open Internet of Things
 */


const Raddec = require('raddec');
const Device = require('./device');


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

    this.store = new Map();
  }

  /**
   * Insert the given raddec.
   * @param {Raddec} raddec The given Raddec instance.
   */
  insertRaddec(raddec) {
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

}


module.exports = MapManager;