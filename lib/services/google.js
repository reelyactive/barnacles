/**
 * Copyright reelyActive 2014
 * We believe in an open Internet of Things
 */

var ua = require('universal-analytics');

var DEFAULT_ACCOUNT_ID = "";
var DEFAULT_HOSTNAME = "";
var WHITELIST_ALL = "all";


/**
 * Google Class
 * Sends notifications to Google Universal analytics.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Google(options) {
  options = options || {};
  var self = this;

  this.eventsManager = options.eventsManager;
  this.accountId = options.accountId || DEFAULT_ACCOUNT_ID;
  this.hostname = options.hostname || DEFAULT_HOSTNAME;
  this.whitelist = options.whitelist || WHITELIST_ALL;

  this.eventsManager.on('appearance', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'appearance', tiraid);
    }
  });
  this.eventsManager.on('displacement', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'displacement', tiraid);
    }
  });
  this.eventsManager.on('disappearance', function(tiraid) {
    // Do nothing
  });
};


/**
 * Post an update to Google Universal Analytics
 * @param {Google} instance The given instance.
 * @param {String} event The type of event.
 * @param {Object} tiraid The tiraid representing the event.
 */
function postUpdate(instance, event, tiraid) {
  var params = {
    dp: "/id/" + tiraid.radioDecodings[0].identifier.value,
    dh: instance.hostname,
    uid: tiraid.identifier.value,
  }
  var visitor = ua(instance.accountId, generateUuid(tiraid));
  visitor.pageview(params).send();
}


/**
 * Generate a UUID based on a tiraid identifier
 * @param {Object} tiraid The tiraid representing the event.
 */
function generateUuid(tiraid) {
  var uuid = "7265656c-0000-4000-8";
  switch(tiraid.identifier.type) {
    case "ADVA-48":
      var isRandom = (tiraid.identifier.advHeader.txAdd === "random");
      if(isRandom) { uuid += "148-" + tiraid.identifier.value; }
      else         { uuid += "048-" + tiraid.identifier.value; }
      break;
    case "EUI-64":
      uuid += "064-00000" + tiraid.identifier.value.slice(-7);
      break;
    default:
      uuid += "000-000000000000";
  }
  return uuid;
}


/**
 * Determine whether the given tiraid identifier(s) are whitelisted
 * @param {Google} instance The given instance.
 * @param {Object} tiraid The tiraid representing the event.
 */
function isWhitelisted(instance, tiraid) {
  var whitelist = instance.whitelist;
  if(whitelist === WHITELIST_ALL) {
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


module.exports = Google;
