/**
 * Copyright reelyActive 2015
 * We believe in an open Internet of Things
 */

var express = require('express');
var responseHandler = require('../responsehandler');


var router = express.Router();

router.route('/')
  .post(function(req, res) {
    createEvents(req, res);
  });


/**
 * Create one or more events.
 * @param {Object} req The HTTP request.
 * @param {Object} res The HTTP result.
 */
function createEvents(req, res) {
  var events = req.body.events;
  var event = req.body.event;
  var tiraid = req.body.tiraid;
  var rootUrl = req.protocol + '://' + req.get('host');
  var queryPath = req.originalUrl;

  // Multiple events
  if(typeof(events) !== 'undefined') {
    req.barnacles.addEvents(events, rootUrl, queryPath,
                            function(response, status) {
      res.status(status).json(response);
    });
  }

  // Single event (to be phased out?)
  else {
    req.barnacles.addEvent(event, tiraid, rootUrl, queryPath,
                           function(response, status) {
      res.status(status).json(response);
    });
  }
}


module.exports = router;
