/**
 * Copyright reelyActive 2014-2015
 * We believe in an open Internet of Things
 */


var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var barnacles = require('./barnacles');
var Barnacles = barnacles.Barnacles;


var HTTP_PORT = 3005;
var USE_CORS = false;


/**
 * BarnaclesServer Class
 * Server for barnacles, returns an instance of barnacles with its own Express
 * server listening on the given port.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function BarnaclesServer(options) {
  options = options || {};
  var specifiedHttpPort = options.httpPort || HTTP_PORT;
  var httpPort = process.env.PORT || specifiedHttpPort;
  var useCors = options.useCors || USE_CORS;

  var app = express();
  var server = http.createServer(app);
  app.use(bodyParser.json());
  if(useCors) {
    app.use(cors());
  }

  var instance = new Barnacles(options);
  options.app = app;
  instance.configureRoutes(options);
  instance.createWebSocket( { server: server } );

  server.listen(httpPort, function() {
    console.log('barnacles is listening on port', httpPort);
  });

  return instance;
};


module.exports = BarnaclesServer;
module.exports.Barnacles = Barnacles;
