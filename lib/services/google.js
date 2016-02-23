/**
 * Copyright reelyActive 2014-2016
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');

var DEFAULT_ACCOUNT_ID = "";
var DEFAULT_HOSTNAME = "";
var DEFAULT_IGNORE_INFRASTRUCTURE_TX = false;
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

  self.eventsManager = options.eventsManager;
  self.accountId = options.accountId || DEFAULT_ACCOUNT_ID;
  self.hostname = options.hostname || DEFAULT_HOSTNAME;
  self.whitelist = options.whitelist || WHITELIST_ALL;
  self.ignoreInfrastructureTx = options.ignoreInfrastructureTx ||
                                DEFAULT_IGNORE_INFRASTRUCTURE_TX;
  self.ua = require('universal-analytics');

  // Handle appearance, displacement, disappearance and keep-alive events
  self.eventsManager.on('appearance', function(tiraid) {
    handleEvent(self, { event: 'appearance', tiraid: tiraid });
  });
  self.eventsManager.on('displacement', function(tiraid) {
    handleEvent(self, { event: 'displacement', tiraid: tiraid });
  });
  self.eventsManager.on('disappearance', function(tiraid) {
    // Do nothing
  });
  self.eventsManager.on('keep-alive', function(tiraid) {
    handleEvent(self, { event: 'keep-alive', tiraid: tiraid });
  });
}


/**
 * Post the given event to Google Analytics, if applicable
 * @param {Google} instance The given instance.
 * @param {Object} event The event.
 */
function handleEvent(instance, event) {
  var isIgnored = instance.ignoreInfrastructureTx &&
                  reelib.tiraid.isReelyActiveTransmission(event.tiraid);

  // Abort if not whitelisted, if the event is invalid or ignored
  if(!isWhitelisted(instance, event.tiraid) ||
     !reelib.event.isValid(event) || isIgnored) {
    return;
  }

  postUpdate(instance, event.tiraid);
}


/**
 * Post an update to Google Universal Analytics
 * @param {Google} instance The given instance.
 * @param {Object} tiraid The tiraid representing the event.
 */
function postUpdate(instance, tiraid) {
  var params = {
    dp: "/id/" + tiraid.radioDecodings[0].identifier.value,
    dh: instance.hostname,
    uid: tiraid.identifier.value,
  };
  var visitor = instance.ua(instance.accountId, generateUuid(tiraid));
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
