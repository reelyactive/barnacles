/**
 * Copyright reelyActive 2014-2015
 * We believe in an open Internet of Things
 */


var util = require('util');
var events = require('events');
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var eventsManager = require('./eventsmanager');
var responseHandler = require('./responsehandler');
var google = require('./services/google');
var mnubo = require('./services/mnubo');
var webroad66 = require('./services/webroad66');

var HTTP_PORT = 3005;


/**
 * Barnacles Class
 * Detects events and sends notifications.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Barnacles(options) {
  var self = this;
  options = options || {};
  this.specifiedHttpPort = options.httpPort || HTTP_PORT;
  this.httpPort = process.env.PORT || this.specifiedHttpPort;

  this.eventsManager = new eventsManager(options);
  this.services = {};

  this.app = express();
  this.app.use(bodyParser.json());

  this.router = express.Router();
  this.router.use(function(req, res, next) {
    // TODO: basic error checking goes here in the middleware
    next();
  });

  // ----- route: /event ------
  this.router.route('/event')

    .post(function(req, res) {
      var event = req.body.event;
      var tiraid = req.body.tiraid;
      self.updateState(event, tiraid, function(response, status) {
        res.status(status).json(response);
      });
    });

  // ----- route: /statistics ------
  this.router.route('/statistics')

    .get(function(req, res) {
      self.getStatistics(req, function(response, status) {
        res.status(status).json(response);
      });
    });

  this.app.use('/', self.router);

  emitEvents(self);

  console.log("reelyActive Barnacles instance is notifying an open IoT");

  this.app.listen(this.httpPort, function() {
    console.log("barnacles is listening on port", self.httpPort);
  });

  events.EventEmitter.call(this);
};
util.inherits(Barnacles, events.EventEmitter);


/**
 * Bind to the given data stream.
 * @param {Object} options The options as a JSON object.
 */
Barnacles.prototype.bind = function(options) {
  options = options || {};
  var self = this;

  if(options.barnowl) {
    options.barnowl.on('visibilityEvent', function(tiraid) {
      self.eventsManager.handleTiraid(tiraid);
    });
  }    
}


/**
 * Add a service to notify.
 * @param {Object} options The options as a JSON object.
 */
Barnacles.prototype.addService = function(options) {
  options = options || {};
  var self = this;

  switch(options.service) {
    case "google":
      self.services.google = new google( 
        { eventsManager: self.eventsManager,
          hostname: options.hostname,
          accountId: options.accountId,
          whitelist: options.whitelist }
      );
      break;
    case "mnubo":
      self.services.mnubo = new mnubo( 
        { eventsManager: self.eventsManager,
          hostname: options.hostname,
          port: options.port,
          authorization: options.authorization,
          clientId: options.clientId,
          whitelist: options.whitelist }
      );
      break;
    case "webroad66":
      self.services.webroad66 = new webroad66( 
        { eventsManager: self.eventsManager,
          hostname: options.hostname,
          port: options.port,
          whitelist: options.whitelist }
      );
      break;
    default:
      console.log("Unsupported service: " + options.service);
  }
}


/**
 * Get the current state of events.
 * @param {Object} options The options as a JSON object.
 * @param {callback} callback Function to call on completion.
 */
Barnacles.prototype.getState = function(options, callback) {
  options = options || {};
  var self = this;

  self.eventsManager.getState(options, callback);    
}


/**
 * Update the current state of events.
 * @param {String} event The type of event.
 * @param {Object} tiraid The corresponding tiraid.
 * @param {callback} callback Function to call on completion.
 */
Barnacles.prototype.updateState = function(event, tiraid, callback) {
  var self = this;

  self.eventsManager.handleEvent(event, tiraid, callback);
}


/**
 * Get the latest statistics record.
 */
Barnacles.prototype.getStatistics = function(req, callback) {
  var self = this;

  var statistics = self.eventsManager.getStatistics();
  var data = { statistics: statistics };
  var status = responseHandler.OK;
  callback(responseHandler.prepareResponse(status, req, data), status);
}


/**
 * Emit all events emitted by the eventsManager
 * @param {Barnacles} instance The given instance.
 */
function emitEvents(instance) {
  instance.eventsManager.on('appearance', function(tiraid) {
    instance.emit('appearance', tiraid);
  });
  instance.eventsManager.on('displacement', function(tiraid) {
    instance.emit('displacement', tiraid);
  });
  instance.eventsManager.on('disappearance', function(tiraid) {
    instance.emit('disappearance', tiraid);
  });
}

module.exports = Barnacles;
