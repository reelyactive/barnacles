/**
 * Copyright reelyActive 2015
 * We believe in an open Internet of Things
 */

var http = require('http');

var DEFAULT_HOSTNAME = "www.hyperlocalcontext.com";
var DEFAULT_PORT = 80;
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

  this.eventsManager = options.eventsManager;
  this.hostname = options.hostname || DEFAULT_HOSTNAME;
  this.port = options.port || DEFAULT_PORT;
  this.whitelist = options.whitelist || WHITELIST_ALL;

  this.eventsManager.on('appearance', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'appearance', tiraid);
    }
  });
  this.eventsManager.on('displacement', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'displacement', tiraid);
    }
  });
  this.eventsManager.on('disappearance', function(tiraid) {
    // Do nothing
  });
  this.eventsManager.on('keep-alive', function(tiraid) {
    if(isWhitelisted(self, tiraid)) {
      postUpdate(self, 'keep-alive', tiraid);
    }
  });
}


/**
 * Post an update to the remote Barnacles instance
 * @param {BarnaclesREST} instance The given instance.
 * @param {String} event The type of event.
 * @param {Object} tiraid The tiraid representing the event.
 */
function postUpdate(instance, event, tiraid) {
  var options = {
    hostname: instance.hostname,
    port: instance.port,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    path: '/events'
  };
 
  var payload = { event: event, tiraid: tiraid };

  // TODO: move this to a utils file
  var req = http.request(options, function(res) {
    var data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });   
    res.on('end', function() {
      //console.log("Remote barnacles says: " + data);
    });
    //console.log("Remote barnacles status code: " + res.statusCode + " " + event);
  });

  req.write(JSON.stringify(payload)); 
  req.end();
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
