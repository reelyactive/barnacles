/**
 * Copyright reelyActive 2015-2024
 * We believe in an open Internet of Things
 */


const EventEmitter = require('events').EventEmitter;
const DynambManager = require('./dynambmanager');
const PacketManager = require('./packetmanager');
const ProtocolSpecificDataManager = require('./protocolspecificdatamanager');
const RaddecManager = require('./raddecmanager');
const StatidManager = require('./statidmanager');
const StoreManager = require('./storemanager');


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

    this.interfaces = [];
    this.store = new StoreManager(options);
    this.raddecManager = new RaddecManager(this, this.store, options);
    this.dynambManager = new DynambManager(this, this.store, options);
    this.statidManager = new StatidManager(this, this.store, options);
    this.packetManager = new PacketManager(this, this.store, this.dynambManager,
                                           this.statidManager, options);
    this.protocolSpecificDataManager = new ProtocolSpecificDataManager(this,
                                           this.store, this.dynambManager,
                                           this.statidManager, options);

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
   * Retrieve the most recent data regarding all active/specified devices.
   * @param {String} deviceId The device identifier.
   * @param {Number} deviceIdType The device identifier type.
   * @param {Array} properties The optional properties to include.
   * @param {callback} callback Function to call on completion.
   */
  retrieveDevices(deviceId, deviceIdType, properties, callback) {
    this.store.retrieveDevices(deviceId, deviceIdType, properties, callback);
  }

  /**
   * Retrieve the current context of all active/specified devices.
   * @param {Array} signatures The deviceId signatures to query.
   * @param {Number} depth The number of layers of context to retrieve.
   * @param {callback} callback Function to call on completion.
   */
  retrieveContext(signatures, depth, callback) {
    this.store.retrieveContext(signatures, depth, callback);
  }

  /**
   * Handle an inbound raddec.
   * @param {Raddec} raddec The inbound raddec.
   */
  handleRaddec(raddec) {
    this.raddecManager.handleRaddec(raddec);
  }

  /**
   * Handle an outbound event.
   * @param {String} name The name of the event.
   * @param {Object} data The outbound event data.
   */
  handleEvent(name, data) {
    let self = this;

    switch(name) {
      case 'raddec':
      case 'dynamb':
      case 'relay':
        outputEvent(self, name, data);
        break;
      case 'packets':
        self.packetManager.handleRaddec(data);
        break;
    }
  }

}


/**
 * Handle events from barnowl.
 * @param {Barnacles} instance The Barnacles instance.
 */
function handleBarnowlEvents(instance) {
  instance.barnowl.on('raddec', (raddec) => {
    instance.raddecManager.handleRaddec(raddec);
  });
  instance.barnowl.on('infrastructureMessage', (message) => {
    instance.dynambManager.handleDynamb(message);
    instance.statidManager.handleStatid(message);
  });
}


/**
 * Output the given event on all interfaces.
 * @param {Barnacles} instance The Barnacles instance.
 * @param {String} name The name of the event.
 * @param {Object} data The event data.
 */
function outputEvent(instance, name, data) {
  instance.emit(name, data);
  instance.interfaces.forEach((interfaceInstance) => {
    if(typeof interfaceInstance.handleEvent === 'function') {
      interfaceInstance.handleEvent(name, data);
    }
  });
}


module.exports = Barnacles;
