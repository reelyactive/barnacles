/**
 * Copyright reelyActive 2014-2016
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');

var DEFAULT_CLIENT_ENV = 'sandbox';
var WHITELIST_ALL = 'all';


/**
 * Mnubo Class
 * Sends notifications to the mnubo service.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Mnubo(options) {
  options = options || {};
  var self = this;

  self.eventsManager = options.eventsManager;
  self.clientId = options.clientId;
  self.clientSecret = options.clientSecret;
  self.clientEnv = options.clientEnv || DEFAULT_CLIENT_ENV;
  self.whitelist = options.whitelist || WHITELIST_ALL;
  self.mnubo = require('mnubo-sdk');

  self.client = new self.mnubo.Client({
    id: self.clientId,
    secret: self.clientSecret,
    env: self.clientEnv
  });

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
 * Post the given event to mnubo, if applicable
 * @param {Mnubo} instance The given instance.
 * @param {Object} event The event.
 */
function handleEvent(instance, event) {

  // Abort if not whitelisted or if the event is invalid
  if(!isWhitelisted(instance, event.tiraid) ||
     !reelib.event.isValid(event)) {
    return;
  }

  postUpdate(instance, event);
}


/**
 * Post an update to the mnubo service
 * @param {Mnubo} instance The given instance.
 * @param {Object} event The given event.
 */
function postUpdate(instance, event) {
  instance.client.events
    .send([{
      "x_object": {
        "x_device_id": event.tiraid.identifier.value
      },
      "x_event_type": event.event,
      "x_timestamp": event.tiraid.timestamp
    }])
    .then(function(data) {
      // Do nothing
    })
    .catch(function(error) {
      console.log('mnubo service error: ' + error);
    });
}


/**
 * Determine whether the given tiraid identifier(s) are whitelisted
 * @param {Mnubo} instance The given instance.
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


module.exports = Mnubo;
