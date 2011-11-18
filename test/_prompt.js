#!/usr/bin/env node

var Prompt = require( '../lib/prompt.js' ).Prompt;

var prompt  = new Prompt();
prompt.handleCommand = function ( c ) {
  console.log( c.trim() );
  prompt.show();
}
prompt.show();
