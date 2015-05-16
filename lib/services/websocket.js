/**
 * Copyright reelyActive 2015
 * We believe in an open Internet of Things
 */


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

  self.eventsManager.on('appearance', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      self.io.emit('appearance', { tiraid: tiraid });
    }
  });
  self.eventsManager.on('displacement', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      self.io.emit('displacement', { tiraid: tiraid });
    }
  });
  self.eventsManager.on('disappearance', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      self.io.emit('disappearance', { tiraid: tiraid });
    }
  });
  self.eventsManager.on('keep-alive', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      self.io.emit('keep-alive', { tiraid: tiraid });
    }
  });
};


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
