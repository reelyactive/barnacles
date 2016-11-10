/**
 * Copyright reelyActive 2016
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');

var DEFAULT_HOSTNAME = 'www.hyperlocalcontext.com';
var DEFAULT_CLIENT_OPTIONS = { keepalive: 3600 };
var DEFAULT_TOPIC = 'events';
var DEFAULT_IGNORE_INFRASTRUCTURE_TX = false;
var WHITELIST_ALL = "all";


/**
 * BarnaclesMQTT Class
 * Sends notifications to another barnacles instance via MQTT.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function BarnaclesMQTT(options) {
  options = options || {};
  var self = this;

  self.barnacles = options.barnacles;
  self.hostname = options.hostname || DEFAULT_HOSTNAME;
  self.topic = options.topic || DEFAULT_TOPIC;
  self.clientOptions = options.clientOptions || DEFAULT_CLIENT_OPTIONS;
  self.whitelist = options.whitelist || WHITELIST_ALL;
  self.ignoreInfrastructureTx = options.ignoreInfrastructureTx ||
                                DEFAULT_IGNORE_INFRASTRUCTURE_TX;

  // Establish MQTT connection
  self.mqtt = require('mqtt');
  self.client = self.mqtt.connect('mqtt://' + self.hostname, options);
  self.client.on('connect', function () {
    self.client.subscribe(self.topic);
  });
  self.client.on('error', function(err) {
    console.log('Error with barnacles MQTT connection: ' + err);
    self.client.end();
  });

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
 * Publish the given event to the remote Barnacles instance, if applicable
 * @param {BarnaclesMQTT} instance The given instance.
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

  instance.client.publish(instance.topic, JSON.stringify(event));
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


module.exports = BarnaclesMQTT;
