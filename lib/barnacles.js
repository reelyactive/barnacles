/**
 * Copyright reelyActive 2015-2017
 * We believe in an open Internet of Things
 */


var util = require('util');
var events = require('events');
var socketio = require('socket.io');
var reelib = require('reelib');
var eventsManager = require('./eventsmanager');
var responseHandler = require('./responsehandler');
var barnaclesrest = require('./services/barnaclesrest');
var barnaclesmqtt = require('./services/barnaclesmqtt');
var breadcrumbs = require('./services/breadcrumbs');
var google = require('./services/google');
var initialstate = require('./services/initialstate');
var logfile = require('./services/logfile');
var mnubo = require('./services/mnubo');
var websocket = require('./services/websocket');


var DEFAULT_ENABLE_MASTER_SOCKET_FORWARDING = false;


/**
 * Barnacles Class
 * Detects events and sends notifications.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Barnacles(options) {
  var self = this;
  options = options || {};

  self.enableMasterSocketForwarding = options.enableMasterSocketForwarding ||
                                      DEFAULT_ENABLE_MASTER_SOCKET_FORWARDING;

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

    self.io.on('connection', function(socket) {
      handleInboundSocketEvents(self, socket);
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
 * Bind to the given data stream and/or association store.
 * @param {Object} options The options as a JSON object.
 */
Barnacles.prototype.bind = function(options) {
  options = options || {};
  var self = this;

  if(options.barnowl) {
    options.barnowl.on('visibilityEvent', function(tiraid) {
      self.eventsManager.handleTiraid(tiraid, function(){});
    });
    options.barnowl.on('reelEvent', function(data) {
      self.eventsManager.handleReelEvent(data, function(){});
    });
  }

  if(options.websocket) {
    handleInboundSocketEvents(self, options.websocket)
  }

  if(options.chickadee) {
    self.associationStore = options.chickadee;
  }
};


/**
 * Add a service to notify.
 * @param {Object} options The options as a JSON object.
 */
Barnacles.prototype.addService = function(options) {
  options = options || {};
  var self = this;
  options.barnacles = self;

  switch(options.service) {
    case "barnaclesrest":
      self.services.barnaclesrest = new barnaclesrest(options);
      break;
    case "barnaclesmqtt":
      self.services.barnaclesmqtt = new barnaclesmqtt(options);
      break;
    case "breadcrumbs":
      self.services.breadcrumbs = new breadcrumbs(options);
      break;
    case "google":
      self.services.google = new google(options);
      break;
    case "initialstate":
      self.services.initialstate = new initialstate(options);
      break;
    case "logfile":
      self.services.logfile = new logfile(options);
      break;
    case "mnubo":
      self.services.mnubo = new mnubo(options);
      break;
    case "websocket":
      options.io = self.getWebSocketNamespace(options.namespace);
      self.services.websocket = new websocket(options);
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
 * Add an event (to be phased out?)
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
 * Add multiple events.
 * @param {Array} events The array of events.
 * @param {String} rootUrl The root URL of the original query.
 * @param {String} queryPath The query path of the original query.
 * @param {callback} callback Function to call on completion.
 */
Barnacles.prototype.addEvents = function(events, rootUrl, queryPath,
                                         callback) {
  var self = this;
  var status;
  var response;

  for(var cEvent = 0; cEvent < events.length; cEvent++) {
    var event = events[cEvent].event;
    var tiraid = events[cEvent].tiraid;

    self.eventsManager.handleEvent(event, tiraid, function(data, err) {
      if(err) {
        status = responseHandler.BADREQUEST;
        response = responseHandler.prepareResponse(status, rootUrl, queryPath);
        callback(response, status);
        return;
      }
    });
  }

  status = responseHandler.OK;
  response = responseHandler.prepareResponse(status, rootUrl, queryPath);
  callback(response, status);
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
    associateAndFlatten(instance, 'appearance', tiraid, function(event) {
      instance.emit('appearance', event);
      if(instance.io && instance.enableMasterSocketForwarding) {
        instance.io.emit('appearance', event);
      }
    });
  });
  instance.eventsManager.on('displacement', function(tiraid) {
    associateAndFlatten(instance, 'displacement', tiraid, function(event) {
      instance.emit('displacement', event);
      if(instance.io && instance.enableMasterSocketForwarding) {
        instance.io.emit('displacement', event);
      }
    });
  });
  instance.eventsManager.on('disappearance', function(tiraid) {
    associateAndFlatten(instance, 'disappearance', tiraid, function(event) {
      instance.emit('disappearance', event);
      if(instance.io && instance.enableMasterSocketForwarding) {
        instance.io.emit('disappearance', event);
      }
    });
  });
  instance.eventsManager.on('keep-alive', function(tiraid) {
    associateAndFlatten(instance, 'keep-alive', tiraid, function(event) {
      instance.emit('keep-alive', event);
      if(instance.io && instance.enableMasterSocketForwarding) {
        instance.io.emit('keep-alive', event);
      }
    });
  });
  instance.eventsManager.on('reelceiverStatistics', function(statistics) {
    instance.emit('reelceiverStatistics', statistics);
  });
}


/**
 * Emit all events emitted by the eventsManager
 * @param {Barnacles} instance The given instance.
 * @param {String} type The event type.
 * @param {Object} tiraid The legacy tiraid.
 * @param {callback} callback Function to call on completion.
 */
function associateAndFlatten(instance, type, tiraid, callback) {
  if(instance.associationStore) {
    var state = { devices: {} };
    state.devices[tiraid.identifier.value] = {
      identifier: tiraid.identifier,
      timestamp: tiraid.timestamp,
      radioDecodings: [ tiraid.radioDecodings[0] ],
      associationIds: tiraid.associationIds ||
                      reelib.tiraid.getAssociationIds(tiraid)
    };
    instance.associationStore.addAssociations(state, function(state) {
      callback(flattenEvent(type, tiraid, state));
    });
  }
  else {
    var flattened = reelib.event.toFlattened({ event: type, tiraid: tiraid });
    flattened.tiraid = tiraid; // Legacy support
    callback(flattened);
  }
}


/**
 * Flatten the event
 * @param {String} type The event type.
 * @param {Object} tiraid The legacy tiraid.
 * @param {Object} state The given state.
 */
function flattenEvent(type, tiraid, state) {
  var flattened = {};
  var deviceId = tiraid.identifier.value;
  var device = state.devices[deviceId];
  var receiverId = device.nearest[0].device;
  var receiver = state.devices[receiverId];

  flattened.event = type;
  flattened.tiraid = tiraid; // Legacy support
  flattened.time = reelib.time.toTimestamp(tiraid.timestamp);
  flattened.deviceId = deviceId;
  flattened.deviceAssociationIds = tiraid.associationIds;
  flattened.deviceUrl = device.url;
  flattened.deviceTags = device.tags;
  flattened.receiverId = receiverId;
  flattened.receiverUrl = receiver.url;
  flattened.receiverTags = receiver.tags;
  flattened.receiverDirectory = receiver.directory;
  flattened.rssi = device.nearest[0].rssi;
  flattened.rssiType = 'uncalibrated';
  return flattened;
}


/**
 * Handle all events received on the websocket
 * @param {Barnacles} instance The given instance.
 * @param {Object} socket The given socket connection.
 */
function handleInboundSocketEvents(instance, socket) {
  socket.on('appearance', function(event) {
    instance.eventsManager.handleEvent('appearance', event.tiraid,
                                       function(data, err) {});
  });
  socket.on('displacement', function(event) {
    instance.eventsManager.handleEvent('displacement', event.tiraid,
                                       function(data, err) {});
  });
  socket.on('disappearance', function(event) {
    instance.eventsManager.handleEvent('disappearance', event.tiraid,
                                       function(data, err) {});
  });
  socket.on('keep-alive', function(event) {
    instance.eventsManager.handleEvent('keep-alive', event.tiraid,
                                       function(data, err) {});
  });
}


module.exports.Barnacles = Barnacles;
