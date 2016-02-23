/**
 * Copyright reelyActive & Initial State 2015-2016
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');

var WHITELIST_ALL = 'all';
var DEFAULT_BUCKET_TYPE = 'location';
var DEFAULT_BUCKET_NAME = 'barnacles';
var DEFAULT_BUCKET_KEY = '';
var DEFAULT_ACCESS_KEY = '';
var DEFAULT_ID = '(unknown)';
var DISAPPEARED_VALUE = 'Not detected';
var DEFAULT_IGNORE_INFRASTRUCTURE_TX = false;


/**
 * InitialState Class
 * Sends notifications to the Initial State service.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function InitialState(options) {
  options = options || {};
  var self = this;

  self.eventsManager = options.eventsManager;
  self.bucketType = options.bucketType || DEFAULT_TYPE;
  self.whitelist = options.whitelist || WHITELIST_ALL;
  self.bucketName = options.bucketName || DEFAULT_BUCKET_NAME;
  self.bucketKey = options.bucketKey || DEFAULT_BUCKET_KEY;
  self.accessKey = options.accessKey || DEFAULT_ACCESS_KEY;
  self.ignoreInfrastructureTx = options.ignoreInfrastructureTx ||
                                DEFAULT_IGNORE_INFRASTRUCTURE_TX;
  self.initialstate = require('initial-state');

  self.bucket = self.initialstate.bucket(self.bucketName, self.accessKey);

  switch(self.bucketType) {
    case 'location':
      initialiseLocationHandlers(self);
      break;
    default:
      console.log(self.bucketType +
                  ' is not a recognised Initial State service type');
  }
}


/**
 * Initialise the location event handlers
 * @param {InitialState} instance The given instance.
 */
function initialiseLocationHandlers(instance) {

  instance.eventsManager.on('appearance', function(tiraid) {
    handleLocationEvent(instance, { event: 'appearance', tiraid: tiraid });
  });
  instance.eventsManager.on('displacement', function(tiraid) {
    handleLocationEvent(instance, { event: 'displacement', tiraid: tiraid });
  });
  instance.eventsManager.on('disappearance', function(tiraid) {
    handleLocationEvent(instance, { event: 'disappearance', tiraid: tiraid });
  });
  instance.eventsManager.on('keep-alive', function(tiraid) {
    // Do nothing
  });

}


/**
 * Push the given update to Initial State, if applicable
 * @param {InitialState} instance The given instance.
 * @param {Object} event The event.
 */
function handleLocationEvent(instance, event) {
  var isIgnored = instance.ignoreInfrastructureTx &&
                  reelib.tiraid.isReelyActiveTransmission(event.tiraid);

  // Abort if not whitelisted, if the event is invalid or ignored
  if(!isWhitelisted(instance, event.tiraid) ||
     !reelib.event.isValid(event) || isIgnored) {
    return;
  }

  pushLocationUpdate(instance, event);
}


/**
 * Push a location update to the Initial State service
 * @param {InitialState} instance The given instance.
 * @param {Object} event The given event event.
 */
function pushLocationUpdate(instance, event) {
  var key = event.tiraid.identifier.value;
  var value;
  var timestamp = new Date(event.tiraid.timestamp);

  switch(event.event) {
    case 'disappearance':
      value = DISAPPEARED_VALUE;
      break;
    default:
      value = event.tiraid.radioDecodings[0].identifier.value || DEFAULT_ID;
  }

  instance.bucket.push(key, value, timestamp);
}


/**
 * Determine whether the given tiraid identifier(s) are whitelisted
 * @param {InitialState} instance The given instance.
 * @param {Object} tiraid The tiraid representing the event.
 */
function isWhitelisted(instance, tiraid) {
  if(instance.whitelist === WHITELIST_ALL) {
    return true;
  }
  var radioDecodings = tiraid.radioDecodings;
  for(var cDecoding = 0; cDecoding < radioDecodings.length; cDecoding++) {
    var id = radioDecodings[cDecoding].identifier.value;
    if(instance.whitelist.indexOf(id) > -1) {
      return true;
    }
  }
  return false;
}


module.exports = InitialState;
