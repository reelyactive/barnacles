/**
 * Copyright reelyActive 2014
 * We believe in an open Internet of Things
 */

var http = require('http');

var DEFAULT_HOSTNAME = "webroad66-demo.azurewebsites.net";
var DEFAULT_PORT = 80;


/**
 * WebRoad66 Class
 * Sends notifications to the Web Road 66 service.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function WebRoad66(options) {
  options = options || {};
  var self = this;

  this.eventsManager = options.eventsManager;
  this.hostname = options.hostname || DEFAULT_HOSTNAME;
  this.port = options.port || DEFAULT_PORT;
  //this.authorization = options.authorization;
  //this.clientId = options.clientId;

  this.eventsManager.on('appearance', function(tiraid) {
    postUpdate(self, 'appearance', tiraid);
  });
  this.eventsManager.on('displacement', function(tiraid) {
    postUpdate(self, 'displacement', tiraid);
  });
  this.eventsManager.on('disappearance', function(tiraid) {
    //postUpdate(self, 'disappearance', tiraid);
  });
};


/**
 * Post an update to the WebRoad66 service
 * @param {WebRoad66} instance The given instance.
 * @param {String} event The type of event.
 * @param {Object} tiraid The tiraid representing the event.
 */
function postUpdate(instance, event, tiraid) {
  var options = {
    hostname: instance.hostname,
    port: instance.port,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    path: '/api/Statistics?bid=' + tiraid.radioDecodings[0].identifier.value +
          '&did=' + tiraid.identifier.value
  };
 
  var payload = tiraid;

  // TODO: move this to a utils file
  var req = http.request(options, function(res) {
    var data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });   
    res.on('end', function() {
      console.log("Web Road 66 says: " + data);
    });
    console.log("Web Road 66 status code: " + res.statusCode);
  });

  req.write(JSON.stringify(payload)); 
  req.end();
}


module.exports = WebRoad66;
