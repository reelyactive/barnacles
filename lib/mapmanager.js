/**
 * Copyright reelyActive 2020-2021
 * We believe in an open Internet of Things
 */


const Raddec = require('raddec');
const Device = require('./device');


const DEFAULT_DELAY_MILLISECONDS = 1000;
const DEFAULT_DECODING_COMPILATION_MILLISECONDS = 2000;
const DEFAULT_PACKET_COMPILATION_MILLISECONDS = 5000;
const DEFAULT_KEEP_ALIVE_MILLISECONDS = 5000;
const DEFAULT_HISTORY_MILLISECONDS = DEFAULT_KEEP_ALIVE_MILLISECONDS +
                                     DEFAULT_DELAY_MILLISECONDS +
                                     DEFAULT_DECODING_COMPILATION_MILLISECONDS;
const DEFAULT_DISAPPEARANCE_MILLISECONDS = 15000;
const DEFAULT_OBSERVED_EVENTS = [
    Raddec.events.APPEARANCE,
    Raddec.events.DISPLACEMENT,
    Raddec.events.PACKETS,
    Raddec.events.KEEPALIVE
];


/**
 * MapManager Class
 * Manages a JavaScript Map instance.
 */
class MapManager {

  /**
   * MapManager constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    this.parameters = createParameters(options);
    this.store = new Map();
  }

  /**
   * Retrieve the most recent data regarding all active/specified devices.
   * @param {String} deviceId The device identifier.
   * @param {Number} deviceIdType The device identifier type.
   * @param {Array} properties The optional properties to include.
   * @param {callback} callback Function to call on completion.
   */
  retrieveDevices(deviceId, deviceIdType, properties, callback) {
    let self = this;
    let devices = {};
    let isSpecificDevice = (deviceId && deviceIdType);
    let isSpecificProperties = Array.isArray(properties) &&
                               (properties.length > 0);

    if(isSpecificDevice) {
      let signature = deviceId + Raddec.identifiers.SIGNATURE_SEPARATOR +
                      deviceIdType;
      let isDevicePresent = self.store.has(signature);

      if(isDevicePresent) {
        let device = self.store.get(signature);

        devices[signature] = device.assemble(properties);

        return callback(devices);
      }
    }
    else {
      for(const signature of self.store.keys()) {
        if(isSpecificProperties) {
          let device = self.store.get(signature);
          devices[signature] = device.assemble(properties);
        }
        else {
          devices[signature] = {};
        }
      }

      return callback(devices);
    }

    return callback(null);
  }

  /**
   * Retrieve the most recent context regarding all active/specified devices.
   * @param {Array} deviceIds The devices to query.
   * @param {Number} depth The (optional) depth of context to retrieve.
   * @param {callback} callback Function to call on completion.
   */
  retrieveContext(deviceIds, depth, callback) {
    let self = this;
    let devices = {};
    let deviceNetwork = new Map();
    let currentDepth = 0;
    let isAllDevices = !deviceIds ||
                       (Array.isArray(deviceIds) && (deviceIds.length === 0));

    let signatures = [];
    for(const device of deviceIds) {
      if(typeof device === 'string') {
        signatures.push(device);
      }
      else {
        signatures.push(device.deviceId + '/' + device.deviceIdType);
      }
    }

    // Step 1: iterate ALL the devices, collecting active first-level devices
    for(const signature of self.store.keys()) {
      let device = self.store.get(signature);

      if(isAllDevices || device.hasIdOrNearest(signatures)) {
        devices[signature] = device.assembleContext();

        devices[signature].nearest.forEach(function(item) {
          deviceNetwork.set(item.device, currentDepth);
        });
      }
    }

    // Step 2: retrieve the devices nearest to the active first-level devices
    deviceNetwork.forEach(function(value, signature) {
      let isIncluded = devices.hasOwnProperty(signature);

      if(!isIncluded) {
        let isDevicePresent = self.store.has(signature);

        if(isDevicePresent) {
          let device = self.store.get(signature);
          devices[signature] = device.assembleContext();
        }
        else {
          devices[signature] = {};
        }
      }
    });

    // TODO: implement depth

    return callback(devices);
  }

  /**
   * Insert the given raddec.
   * @param {Raddec} raddec The given Raddec instance.
   * @param {function} handleEvent The function to call if event is triggered.
   */
  insertRaddec(raddec, handleEvent) {
    let self = this;
    let device;
    let isDevicePresent = self.store.has(raddec.signature);

    if(isDevicePresent) {
      device = self.store.get(raddec.signature);
    }
    else {
      device = new Device(raddec.transmitterId, raddec.transmitterIdType,
                          self.parameters);
      self.store.set(raddec.signature, device);
    }

    device.handleRaddec(raddec, self.parameters);
  }

  /**
   * Insert the given dynamb.
   * @param {Object} dynamb The given dynamb.
   */
  insertDynamb(dynamb) {
    let self = this;
    let signature = dynamb.deviceId + Raddec.identifiers.SIGNATURE_SEPARATOR +
                    dynamb.deviceIdType;
    let isDevicePresent = self.store.has(signature);

    if(isDevicePresent) {
      let device = self.store.get(signature);
      device.handleDynamb(dynamb);
    }
  }

  /**
   * Insert the given statid.
   * @param {Object} statid The given statid.
   */
  insertStatid(statid) {
    let self = this;
    let signature = statid.deviceId + Raddec.identifiers.SIGNATURE_SEPARATOR +
                    statid.deviceIdType;
    let isDevicePresent = self.store.has(signature);

    if(isDevicePresent) {
      let device = self.store.get(signature);
      device.handleStatid(statid);
    }
  }

  /**
   * Determine if there are events to handle.
   * @param {function} handleEvent The function to call for each event.
   * @param {function} callback The function to call on completion.
   */
  determineEvents(handleEvent, callback) {
    let self = this;
    let currentTime = new Date().getTime();
    let nextTimeout = currentTime + this.parameters.delayMilliseconds;

    this.store.forEach(function(device, transmitterSignature) {
      let timeout = device.determineEvents(self.parameters, handleEvent);
      let isDisappearance = (timeout < 0);

      if(isDisappearance) {
        self.store.delete(transmitterSignature);
      }
      else if(timeout < nextTimeout) {
        nextTimeout = timeout;
      }
    });

    return callback(nextTimeout);
  }

}


/**
 * Create from the given options the parameters for determining and preparing
 * events.
 * @param {Object} options The options as a JSON object.
 */
function createParameters(options) {
  let delayMilliseconds = options.delayMilliseconds ||
                          DEFAULT_DELAY_MILLISECONDS;
  let decodingCompilationMilliseconds =
                                    options.decodingCompilationMilliseconds ||
                                    DEFAULT_DECODING_COMPILATION_MILLISECONDS;
  let packetCompilationMilliseconds = options.packetCompilationMilliseconds ||
                                      DEFAULT_PACKET_COMPILATION_MILLISECONDS;
  let historyMilliseconds = options.historyMilliseconds ||
                            DEFAULT_HISTORY_MILLISECONDS;
  let keepAliveMilliseconds = options.keepAliveMilliseconds ||
                              DEFAULT_KEEP_ALIVE_MILLISECONDS;
  let disappearanceMilliseconds = options.disappearanceMilliseconds ||
                                  DEFAULT_DISAPPEARANCE_MILLISECONDS;
  let observedEvents = options.observedEvents || DEFAULT_OBSERVED_EVENTS;

  return {
      delayMilliseconds: delayMilliseconds,
      decodingCompilationMilliseconds: decodingCompilationMilliseconds,
      packetCompilationMilliseconds: packetCompilationMilliseconds,
      historyMilliseconds: historyMilliseconds,
      keepAliveMilliseconds: keepAliveMilliseconds,
      disappearanceMilliseconds: disappearanceMilliseconds,
      observedEvents: observedEvents
  };
}


module.exports = MapManager;