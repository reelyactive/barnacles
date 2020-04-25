/**
 * Copyright reelyActive 2015-2020
 * We believe in an open Internet of Things
 */


const EventEmitter = require('events').EventEmitter;
const RaddecFilter = require('raddec-filter');
const RaddecManager = require('./raddecmanager');
const StoreManager = require('./storemanager');


const DEFAULT_FILTER_PARAMETERS = {};


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

    let store = new StoreManager(options);

    this.interfaces = [];
    this.raddecManager = new RaddecManager(this, store, options);

    this.inputFilter = new RaddecFilter(options.inputFilterParameters ||
                                        DEFAULT_FILTER_PARAMETERS);
    this.outputFilter = new RaddecFilter(options.outputFilterParameters ||
                                         DEFAULT_FILTER_PARAMETERS);

    if(options.barnowl) {
      this.barnowl = options.barnowl;
      handleBarnowlEvents(this);
    }

    if(options.chickadee) {
      this.chickadee = options.chickadee;
    }
  }

  /**
   * Add the given interface, instantiating it if required.
   * @param {Class} interfaceClass The (uninstantiated) barnacles-x interface.
   * @param {Object} interfaceOptions The interface options as a JSON object.
   */
  addInterface(interfaceClass, interfaceOptions) {
    let interfaceInstance = new interfaceClass(interfaceOptions);
    this.interfaces.push(interfaceInstance);
  }

  /**
   * Handle an inbound raddec.
   * @param {Raddec} raddec The inbound raddec.
   */
  handleRaddec(raddec) {
    let self = this;

    if(self.inputFilter.isPassing(raddec)) {
      self.raddecManager.handleRaddec(raddec);
    }
  }

  /**
   * Handle an outbound event.
   * @param {String} name The name of the event.
   * @param {Object} event The outbound event.
   */
  handleEvent(name, event) {
    let self = this;

    switch(name) {
      case 'raddec':
        if(self.outputFilter.isPassing(event)) {
          outputRaddec(self, event);
        }
        break;
    }
  }
}


/**
 * Handle events from barnowl.
 * @param {Barnacles} instance The Barnacles instance.
 */
function handleBarnowlEvents(instance) {
  instance.barnowl.on('raddec', function(raddec) {
    if(instance.inputFilter.isPassing(raddec)) {
      instance.raddecManager.handleRaddec(raddec);
    }
  });
  instance.barnowl.on('infrastructureMessage', function(message) {
    // TODO: handle infrastructureMessage
  });
}


/**
 * Output the given raddec on all interfaces.
 * @param {Barnacles} instance The Barnacles instance.
 * @param {Raddec} raddec The given raddec.
 */
function outputRaddec(instance, raddec) {
  instance.emit('raddec', raddec);
  instance.interfaces.forEach(function(interfaceInstance) {
    interfaceInstance.handleRaddec(raddec);
  });
}


module.exports = Barnacles;
