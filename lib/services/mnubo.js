/**
 * Copyright reelyActive 2014-2016
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');

var DEFAULT_CLIENT_ENV = 'sandbox';
var DEFAULT_IGNORE_INFRASTRUCTURE_TX = false;
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

  self.barnacles = options.barnacles;
  self.clientId = options.clientId;
  self.clientSecret = options.clientSecret;
  self.clientEnv = options.clientEnv || DEFAULT_CLIENT_ENV;
  self.whitelist = options.whitelist || WHITELIST_ALL;
  self.ignoreInfrastructureTx = options.ignoreInfrastructureTx ||
                                DEFAULT_IGNORE_INFRASTRUCTURE_TX;
  self.mnubo = require('mnubo-sdk');

  self.client = new self.mnubo.Client({
    id: self.clientId,
    secret: self.clientSecret,
    env: self.clientEnv
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

  // Handle reelceiver statistics
  self.barnacles.on('reelceiverStatistics', function(statistics) {
    handleStatistics(self, statistics);
  });
}


/**
 * Post the given event to mnubo, if applicable
 * @param {Mnubo} instance The given instance.
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

  postUpdate(instance, event);
}


/**
 * Post the given statistics to mnubo, if applicable
 * @param {Mnubo} instance The given instance.
 * @param {Object} statistics The statistics.
 */
function handleStatistics(instance, statistics) {
  if((instance.whitelist !== WHITELIST_ALL) &&
     (instance.whitelist.indexOf(statistics.receiverId) < 0)) {
    return;
  }

  postStatistics(instance, statistics);
}


/**
 * Post an update to the mnubo service
 * @param {Mnubo} instance The given instance.
 * @param {Object} event The given event.
 */
function postUpdate(instance, event) {
  var timestampISO = new Date().toISOString(event.time);
  instance.client.events
    .send([{
      "x_object": {
        "x_device_id": event.receiverId
      },
      "x_event_type": event.event,
      "server_timestamp": timestampISO,
      "transmitter_id": event.deviceId,
      "rssi": event.rssi
    }])
    .then(function(data) {
      // Do nothing
    })
    .catch(function(error) {
      console.log('mnubo service error: ' + error);
    });
}


/**
 * Post statistics to the mnubo service
 * @param {Mnubo} instance The given instance.
 * @param {Object} statistics The given statistics.
 */
function postStatistics(instance, statistics) {
  instance.client.events
    .send([{
      "x_object": {
        "x_device_id": statistics.receiverId
      },
      "x_event_type": "statistics",
      "x_timestamp": statistics.timestamp,
      "up_time": statistics.timestamp, //statistics.uptimeSeconds,
      "sent_count": statistics.sendCount,
      "max_rssi": statistics.maxRSSI,
      "avg_rssi": statistics.avgRSSI,
      "min_rssi": statistics.minRSSI,
      "crc_ok": statistics.crcPass,
      "crc_failed": statistics.crcFail
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
