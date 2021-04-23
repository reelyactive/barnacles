/**
 * Copyright reelyActive 2014-2021
 * We believe in an open Internet of Things
 */


const CONTEXTUAL_PROPERTIES = [ 'raddec', 'dynamb', 'statid' ];
const SIGNATURE_SEPARATOR = '/';


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
  retrieveContext(deviceIds, depth, callback) {
    let isSpecificDevices = Array.isArray(deviceIds) && (deviceIds.length > 0);

    if(isSpecificDevices) {
      // TODO: support multiple devices...
      this.store.retrieveDevices(deviceIds[0].deviceId,
                                 deviceIds[0].deviceIdType,
                                 CONTEXTUAL_PROPERTIES, function(devices) {
        if(devices) {
          return callback(convertToContext(devices));
        }

        return callback(null);
      });
    }
    else {
      this.store.retrieveDevices(null, null, CONTEXTUAL_PROPERTIES,
                                 function(devices) {
        return callback(convertToContext(devices));
      });
    }
  }
}


/**
 * Convert the given devices to a contextual representation.
 * @param {Object} devices The given devices.
 */
function convertToContext(devices) {
  let context = {};
  let nearestIds = [];

  for(const signature in devices) {
    let device = devices[signature];
    let nearest = determineNearest(device.raddec, device.dynamb);

    context[signature] = { nearest: nearest };

    if(device.hasOwnProperty('dynamb')) {
      context[signature]['dynamb'] = device.dynamb;
    }
    if(device.hasOwnProperty('statid')) {
      context[signature]['statid'] = device.statid;
    }

    nearest.forEach(function(entry) {
      if(!nearestIds.includes(entry.device)) {
        nearestIds.push(entry.device);
      }
    });
  }

  nearestIds.forEach(function(device) {
    let isPresent = context.hasOwnProperty(device);

    if(!isPresent) {
      context[device] = {};
    }
  });

  return context;
}


/**
 * Determine the nearest devices given the raddec and/or dynamb data.
 * @param {Object} raddec The given raddec.
 * @param {Object} dynamb The given dynamb.
 */
function determineNearest(raddec, dynamb) {
  let nearest = [];

  let hasRssiSignature = raddec && raddec.hasOwnProperty('rssiSignature') &&
                         Array.isArray(raddec.rssiSignature);
  let hasNearest = dynamb && dynamb.hasOwnProperty('nearest') &&
                   Array.isArray(dynamb.nearest);

  if(hasRssiSignature) {
    raddec.rssiSignature.forEach(function(entry) {
      let receiverSignature = entry.receiverId + SIGNATURE_SEPARATOR +
                              entry.receiverIdType;
      nearest.push({ device: receiverSignature, rssi: entry.rssi });
    });
  }

  if(hasNearest) {
    dynamb.nearest.forEach(function(entry) {
      nearest.push({ device: entry.deviceId, rssi: entry.rssi });
    });
  }

  nearest.sort(function(a, b) {
    return b.rssi - a.rssi;
  });

  return nearest;
}


module.exports = ContextManager;
