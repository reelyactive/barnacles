/**
 * Copyright reelyActive 2015-2018
 * We believe in an open Internet of Things
 */


const EventEmitter = require('events').EventEmitter;
const RaddecManager = require('./raddecmanager');


/**
 * Barnacles Class
 * Detects events and sends notifications.
 */
class Barnacles extends EventEmitter {

  /**
   * Barnacles constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    super();
    options = options || {};

    this.raddecManager = new RaddecManager();
    handleRaddecManagerEvents(this);

    if(options.barnowl) {
      this.barnowl = options.barnowl;
      handleBarnowlEvents(this);
    }

    if(options.chickadee) {
      this.chickadee = options.chickadee;
    }
  }

  /**
   * Handle an inbound raddec.
   * @param {Raddec} raddec The inbound raddec.
   */
  handleRaddec(raddec) {
    this.raddecManager.handleRaddec(raddec);
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


/**
 * Handle events from the raddecManager.
 * @param {Barnacles} instance The Barnacles instance.
 */
function handleRaddecManagerEvents(instance) {
  instance.raddecManager.on('appearance', function(raddec) {
    raddec.event = 'appearance';
    instance.emit('raddec', raddec);
  });
  instance.raddecManager.on('displacement', function(raddec) {
    raddec.event = 'displacement';
    instance.emit('raddec', raddec);
  });
  instance.raddecManager.on('packets', function(raddec) {
    raddec.event = 'packets';
    instance.emit('raddec', raddec);
  });
  instance.raddecManager.on('keep-alive', function(raddec) {
    raddec.event = 'keep-alive';
    instance.emit('raddec', raddec);
  });
}


module.exports = Barnacles;
