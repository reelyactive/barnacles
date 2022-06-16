/**
 * Copyright reelyActive 2020-2022
 * We believe in an open Internet of Things
 */


const Raddec = require('raddec');


/**
 * Device Class
 * Represents a radio-identifiable device.
 */
class Device {

  /**
   * Device constructor
   * @param {String} transmitterId The identifier of the transmitter.
   * @param {Number} transmitterIdType The identifier type of the transmitter.
   * @param {Object} parameters The parameters as a JSON object.
   * @constructor
   */
  constructor(transmitterId, transmitterIdType, parameters) {
    parameters = parameters || {};

    this.transmitterId = transmitterId;
    this.transmitterIdType = transmitterIdType;
    this.raddecs = [];
    this.latestRaddecEvent = null;
    this.pendingEvents = [ Raddec.events.APPEARANCE ];
    this.isPossibleDisplacement = false;
    this.timeout = new Date().getTime() + parameters.delayMilliseconds;
    this.disappearanceTimeout = new Date().getTime() +
                                parameters.disappearanceMilliseconds;
  }

  /**
   * Get the unique device signature based on the ID and type.
   */
  get signature() {
    return this.transmitterId + Raddec.identifiers.SIGNATURE_SEPARATOR +
           this.transmitterIdType;
  }

  /**
   * Determine whether or not the device has an identifier or nearest device
   * which matches one or more of the given signatures.
   */
  hasIdOrNearest(signatures) {
    let self = this;

    if(!signatures || !Array.isArray(signatures)) {
      return false;
    }

    if(signatures.includes(self.signature)) {
      return true;
    }

    if(self.statid && self.statid.hasOwnProperty('deviceIds')) {
      for(const signature of self.statid.deviceIds) {
        if(signatures.includes(signature)) {
          return true;
        }
      }
    }

    let nearest = compileNearest(self.latestRaddecEvent, self.dynamb);

    for(const item of nearest) {
      if(signatures.includes(item.device)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Assemble a standard device representation limited to the given properties,
   * if included.
   * @param {Array} properties The optional subset of properties.
   */
  assemble(properties) {
    let self = this;
    let isPropertySubset = properties && Array.isArray(properties);
    let device = {};

    if(isPropertySubset) {
      properties.forEach(function(property) {
        if((property === 'raddec') && self.latestRaddecEvent)  {
          device.raddec = Object.assign({}, self.latestRaddecEvent);
        }
        else if(self.hasOwnProperty(property)) {
          device[property] = Object.assign({}, self[property]);
        }
      });
    }
    else {
      if(self.latestRaddecEvent) {
        device.raddec = Object.assign({}, self.latestRaddecEvent);
      }
      if(self.dynamb) {
        removeStaleDynambProperties(device);
        if(Object.keys(self.dynamb).length) {
          device.dynamb = Object.assign({}, self.dynamb);
        }
      }
      if(self.statid) {
        device.statid = Object.assign({}, self.statid);
      }
    }

    return device;
  }

  /**
   * Assemble a contextual device representation.
   */
  assembleContext() {
    let self = this;
    let device = {};

    if(self.dynamb) {
      removeStaleDynambProperties(device);
      if(Object.keys(self.dynamb).length) {
        device.dynamb = Object.assign({}, self.dynamb);
      }
    }
    if(self.statid) {
      device.statid = Object.assign({}, self.statid);
    }
    if(self.latestRaddecEvent) {
      device.nearest = compileNearest(self.latestRaddecEvent, self.dynamb);
    }

    return device;
  }

  /**
   * Handle an inbound raddec.
   * @param {Raddec} raddec The inbound raddec.
   * @param {Object} parameters The parameters as a JSON object.
   */
  handleRaddec(raddec, parameters) {
    let self = this;
    parameters = parameters || {};

    determinePossibleDisplacement(self, raddec, parameters);
    determineNewPacket(self, raddec, parameters);
    updateTimeout(self, parameters);
    insertRaddec(self, raddec, parameters);
  }

  /**
   * Handle a dynamb.
   * @param {Object} dynamb The dynamb instance.
   * @param {Object} parameters The parameters as a JSON object.
   */
  handleDynamb(dynamb, parameters) {
    let self = this;
    let hasDynamb = self.hasOwnProperty('dynamb');

    if(!hasDynamb) {
      self.dynamb = {};         // TODO: combine these into a Map
      self.dynambTimeouts = {}; //       for efficient iteration
    }

    for(const property in dynamb) {
      if((property !== 'deviceId') && (property !== 'deviceIdType')) {
        self.dynamb[property] = dynamb[property];
        self.dynambTimeouts[property] = dynamb.timestamp +
                                       parameters.packetCompilationMilliseconds;
      }
    }
  }

  /**
   * Handle a statid.
   * @param {Object} statid The statid instance.
   */
  handleStatid(statid) {
    let self = this;
    let hasStatid = self.hasOwnProperty('statid');

    if(!hasStatid) {
      self.statid = {};
    }

    for(const property in statid) {
      if((property !== 'deviceId') && (property !== 'deviceIdType')) {
        let isNewProperty = !self.statid.hasOwnProperty(property);
        let isArray = Array.isArray(statid[property]);

        if(isNewProperty || !isArray) {
          self.statid[property] = statid[property];
        }
        else {
          statid[property].forEach(function(element) {
            let isNewElement = !self.statid[property].includes(element);

            if(isNewElement) {
              self.statid[property].push(element);
            }            
          });
        }
      }
    }
  }

  /**
   * Determine if there are events to handle.
   * @param {Object} parameters The parameters as a JSON object.
   * @param {function} handleEvent The function to call if there's an event.
   */
  determineEvents(parameters, handleEvent) {
    let self = this;
    let currentTime = new Date().getTime();
    let isTimeout = (currentTime > this.timeout);

    removeStaleData(self, parameters);

    if(isTimeout) {
      let raddecEvent = compileRaddecEvent(self, parameters);
      let isEvent = (raddecEvent !== null);

      if(isEvent) {
        let isObservedEvent = raddecEvent.events.some(event =>
                                     parameters.observedEvents.includes(event));
        let isDisappearance = raddecEvent.events.includes(
                                                   Raddec.events.DISAPPEARANCE);
        self.latestRaddecEvent = raddecEvent;
        self.pendingEvents = [];
        self.isPossibleDisplacement = false;
        self.timeout = currentTime + parameters.keepAliveMilliseconds;

        if(isObservedEvent) {
          handleEvent(self.latestRaddecEvent);
        }
        if(isDisappearance) {
          return -1;
        }
      }
    }

    return self.timeout;
  }

}


/**
 * Insert the given raddec, sorting if necessary to maintain ordering of the
 * raddecs array by decreasing timestamp.
 * @param {Device} device The given device instance.
 * @param {Raddec} raddec The inbound raddec.
 * @param {Object} parameters The parameters as a JSON object.
 */
function insertRaddec(device, raddec, parameters) {
  let numberOfRaddecs = device.raddecs.unshift(raddec);

  let isCorrectOrder = (numberOfRaddecs === 1) ||
                       (device.raddecs[1].initialTime <= raddec.initialTime);

  if(!isCorrectOrder) {
    device.raddecs.sort((a, b) => b.initialTime - a.initialTime);
  }
  else {
    device.disappearanceTimeout = raddec.initialTime +
                                  parameters.disappearanceMilliseconds;
  }
}


/**
 * Determine if the given raddec may represent a displacement and update the
 * given device's pendingEvents in consequence.
 * @param {Device} device The given device instance.
 * @param {Raddec} raddec The inbound raddec.
 * @param {Object} parameters The parameters as a JSON object.
 */
function determinePossibleDisplacement(device, raddec, parameters) {
  if(!parameters.observedEvents.includes(Raddec.events.DISPLACEMENT)) {
    return;
  }

  let hasPreviousRaddecEvent = (device.latestRaddecEvent !== null);

  if(hasPreviousRaddecEvent && !device.isPossibleDisplacement) {
    let isDifferentReceiver = (raddec.receiverSignature !==
                               device.latestRaddecEvent.receiverSignature);

    if(isDifferentReceiver) {
      device.isPossibleDisplacement = true;
    }
  }
}


/**
 * Determine if the given raddec includes a new packet and update the given
 * device's pendingEvents in consequence.
 * @param {Device} device The given device instance.
 * @param {Raddec} raddec The inbound raddec.
 * @param {Object} parameters The parameters as a JSON object.
 */
function determineNewPacket(device, raddec, parameters) {
  if(!parameters.observedEvents.includes(Raddec.events.PACKETS)) {
    return;
  }

  let hasPackets = (Array.isArray(raddec.packets) && raddec.packets.length);
  let hasPreviousRaddecEvent = (device.latestRaddecEvent !== null);
  let isPending = device.pendingEvents.includes(Raddec.events.PACKETS);

  if(hasPackets && !isPending && !hasPreviousRaddecEvent) {
    device.pendingEvents.push(Raddec.events.PACKETS);
  }

  else if(hasPackets && !isPending && hasPreviousRaddecEvent) {
    let previousPackets = device.latestRaddecEvent.packets || [];

    for(let cPacket = 0; cPacket < raddec.packets.length; cPacket++) {
      let packet = raddec.packets[cPacket];
      let isNewPacket = !previousPackets.includes(packet);
      if(isNewPacket) {
        return device.pendingEvents.push(Raddec.events.PACKETS);
      }
    }
  }
}


/**
 * Update the timeout if there are pending events.
 * @param {Device} device The given device instance.
 * @param {Object} parameters The parameters as a JSON object.
 */
function updateTimeout(device, parameters) {
  let isPendingEvent = (device.pendingEvents.length > 0) ||
                       device.isPossibleDisplacement;

  if(isPendingEvent) {
    let millisecondsToTimeout = device.timeout - new Date().getTime();
    let isWithinDelay = (millisecondsToTimeout <= parameters.delayMilliseconds);

    if(!isWithinDelay) {
      device.timeout = new Date().getTime() + parameters.delayMilliseconds;
    }
  }
}


/**
 * Remove stale data from the device.
 * @param {Device} device The given device instance.
 * @param {Object} parameters The parameters as a JSON object.
 */
function removeStaleData(device, parameters) {
  let currentTime = new Date().getTime();
  let staleTime = currentTime - parameters.historyMilliseconds;
  let isRemovalComplete = (device.raddecs.length === 0);

  while(!isRemovalComplete) {
    let oldestRaddec = device.raddecs[device.raddecs.length - 1];
    let isStale = (oldestRaddec.initialTime < staleTime);
    if(isStale) {
      device.raddecs.pop();
    }
    isRemovalComplete = (!isStale || (device.raddecs.length === 0));
  }
}


/**
 * Compile the device data into a single raddec based on the given parameters.
 * @param {Device} device The given device instance.
 * @param {Object} parameters The parameters as a JSON object.
 */
function compileRaddec(device, parameters) {
  if(device.raddecs.length === 0) {
    return new Raddec({ transmitterId: device.transmitterId,
                        transmitterIdType: device.transmitterIdType });
  }

  let mostRecentRaddec = device.raddecs[0];
  let decodingCutoffTime = mostRecentRaddec.initialTime -
                           parameters.decodingCompilationMilliseconds;
  let packetCutoffTime = mostRecentRaddec.initialTime -
                         parameters.packetCompilationMilliseconds;
  let compiledRaddec = new Raddec(mostRecentRaddec);

  for(let cRaddec = 1; cRaddec < device.raddecs.length; cRaddec++) {
    let raddec = device.raddecs[cRaddec];
    let isWithinDecodingCutoff = (raddec.initialTime >= decodingCutoffTime);
    let isWithinPacketCutoff = (raddec.initialTime >= packetCutoffTime);

    if(isWithinDecodingCutoff) {
      compiledRaddec.merge(raddec);
    }
    else if(isWithinPacketCutoff) {
      Raddec.mergePackets(raddec.packets, compiledRaddec.packets);
    }
  }

  compiledRaddec.trim();

  return compiledRaddec;
}


/**
 * Compile the device data into a single raddec event.
 * @param {Device} device The given device instance.
 * @param {Object} parameters The parameters as a JSON object.
 */
function compileRaddecEvent(device, parameters) {
  let raddecEvent = compileRaddec(device, parameters);
  let currentTime = new Date().getTime();
  let hasPreviousRaddecEvent = (device.latestRaddecEvent !== null);

  let isDisappearance = (currentTime >= device.disappearanceTimeout);
  let isDisplacement = hasPreviousRaddecEvent &&
                       (raddecEvent.rssiSignature.length > 0) &&
                       (raddecEvent.receiverSignature !==
                        device.latestRaddecEvent.receiverSignature);
  let isKeepAlive = hasPreviousRaddecEvent &&
                    (device.pendingEvents.length === 0) &&
                    (raddecEvent.rssiSignature.length > 0) &&
                    (currentTime >= (device.latestRaddecEvent.initialTime +
                                     parameters.keepAliveMilliseconds));

  if(isDisappearance) {
    device.pendingEvents.push(Raddec.events.DISAPPEARANCE);
  }
  else if(isDisplacement) {
    device.pendingEvents.push(Raddec.events.DISPLACEMENT);
  }
  else if(isKeepAlive)  {
    device.pendingEvents.push(Raddec.events.KEEPALIVE);
  }
  else if(device.pendingEvents.length === 0) {
    return null;
  }

  raddecEvent.events = device.pendingEvents.slice().sort();

  return raddecEvent;
}


/**
 * Compile the nearest devices given the raddec and/or dynamb data.
 * @param {Object} raddec The given raddec.
 * @param {Object} dynamb The given dynamb.
 */
function compileNearest(raddec, dynamb) {
  let nearest = [];

  let hasRssiSignature = raddec && raddec.hasOwnProperty('rssiSignature') &&
                         Array.isArray(raddec.rssiSignature);
  let hasNearest = dynamb && dynamb.hasOwnProperty('nearest') &&
                   Array.isArray(dynamb.nearest);

  if(hasRssiSignature) {
    raddec.rssiSignature.forEach(function(entry) {
      let receiverSignature = entry.receiverId +
                              Raddec.identifiers.SIGNATURE_SEPARATOR +
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


/**
 * Remove stale dynamb properties from the given device.
 * @param {Device} device The given device instance.
 */
function removeStaleDynambProperties(device) {
  let currentTime = new Date().getTime();

  for(let property in device.dynamb) {
    if(currentTime > device.dynambTimeouts[property]) {
      delete device.dynamb[property];
      delete device.dynambTimeouts[property];
    }
  }
}


module.exports = Device;
