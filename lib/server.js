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
  self.specifiedHttpPort = options.httpPort || HTTP_PORT;
  self.httpPort = process.env.PORT || self.specifiedHttpPort;

  self.eventsManager = new eventsManager(options);
  self.services = {};

  self.app = express();
  self.app.use(bodyParser.json());

  self.app.use(function(req, res, next) {
    req.instance = self;
    next();
  });

  self.app.use('/event', require('./routes/event'));
  self.app.use('/statistics', require('./routes/statistics'));

  emitEvents(self);

  console.log("reelyActive Barnacles instance is notifying an open IoT");

  self.app.listen(self.httpPort, function() {
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
      self.eventsManager.handleTiraid(tiraid, function(){});
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
 * Add an event.
 * @param {String} event The type of event.
 * @param {Object} tiraid The corresponding tiraid.
 * @param {String} rootUrl The root URL of the original query.
 * @param {String} queryPath The query path of the original query.
 * @param {callback} callback Function to call on completion.
 */
Barnacles.prototype.addEvent = function(event, tiraid, rootUrl, queryPath,
                                        callback) {
  var self = this;

  self.eventsManager.handleEvent(event, tiraid, function(data, err) {
    if(err) {
      var status = responseHandler.BADREQUEST;
      var response = responseHandler.prepareResponse(status, rootUrl,
                                                     queryPath);
      callback(response, status);
    }
    else { // TODO: use data from callback?
      var status = responseHandler.OK;
      var response = responseHandler.prepareResponse(status, rootUrl,
                                                     queryPath);
      callback(response, status);
    }   
  });
}


/**
 * Get the latest statistics record.
 * @param {String} rootUrl The root URL of the original query.
 * @param {String} queryPath The query path of the original query.
 * @param {callback} callback Function to call on completion.
 */
Barnacles.prototype.getStatistics = function(rootUrl, queryPath, callback) {
  var self = this;

  var statistics = self.eventsManager.getStatistics();
  var data = { statistics: statistics };
  var status = responseHandler.OK;
  var response = responseHandler.prepareResponse(status, rootUrl, queryPath,
                                                 data);
  callback(response, status);
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
  instance.eventsManager.on('keep-alive', function(tiraid) {
    instance.emit('keep-alive', tiraid);
  });
}

module.exports = Barnacles;
