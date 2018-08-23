/**
 * Copyright reelyActive 2015-2018
 * We believe in an open Internet of Things
 */


const RaddecManager = require('./raddecmanager');


/**
 * Barnacles Class
 * Detects events and sends notifications.
 */
class Barnacles {

  /**
   * Barnacles constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    this.raddecManager = new RaddecManager();

    if(options.barnowl) {
      this.barnowl = options.barnowl;
      handleBarnowlEvents(this);
    }

    if(options.chickadee) {
      this.chickadee = options.chickadee;
    }
  }
}


/**
 * Handle events from barnowl.
 * @param {Barnacles} instance The Barnacles instance.
 */
function handleBarnowlEvents(instance) {
  instance.barnowl.on('raddec', function(raddec) {
    instance.raddecManager.handleRaddec(raddec);
  });
  instance.barnowl.on('infrastructureMessage', function(message) {
    // TODO: handle infrastructureMessage
  });
}


module.exports = Barnacles;
