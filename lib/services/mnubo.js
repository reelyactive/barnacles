/**
 * Copyright reelyActive 2014
 * We believe in an open Internet of Things
 */

var https = require('https');

var DEFAULT_HOSTNAME = "sandbox.api.mnubo.com";
var DEFAULT_PORT = 4443;


/**
 * Mnubo Class
 * Sends notifications to the mnubo serivce.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Mnubo(options) {
  options = options || {};
  var self = this;

  this.eventsManager = options.eventsManager;
  this.hostname = options.hostname || DEFAULT_HOSTNAME;
  this.port = options.port || DEFAULT_PORT;
  this.authorization = options.authorization;
  this.clientId = options.clientId;

  this.eventsManager.on('appearance', function(tiraid) {
    postUpdate(self, 'appearance', tiraid);
  });
  this.eventsManager.on('displacement', function(tiraid) {
    postUpdate(self, 'displacement', tiraid);
  });
  this.eventsManager.on('disappearance', function(tiraid) {
    postUpdate(self, 'disappearance', tiraid);
  });
};


/**
 * Post an update to the mnubo service
 * @param {Mnubo} instance The given instance.
 * @param {String} event The type of event.
 * @param {Object} tiraid The tiraid representing the event.
 */
function postUpdate(instance, event, tiraid) {
  var options = {
    hostname: instance.hostname,
    port: instance.port,
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
               'Authorization': instance.authorization },
    path: '/objwrite/1/objects/receiver_RF_id_1/samples?idtype=deviceid&clientid='
          + instance.clientId
  };
 
  var payload = {
    "samples": [
      { "name":"detected_tag_id",
        "latitude":"48.484",
        "longitude":"-73.563",
        "elevation":"20.463",
        "value": { "identifier_value": tiraid.identifier.value,
                   "identifier_type": tiraid.identifier.type,
                   "radioDecodings_rssi": tiraid.radioDecodings[0].rssi.toString(),
                   "radioDecodings_identifier_type": tiraid.radioDecodings[0].identifier.type,
                   "radioDecodings_identifier_value": tiraid.radioDecodings[0].identifier.value || ""
        }	
      }
    ]
  };

  // TODO: move this to a utils file
  var req = https.request(options, function(res) {
    var data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });   
    res.on('end', function() {
      console.log(data);
    });
    console.log(res.statusCode);
  });

  req.write(JSON.stringify(payload)); 
  req.end();
}


module.exports = Mnubo;
