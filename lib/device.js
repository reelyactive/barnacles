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

  /**
   * Determine if there are events to handle.
   * @param {function} handleEvent The function to call if there's an event.
   */
  determineEvents(handleEvent) {
    // TODO: determine events
  }

}


module.exports = Device;