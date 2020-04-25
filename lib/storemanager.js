/**
 * Copyright reelyActive 2020
 * We believe in an open Internet of Things
 */


const MapManager = require('./mapmanager');


/**
 * StoreManager Class
 * Manages the store(s) in which the real-time device data is maintained,
 * abstracting away the implementation details.
 */
class StoreManager {

  /**
   * StoreManager constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    // TODO: in future support other stores
    this.store = new MapManager(options);
  }

  /**
   * Insert the given raddec.
   * @param {Raddec} raddec The given Raddec instance.
   */
  insertRaddec(raddec) {
    this.store.insertRaddec(raddec);
  }

}


module.exports = StoreManager;