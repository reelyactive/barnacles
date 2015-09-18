/**
 * Copyright reelyActive 2015
 * We believe in an open Internet of Things
 */


var util = require('util');
var events = require('events');
var socketio = require('socket.io');
var eventsManager = require('./eventsmanager');
var responseHandler = require('./responsehandler');
var barnaclesrest = require('./services/barnaclesrest');
var google = require('./services/google');
var initialstate = require('./services/initialstate');
var mnubo = require('./services/mnubo');
var webroad66 = require('./services/webroad66');
var websocket = require('./services/websocket');


/**
 * Barnacles Class
 * Detects events and sends notifications.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Barnacles(options) {
  var self = this;
  options = options || {};

  self.eventsManager = new eventsManager(options);
  self.services = {};

  emitEvents(self);

  self.routes = {
    "/events": require('./routes/events'),
    "/statistics": require('./routes/statistics')
  };

  console.log("reelyActive Barnacles instance is notifying an open IoT");

  events.EventEmitter.call(self);
}
util.inherits(Barnacles, events.EventEmitter);


/**
 * Configure the routes of the API.
 * @param {Object} options The options as a JSON object.
 */
Barnacles.prototype.configureRoutes = function(options) {
  options = options || {};
  var self = this;

  if(options.app) {
    var app = options.app;

    app.use(function(req, res, next) {
      req.barnacles = self;
      next();
    });

    for(var mountPath in self.routes) {
      var router = self.routes[mountPath];
      app.use(mountPath, router);
    }
  }
};


/**
 * Create the instance of socket.io on the given server.
 * @param {Object} options The options as a JSON object.
 */
Barnacles.prototype.createWebSocket = function(options) {
  options = options || {};
  var self = this;

  if(options.server) {
    self.io = socketio(options.server);

    self.eventsManager.on('appearance', function(tiraid) {
      self.io.emit('appearance', { tiraid: tiraid });
    });
    self.eventsManager.on('displacement', function(tiraid) {
      self.io.emit('displacement', { tiraid: tiraid });
    });
    self.eventsManager.on('disappearance', function(tiraid) {
      self.io.emit('disappearance', { tiraid: tiraid });
    });
    self.eventsManager.on('keep-alive', function(tiraid) {
      self.io.emit('keep-alive', { tiraid: tiraid });
    });
  }
};


/**
 * Get a custom namespace of the socket.io instance.
 * @param {String} namespace The namespace to create.
 * @return The custom namespace.
 */
Barnacles.prototype.getWebSocketNamespace = function(namespace) {
  var self = this;

  if(!self.io) { return null; }
  return self.io.of(namespace);
};


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
};


/**
 * Add a service to notify.
 * @param {Object} options The options as a JSON object.
 */
Barnacles.prototype.addService = function(options) {
  options = options || {};
  var self = this;

  switch(options.service) {
    case "barnaclesrest":
      self.services.barnaclesrest = new barnaclesrest( 
        { eventsManager: self.eventsManager,
          hostname: options.hostname,
          port: options.port,
          path: options.path,
          whitelist: options.whitelist }
      );
      break;
    case "google":
      self.services.google = new google( 
        { eventsManager: self.eventsManager,
          hostname: options.hostname,
          accountId: options.accountId,
          whitelist: options.whitelist }
      );
      break;
    case "initialstate":
      self.services.initialstate = new initialstate( 
        { eventsManager: self.eventsManager,
          bucketType: options.bucketType,
          bucketName: options.bucketName,
          bucketKey: options.bucketKey,
          accessKey: options.accessKey,
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
    case "websocket":
      var namespace = self.getWebSocketNamespace(options.namespace);
      self.services.websocket = new websocket(
        { eventsManager: self.eventsManager,
          io: namespace,
          whitelist: options.whitelist }
      );
      break;
    default:
      console.log("Unsupported service: " + options.service);
  }
};


/**
 * Get the current state of events.
 * @param {Object} options The options as a JSON object.
 * @param {callback} callback Function to call on completion.
 */
Barnacles.prototype.getState = function(options, callback) {
  options = options || {};
  var self = this;

  self.eventsManager.getState(options, callback);    
};


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
  var status;
  var response;

  self.eventsManager.handleEvent(event, tiraid, function(data, err) {
    if(err) {
      status = responseHandler.BADREQUEST;
      response = responseHandler.prepareResponse(status, rootUrl, queryPath);
      callback(response, status);
    }
    else { // TODO: use data from callback?
      status = responseHandler.OK;
      response = responseHandler.prepareResponse(status, rootUrl, queryPath);
      callback(response, status);
    }   
  });
};


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
};


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

module.exports.Barnacles = Barnacles;
