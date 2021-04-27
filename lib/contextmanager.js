/**
 * Copyright reelyActive 2014-2021
 * We believe in an open Internet of Things
 */


/**
 * ContextManager Class
 * Handles the retrieval of context.
 */
class ContextManager {

  /**
   * ContextManager constructor
   * @param {StoreManager} store The data store interface.
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(store, options) {
    options = options || {};

    this.store = store;
  }

  /**
   * Retrieve the current context of all active/specified devices.
   * @param {Array} deviceIds The device identifiers and types to retrieve.
   * @param {Number} depth The number of layers of context to retrieve.
   * @param {callback} callback Function to call on completion.
   */
  retrieve(deviceIds, depth, callback) {
    this.store.retrieveContext(deviceIds, depth, function(devices) {
      return callback(devices);
    });
  }

}


module.exports = ContextManager;
