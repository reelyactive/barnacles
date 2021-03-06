/**
 * Copyright reelyActive 2020-2021
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
   * Retrieve the most recent context regarding all active/specified devices.
   * @param {Array} signatures The deviceId signatures to query.
   * @param {Number} depth The (optional) depth of context to retrieve.
   * @param {callback} callback Function to call on completion.
   */
  retrieveContext(signatures, depth, callback) {
    this.store.retrieveContext(signatures, depth, callback);
  }

  /**
   * Insert the given raddec.
   * @param {Raddec} raddec The given Raddec instance.
   * @param {function} handleEvent The function to call if event is triggered.
   */
  insertRaddec(raddec, handleEvent) {
    this.store.insertRaddec(raddec, handleEvent);
  }

  /**
   * Insert the given dynamb.
   * @param {Object} dynamb The given dynamb.
   */
  insertDynamb(dynamb) {
    this.store.insertDynamb(dynamb);
  }

  /**
   * Insert the given statid.
   * @param {Object} statid The given statid.
   */
  insertStatid(statid) {
    this.store.insertStatid(statid);
  }

  /**
   * Determine if there are events to handle.
   * @param {function} handleEvent The function to call for each event.
   * @param {function} callback The function to call on completion.
   */
  determineEvents(handleEvent, callback) {
    this.store.determineEvents(handleEvent, callback);
  }

}


module.exports = StoreManager;