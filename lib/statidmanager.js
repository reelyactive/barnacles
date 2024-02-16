/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */


const DEFAULT_STATID_PROPERTIES = [
    'appearance',
    'deviceIds',
    'languages',
    'name',
    'uri',
    'uuids',
    'version'
];


/**
 * StatidManager Class
 * Collects and manages statids in an in-memory database.
 */
class StatidManager {

  /**
   * StatidManager constructor
   * @param {Barnacles} barnacles The barnacles instance.
   * @param {StoreManager} store The data store interface.
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(barnacles, store, options) {
    options = options || {};

    this.statidProperties = options.statidProperties ||
                            DEFAULT_STATID_PROPERTIES;

    this.barnacles = barnacles;
    this.store = store;
  }

  /**
   * Handle the given statid, rejecting that which does not meet the criteria.
   * @param {Object} statid The given statid data.
   */
  handleStatid(statid) {
    let self = this;

    if(isValidOrCorrectedStatid(statid, self)) {
      self.store.insertStatid(statid);
    }
  }
}


/**
 * Determine if the statid is valid, correcting it if necessary and possible.
 * @param {Object} statid The static identifier data.
 * @param {StatidManager} instance The StatidManager instance.
 */
function isValidOrCorrectedStatid(statid, instance) {
  let hasStatidProperty = false;

  if(!statid ||
     !(typeof statid.deviceId === 'string') ||
     !Number.isInteger(statid.deviceIdType)) {
    return false;
  }

  for(const property in statid) {
    if(instance.statidProperties.includes(property)) {
      hasStatidProperty = true;
    }
    else if((property !== 'deviceId') && (property !== 'deviceIdType')) {
      delete statid[property];
    }
  }

  return hasStatidProperty;
}


module.exports = StatidManager;
