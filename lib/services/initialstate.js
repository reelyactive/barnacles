/**
 * Copyright reelyActive & Initial State 2015-2016
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');

var WHITELIST_ALL = 'all';
var DEFAULT_BUCKET_TYPE = 'sendCount';
var DEFAULT_BUCKET_KEY = '';
var DEFAULT_ACCESS_KEY = '';


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
  self.bucketKey = options.bucketKey || DEFAULT_BUCKET_KEY;
  self.accessKey = options.accessKey || DEFAULT_ACCESS_KEY;
  self.initialstate = require('initial-state');

  self.bucket = self.initialstate.bucket(self.bucketKey, self.accessKey);

  self.eventsManager.on('reelceiverStatistics', function(stats) {
    handleEvent(self, stats);
  });
}


/**
 * Post the given event to the Initial State bucket
 * @param {InitialState} instance The given instance.
 * @param {Object} stats The reelceiverStatistics.
 */
function handleEvent(instance, stats) {
  var key = stats.receiverId;
  var value;
  var timestamp = stats.time;

  // Abort if not whitelisted
  if(!isWhitelisted(instance, stats.receiverId)) {
    return;
  }

  // Select value based on bucket type
  switch(instance.bucketType) {
    case 'uptimeSeconds':
      value = stats.uptimeSeconds;
      break;
    case 'sendCount':
      value = stats.sendCount;
      break;
    case 'crcPass':
      value = stats.crcPass;
      break;
    case 'crcFail':
      value = stats.crcFail;
      break;
    case 'maxRSSI':
      value = stats.maxRSSI;
      break;
    case 'avgRSSI':
      value = stats.avgRSSI;
      break;
    case 'minRSSI':
      value = stats.minRSSI;
      break;
    case 'temperatureCelcius':
      value = stats.temperatureCelcius;
      break;
    case 'radioVoltage':
      value = stats.radioVoltage;
      break;
    default:
      return;
  }

  instance.bucket.push(key, value, timestamp);
}


/**
 * Determine whether the given identifier is whitelisted
 * @param {InitialState} instance The given instance.
 * @param {String} id The receiverId.
 */
function isWhitelisted(instance, id) {
  if((instance.whitelist === WHITELIST_ALL) ||
     (instance.whitelist.indexOf(id) > -1)) {
    return true;
  }
  return false;
}


module.exports = InitialState;
