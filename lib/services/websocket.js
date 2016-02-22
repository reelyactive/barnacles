/**
 * Copyright reelyActive 2015-2016
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');

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
  self.eventsManager = options.eventsManager;
  self.whitelist = options.whitelist || WHITELIST_ALL;

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
 * Emit the given event via the websocket, if applicable
 * @param {WebSocket} instance The given instance.
 * @param {Object} event The event.
 */
function handleEvent(instance, event) {

  // Abort if not whitelisted or if the event is invalid
  if(!isWhitelisted(instance, event.tiraid) ||
     !reelib.event.isValid(event)) {
    return;
  }

  instance.io.emit(event.event, { tiraid: event.tiraid });
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
