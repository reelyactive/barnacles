/**
 * Copyright reelyActive 2020
 * We believe in an open Internet of Things
 */


/**
 * Device Class
 * Represents a radio-identifiable device.
 */
class Device {

  /**
   * Device constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    this.raddecs = [];
    this.latestEvent = null;
  }

  /**
   * Handle an inbound raddec.
   * @param {Raddec} raddec The inbound raddec.
   */
  handleRaddec(raddec) {
    let self = this;

    self.raddecs.push(raddec);
  }

}


module.exports = Device;