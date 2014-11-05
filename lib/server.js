/**
 * Copyright reelyActive 2014
 * We believe in an open Internet of Things
 */


var util = require('util');
var events = require('events');
var eventsManager = require('./eventsmanager');


/**
 * Barnacles Class
 * Detects events and sends notifications.
 * @param {Object} options The options as a JSON object.
 * @constructor
 */
function Barnacles(options) {
  options = options || {};
  var self = this;

  this.eventsManager = new eventsManager(options);

  this.eventsManager.on('appearance', function(tiraid) {
    self.emit('appearance', tiraid);
  });
  this.eventsManager.on('displacement', function(tiraid) {
    self.emit('displacement', tiraid);
  });
  this.eventsManager.on('disappearance', function(tiraid) {
    self.emit('disappearance', tiraid);
  });

  console.log("reelyActive Barnacles instance is notifying an open IoT");
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


module.exports = Barnacles;
