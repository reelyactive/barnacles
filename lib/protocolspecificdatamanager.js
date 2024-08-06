/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */


const advlib = require('advlib');


const DEFAULT_PROCESSORS = [];
const RELAY_PROPERTY = 'relay';


/**
 * ProtocolSpecificDataManager Class
 * Handles the decoding of protocol-specific data.
 */
class ProtocolSpecificDataManager {

  /**
   * ProtocolSpecificDataManager constructor
   * @param {Barnacles} barnacles The barnacles instance.
   * @param {StoreManager} store The data store interface.
   * @param {DynambManager} dynambManager The dynamb manager instance.
   * @param {StatidManager} statidManager The statid manager instance.
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(barnacles, store, dynambManager, statidManager, options) {
    options = options || {};

    this.processors = options.protocolSpecificDataProcessors ||
                      DEFAULT_PROCESSORS;
    this.barnacles = barnacles;
    this.store = store;
    this.dynambManager = dynambManager;
    this.statidManager = statidManager;
  }

  /**
   * Handle the protocolSpecificData in the given raddec.
   * @param {Raddec} raddec The raddec with protocolSpecificData to be handled.
   */
  handleRaddec(raddec) {
    let self = this;
    let data = {};

    try {
      data = advlib.process(raddec.protocolSpecificData, self.processors);
    }
    catch(error) { console.log(error); }

    if(!data) { return; }

    if(data.hasOwnProperty(RELAY_PROPERTY)) {
      let relay = Object.assign({ timestamp: raddec.initialTime },
                                data[RELAY_PROPERTY]);
      self.barnacles.handleEvent('relay', relay);
    }

    // Create candidate dynamb and statid for respective managers to handle
    let id = { deviceId: raddec.transmitterId,
               deviceIdType: raddec.transmitterIdType };
    let dynamb = Object.assign({ timestamp: raddec.initialTime }, id, data);
    let statid = Object.assign({}, id, data);

    self.dynambManager.handleDynamb(dynamb);
    self.statidManager.handleStatid(statid);
  }
}


module.exports = ProtocolSpecificDataManager;
