/**
 * Copyright reelyActive 2014-2024
 * We believe in an open Internet of Things
 */


const advlib = require('advlib');


const DEFAULT_PROCESSORS = [];
const DEFAULT_INTERPRETERS = [];
const RELAY_PROPERTY = 'relay';


/**
 * PacketManager Class
 * Handles the decoding of packets and classification of their data.
 */
class PacketManager {

  /**
   * PacketManager constructor
   * @param {Barnacles} barnacles The barnacles instance.
   * @param {StoreManager} store The data store interface.
   * @param {DynambManager} dynambManager The dynamb manager instance.
   * @param {StatidManager} statidManager The statid manager instance.
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(barnacles, store, dynambManager, statidManager, options) {
    options = options || {};

    this.processors = options.packetProcessors || DEFAULT_PROCESSORS;
    this.interpreters = options.packetInterpreters || DEFAULT_INTERPRETERS;
    this.barnacles = barnacles;
    this.store = store;
    this.dynambManager = dynambManager;
    this.statidManager = statidManager;
  }

  /**
   * Handle the packets in the given raddec.
   * @param {Raddec} raddec The raddec with packets to be handled.
   */
  handleRaddec(raddec) {
    let self = this;
    let data = {};

    try {
      data = advlib.process(raddec.packets, self.processors, self.interpreters);
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


module.exports = PacketManager;
