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
   * @param {Object} parameters The parameters as a JSON object.
   * @constructor
   */
  constructor(parameters) {
    parameters = parameters || {};

    this.raddecs = [];
    this.latestEvent = null;
  }

  /**
   * Handle an inbound raddec.
   * @param {Raddec} raddec The inbound raddec.
   */
  handleRaddec(raddec, parameters) {
    let self = this;
    parameters = parameters || {};

    self.raddecs.push(raddec);
  }

  /**
   * Determine if there are events to handle.
   * @param {Object} parameters The parameters as a JSON object.
   * @param {function} handleEvent The function to call if there's an event.
   */
  determineEvents(parameters, handleEvent) {
    // TODO: determine events
  }

}


module.exports = Device;