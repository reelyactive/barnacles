/**
 * Copyright reelyActive 2017
 * We believe in an open Internet of Things
 */

var reelib = require('reelib');
var request = require('request');
var nedb = require('nedb');

var DEFAULT_SYSTEM_NAME = 'reelyActive';
var DEFAULT_URI = 'http://localhost:3000/breadcrumbs';
var DEFAULT_PARAMETERS = { headers: { 'Content-Type': 'application/json' } };
var DEFAULT_UPDATE_MILLISECONDS = 60000;
var DEFAULT_PROPERTIES = [ 'receiverId', 'rssi', 'deviceAssociationIds' ];
var DEFAULT_IGNORE_INFRASTRUCTURE_TX = false;


/**
 * Breadcrumbs Class
 * Sends 'breadcrumbs' of devices and geocoordinates to a given server.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Breadcrumbs(options) {
  options = options || {};
  var self = this;

  self.barnacles = options.barnacles;
  self.systemName = options.systemName || DEFAULT_SYSTEM_NAME;
  self.updateMilliseconds = options.updateMilliseconds ||
                            DEFAULT_UPDATE_MILLISECONDS;
  self.parameters = DEFAULT_PARAMETERS;
  self.parameters.uri = options.uri || DEFAULT_URI;
  self.parameters.timeout = self.updateMilliseconds;
  self.properties = options.properties || DEFAULT_PROPERTIES;
  self.accept = options.accept;
  self.reject = options.reject;
  self.gps = options.gps;
  self.ignoreInfrastructureTx = options.ignoreInfrastructureTx ||
                                DEFAULT_IGNORE_INFRASTRUCTURE_TX;
  self.db = new nedb();

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

  function update() {
    dropBreadcrumb(self);
  }
  setInterval(update, self.updateMilliseconds);
}


/**
 * Post the given event to the remote Barnacles instance, if applicable
 * @param {Breadcrumbs} instance The given instance.
 * @param {Object} event The event.
 */
function handleEvent(instance, event) {
  var isIgnored = instance.ignoreInfrastructureTx &&
                  reelib.tiraid.isReelyActiveTransmission(event.tiraid);

  // Abort if the event is ignored, invalid or does not pass criteria
  if(isIgnored || !reelib.event.isValid(event) ||
     !reelib.event.isPass(event, instance.accept, instance.reject)) {
    return;
  }

  // Include all properties of interest and upsert in the database
  var doc = { _id: event.deviceId, deviceId: event.deviceId };
  for(var cProperty = 0; cProperty < instance.properties.length; cProperty++) {
    var property = instance.properties[cProperty];
    if(event.hasOwnProperty(property)) {
      doc[property] = event[property];
    }
  }
  instance.db.update({ _id: event.deviceId }, doc, { upsert: true });
}


/**
 * Prepare the breadcrumb 
 * @param {Breadcrumbs} instance The given instance.
 * @param {Array} devices The array of devices.
 */
function prepareBreadcrumb(instance, devices) {
  var breadcrumb = {
    systemName: instance.systemName,
    time: reelib.time.getCurrent(),
    gps: {},
    devices: devices
  };
  if(instance.gps && instance.gps.hasOwnProperty('state')) {
    breadcrumb.gps.lastFix = instance.gps.state.lastFix;
    breadcrumb.gps.lat = instance.gps.state.lat;
    breadcrumb.gps.lon = instance.gps.state.lon;
    breadcrumb.gps.alt = instance.gps.state.alt;
    breadcrumb.gps.numberOfActiveSats = instance.gps.state.satsActive.length;
  }
  return breadcrumb;
}


/**
 * Post the breadcrumb and clear the database
 * @param {Breadcrumbs} instance The given instance.
 */
function dropBreadcrumb(instance) {
  instance.db.find({}, { _id: 0 }, function (err, docs) {
    instance.db.remove({}, { multi: true });
    instance.parameters.json = prepareBreadcrumb(instance, docs);
    request.post(instance.parameters, function(err, res, body) {
      if(err) {
        console.log('Breadcrumb post to ' + instance.parameters.uri +
                    ' failed: ' + err.message);
      }
    });
  });
}


module.exports = Breadcrumbs;
