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
    this.timeout = new Date().getTime() + parameters.delayMilliseconds;
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
    insertRaddec(self, raddec);
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
      self.latestRaddecEvent = compileRaddecEvent(self, parameters);
      self.pendingEvents = [];
      self.timeout = currentTime + parameters.keepAliveMilliseconds;
      return handleEvent(self.latestRaddecEvent);
    }
    else {
      return self.timeout;
    }
  }

}


/**
 * Insert the given raddec, sorting if necessary to maintain ordering of the
 * raddecs array by decreasing timestamp.
 * @param {Device} device The given device instance.
 * @param {Raddec} raddec The inbound raddec.
 */
function insertRaddec(device, raddec) {
  let numberOfRaddecs = device.raddecs.unshift(raddec);

  let isCorrectOrder = (numberOfRaddecs === 1) ||
                       (device.raddecs[1].initialTime <= raddec.initialTime);

  if(!isCorrectOrder) {
    device.raddecs.sort((a, b) => b.initialTime - a.initialTime);
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
  let isPending = device.pendingEvents.includes(Raddec.events.DISPLACEMENT);

  if(hasPreviousRaddecEvent && !isPending) {
    let isDifferentReceiver = (raddec.receiverSignature !==
                               device.latestRaddecEvent.receiverSignature);

    if(isDifferentReceiver) {
      device.pendingEvents.push(Raddec.events.DISPLACEMENT);
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

    raddec.packets.forEach(function(packet) {
      let isNewPacket = !previousPackets.includes(packet);
      if(isNewPacket) {
        return device.pendingEvents.push(Raddec.events.PACKETS);
      }
    });
  }
}


/**
 * Update the timeout if there are pending events.
 * @param {Device} device The given device instance.
 * @param {Object} parameters The parameters as a JSON object.
 */
function updateTimeout(device, parameters) {
  let isPendingEvent = (device.pendingEvents.length > 0);

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
 * Compile the device data into a single raddec event.
 * @param {Device} device The given device instance.
 * @param {Object} parameters The parameters as a JSON object.
 */
function compileRaddecEvent(device, parameters) {
  let currentTime = new Date().getTime();
  let cutoffTime = currentTime - parameters.packetCompilationMilliseconds;
  let events = device.pendingEvents.slice().sort();
  let raddecEvent = new Raddec({ transmitterId: device.transmitterId,
                                 transmitterIdType: device.transmitterIdType,
                                 events: events });

  device.raddecs.forEach(function(raddec) {
    let isWithinCutoff = (raddec.initialTime >= cutoffTime);

    if(isWithinCutoff) {
      raddecEvent.merge(raddec);
    }
  });

  return raddecEvent;
}


module.exports = Device;