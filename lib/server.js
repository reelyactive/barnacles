/**
 * Copyright reelyActive 2014-2015
 * We believe in an open Internet of Things
 */


var express = require('express');
var bodyParser = require('body-parser');
var barnacles = require('./barnacles');
var Barnacles = barnacles.Barnacles;


var HTTP_PORT = 3005;


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

  var app = express();
  app.use(bodyParser.json());

  var instance = new Barnacles(options);
  options.app = app;
  instance.configureRoutes(options);

  app.listen(httpPort, function() {
    console.log('barnacles is listening on port', httpPort);
  });

  return instance;
};


module.exports = BarnaclesServer;
module.exports.Barnacles = Barnacles;
