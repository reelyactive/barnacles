/**
 * Copyright reelyActive 2015-2016
 * We believe in an open Internet of Things
 */

var http = require('http');
var reelib = require('reelib');

var DEFAULT_HOSTNAME = 'www.hyperlocalcontext.com';
var DEFAULT_PORT = 80;
var DEFAULT_IGNORE_INFRASTRUCTURE_TX = false;
var WHITELIST_ALL = "all";


/**
 * BarnaclesREST Class
 * Sends notifications to another barnacles instance.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function BarnaclesREST(options) {
  options = options || {};
  var self = this;

  self.eventsManager = options.eventsManager;
  self.hostname = options.hostname || DEFAULT_HOSTNAME;
  self.port = options.port || DEFAULT_PORT;
  self.whitelist = options.whitelist || WHITELIST_ALL;
  self.ignoreInfrastructureTx = options.ignoreInfrastructureTx ||
                                DEFAULT_IGNORE_INFRASTRUCTURE_TX;

  // Handle appearance, displacement, disappearance and keep-alive events
  self.eventsManager.on('appearance', function(tiraid) {
    handleEvent(self, { event: 'appearance', tiraid: tiraid });
  });
  self.eventsManager.on('displacement', function(tiraid) {
    handleEvent(self, { event: 'displacement', tiraid: tiraid });
  });
  self.eventsManager.on('disappearance', function(tiraid) {
    handleEvent(self, { event: 'disappearance', tiraid: tiraid });
  });
  self.eventsManager.on('keep-alive', function(tiraid) {
    handleEvent(self, { event: 'keep-alive', tiraid: tiraid });
  });
}


/**
 * Post the given event to the remote Barnacles instance, if applicable
 * @param {BarnaclesREST} instance The given instance.
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

  var options = { hostname: instance.hostname, port: instance.port };

  reelib.event.postUpdate(options, event, function(err, event, message) {
    if(err) {
      console.log('Error POSTing to remote barnacles at ' + instance.hostname +
                  ':' + instance.port + ': ' + err.message);
    }
  });
}


/**
 * Determine whether the given tiraid identifier(s) are whitelisted
 * @param {BarnaclesREST} instance The given instance.
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


module.exports = BarnaclesREST;
