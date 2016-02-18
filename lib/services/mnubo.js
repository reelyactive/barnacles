/**
 * Copyright reelyActive 2014-2016
 * We believe in an open Internet of Things
 */

var mnubo = require('mnubo-sdk');

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

  self.client = new mnubo.Client({
    id: self.clientId,
    secret: self.clientSecret,
    env: self.clientEnv
  });

  self.eventsManager.on('appearance', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'appearance', tiraid);
    }
  });
  self.eventsManager.on('displacement', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'displacement', tiraid);
    }
  });
  self.eventsManager.on('disappearance', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'disappearance', tiraid);
    }
  });
  self.eventsManager.on('keep-alive', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'keep-alive', tiraid);
    }
  });
}


/**
 * Post an update to the mnubo service
 * @param {Mnubo} instance The given instance.
 * @param {String} event The type of event.
 * @param {Object} tiraid The tiraid representing the event.
 */
function postUpdate(instance, event, tiraid) {
  instance.client.events
    .send([{
      "x_object": {
        "x_device_id": tiraid.identifier.value
      },
      "x_event_type": event,
      "x_timestamp": tiraid.timestamp
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
