#!/usr/bin/env node

var CommandLine  = require('../lib/commandline.js').CommandLine

var cli  = new CommandLine();
cli.handleCommand = function (c) {
  console.log(c.trim());
  cli.loop();
}
cli.loop();
