/**
 * Module dependencies.
 */
var util       = require('util' ),
  MCat         = require('message-catalog/shell.js' ).MCat, 
  events       = require('events'),
  emitter      = new events.EventEmitter(),
  Library      = require( MCat.functions ).Library,
  version      = '0.0.1',
  userAgent    = "c2fo_ui" + version;

/**
 * Library version .
 */

exports.version = version;

exports.userAgent = userAgent;

exports.util         = util;

exports.MCat         = MCat;

exports.events       = events;

exports.emitter      = emitter;

exports.Library      = Library;
