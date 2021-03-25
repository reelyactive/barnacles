/**
 * Copyright reelyActive 2020
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
   * Handle an inbound raddec.
   * @param {Raddec} raddec The inbound raddec.
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
   */
  handleDynamb(dynamb) {
    let self = this;
    let hasDynamb = self.hasOwnProperty('dynamb');

    if(!hasDynamb) {
      self.dynamb = {};
    }

    for(const property in dynamb) {
      if((property !== 'deviceId') && (property !== 'deviceIdType')) {
        self.dynamb[property] = dynamb[property];
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


module.exports = Device;