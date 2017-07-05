/**
 * Copyright reelyActive 2015-2017
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');

var DEFAULT_IGNORE_INFRASTRUCTURE_TX = false;
var WHITELIST_ALL = "all";


/**
 * WebSocket Class
 * Sends notifications via a socket.io namespace.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function WebSocket(options) {
  options = options || {};
  var self = this;

  self.io = options.io;
  self.barnacles = options.barnacles;
  self.ignoreInfrastructureTx = options.ignoreInfrastructureTx ||
                                DEFAULT_IGNORE_INFRASTRUCTURE_TX;
  self.whitelist = options.whitelist || WHITELIST_ALL;

  // Handle appearance, displacement, disappearance and keep-alive events
  self.barnacles.on('appearance', function(event) {
    handleEvent(self, event);
  });
  self.barnacles.on('displacement', function(event) {
    handleEvent(self, event);
  });
  self.barnacles.on('disappearance', function(event) {
    handleEvent(self, event);
  });
  self.barnacles.on('keep-alive', function(event) {
    handleEvent(self, event);
  });
}


/**
 * Emit the given event via the websocket, if applicable
 * @param {WebSocket} instance The given instance.
 * @param {Object} event The event.
 */
function handleEvent(instance, event) {
  var isIgnored = instance.ignoreInfrastructureTx &&
                  reelib.tiraid.isReelyActiveTransmission(event.tiraid);

  // Abort if the event is ignored, invalid or does not pass criteria
  if(isIgnored || !reelib.event.isValid(event) ||
     !reelib.event.isPass(event, instance.accept, instance.reject) ||
     !isWhitelisted(instance, event.tiraid)) {
    return;
  }

  instance.io.emit(event.event, event);
}


/**
 * Determine whether the given tiraid identifier(s) are whitelisted
 * @param {SocketIO} instance The given instance.
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


module.exports = WebSocket;
