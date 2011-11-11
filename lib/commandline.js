var readline = require( 'readline' );

process.stdin.resume();
exports.CommandLine = CommandLine;

function CommandLine( o, commandCallback ) {
  var self = this;
  o = o || {};
  var options = {
    defaultPrompt : o.defaultPrompt || function () {
      return (new Date()).getTime() + ' ' + process.argv[1].split('/').pop() + '> '; 
    },
    exitMsg       : o.exitMsg,
    helpBlurb     : o.helpBlurb,
    title         : o.title,
    version       : o.version
  };

  self.version    = options.version;

  self.setPrompt = function () {
    self.readline.setPrompt( self.prompt() );
  };

  self.loop = function () {
    if ( !self.readline ) {
      self.readline = readline.createInterface( process.stdin, process.stdout );
      self.prompt = self.prompt || options.defaultPrompt;
      self.setPrompt()
      self.readline.on( 'line', function( line ) {
        if( line ) {
          self.handleCommand( line.trim() );
        }
      }).on('close', function() {
        console.log( "\n" + options.exitMsg );
        self.readline.close();
        process.stdin.destroy();
        process.exit( 0 );
      });
      console.log( process.argv[1].split( '/' ).pop() + ' ' + options.title + ' v' + options.version + ' ' + ( new Date() ) );
      console.log( options.helpBlurb );
    }
    self.setPrompt();
    self.readline.prompt();
  };

}
