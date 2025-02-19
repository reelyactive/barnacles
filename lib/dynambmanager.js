/**
 * Copyright reelyActive 2024-2025
 * We believe in an open Internet of Things
 */


const DEFAULT_KEEP_ALIVE_MILLISECONDS = 5000;
const DEFAULT_ACCEPT_STALE_DYNAMBS = false;
const DEFAULT_ACCEPT_FUTURE_DYNAMBS = true;
const DEFAULT_DYNAMB_PROPERTIES = [
    'acceleration',
    'accelerationSamplingRate',
    'accelerationTimeSeries',
    'ammoniaConcentration',
    'amperage',
    'amperages',
    'angleOfRotation',
    'batteryPercentage',
    'batteryVoltage',
    'carbonDioxideConcentration',
    'carbonMonoxideConcentration',
    'dissolvedOxygen',
    'distance',
    'elevation',
    'heading',
    'heartRate',
    'illuminance',
    'interactionDigest',
    'isButtonPressed',
    'isContactDetected',
    'isHealthy',
    'isMotionDetected',
    'isLiquidDetected',
    'levelPercentage',
    'magneticField',
    'methaneConcentration',
    'nearest',
    'nitrogenDioxideConcentration',
    'numberOfOccupants',
    'passageCounts',
    'pm1.0',
    'pm2.5',
    'pm10',
    'position',
    'pressure',
    'pressures',
    'relativeHumidity',
    'soundPressure',
    'speed',
    'temperature',
    'temperatures',
    'txCount',
    'unicodeCodePoints',
    'uptime',
    'velocityOverall',
    'volatileOrganicCompoundsConcentration',
    'voltage',
    'voltages'
];


/**
 * DynambManager Class
 * Collects and manages dynambs in an in-memory database.
 */
class DynambManager {

  /**
   * DynambManager constructor
   * @param {Barnacles} barnacles The barnacles instance.
   * @param {StoreManager} store The data store interface.
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(barnacles, store, options) {
    options = options || {};

    this.dynambProperties = options.dynambProperties ||
                            DEFAULT_DYNAMB_PROPERTIES;
    this.keepAliveMilliseconds = options.keepAliveMilliseconds ||
                                 DEFAULT_KEEP_ALIVE_MILLISECONDS;
    this.acceptStaleDynambs = DEFAULT_ACCEPT_STALE_DYNAMBS;
    this.acceptFutureDynambs = DEFAULT_ACCEPT_FUTURE_DYNAMBS;

    if(options.hasOwnProperty('acceptStaleDynambs')) {
      this.acceptStaleDynambs = options.acceptStaleDynambs;
    }
    if(options.hasOwnProperty('acceptFutureDynambs')) {
      this.acceptFutureDynambs = options.acceptFutureDynambs;
    }

    this.barnacles = barnacles;
    this.store = store;
  }

  /**
   * Handle the given dynamb, rejecting that which does not meet the criteria.
   * @param {Object} dynamb The given dynamb data.
   */
  handleDynamb(dynamb) {
    let self = this;

    if(isValidOrCorrectedDynamb(dynamb, self)) {
      if(isValidOrCorrectedTimestamp(dynamb, self)) {
        self.store.insertDynamb(dynamb);
        self.barnacles.handleEvent('dynamb', dynamb);
      }
    }
  }
}


/**
 * Determine if the dynamb is valid, correcting it if necessary and possible.
 * @param {Object} dynamb The dynamic ambient data.
 * @param {DynambManager} instance The DynambManager instance.
 */
function isValidOrCorrectedDynamb(dynamb, instance) {
  let hasDynambProperty = false;

  if(!dynamb ||
     !(typeof dynamb.deviceId === 'string') ||
     !Number.isInteger(dynamb.deviceIdType) ||
     !Number.isInteger(dynamb.timestamp)) {
    return false;
  }

  for(const property in dynamb) {
    if(instance.dynambProperties.includes(property)) {
      hasDynambProperty = true;
    }
    else if((property !== 'deviceId') && (property !== 'deviceIdType') &&
            (property !== 'timestamp')) {
      delete dynamb[property];
    }
  }

  return hasDynambProperty;
}


/**
 * Determine if the dynamb has a valid timestamp, correcting it if necessary
 * and possible.
 * @param {Object} dynamb The dynamic ambient data.
 * @param {DynambManager} instance The DynambManager instance.
 */
function isValidOrCorrectedTimestamp(dynamb, instance) {
  let currentTimestamp = Date.now();
  let staleTime = currentTimestamp - instance.keepAliveMilliseconds;
  let isStale = (dynamb.timestamp < staleTime);
  let isFuture = (dynamb.timestamp > currentTimestamp);

  if(!isStale && !isFuture) {
    return true;
  }

  if((isStale && instance.acceptStaleDynambs) ||
     (isFuture && instance.acceptFutureDynambs)) {
    dynamb.timestamp = currentTimestamp;
    return true;
  }

  return false;
}


module.exports = DynambManager;
