var Auth    = require( './auth.js' ).Auth,
    Util    = require( './util.js' ).Util,
    fs      = require( 'fs' );

exports.C2FO = C2FO;

function C2FO ( cli ) {

  var self = this;

  self.appendFile =  function ( path, text ) {
    try {
      fs.open( path, 'a', 0666, function( err, fd ) {
        if ( err ) { throw err; }
        try {
          var buffer = new Buffer( text  );
          fs.write( fd, buffer, 0, buffer.length, null, function( err, written, buffer ) {
            if ( err ) {
              throw err; 
            }
            fs.close( fd, function() {
              self.cli.loop();
            } );
          } );
        }
        catch ( err ) {
          console.log( err );
          self.cli.loop();
        }
      });
    }
    catch ( err ) {
      console.log( err );
      self.cli.loop();
    }
  };

  self.cli = cli;
  self.auth = new Auth( self.cli.version, function ( prompt, msg ) {
    if ( msg ) {
      console.log( msg );
    }
    if ( prompt )  {
      self.cli.prompt = function () { return prompt + '> '; };
    }
    self.cli.loop();
  } );

  self.connections = 0;

  self.logData = [];
  self.log = function ( o ) {
    self.logData.push( o );
    if (typeof o === 'string' ) {
      console.log( o );
    }
    else {
      console.log( JSON.stringify( o, null, 2 ) );
    }
  };

  self.login = function ( connect, sessionTimeout ) {
    var connection              = self.auth.connections[connect] || {};
    var tokens                  = connect.split( '@' );
    self.auth.program.user      = tokens[0].trim();
    self.auth.program.instance  = tokens[1].trim();
    self.auth.program.emulating = (tokens[2] && tokens[2].trim());
    var dt = new Date(),
        expiryTime = dt.setTime( dt.getTime() + ( sessionTimeout * 60 * 1000 ) ); 
    if ( connection && connection.sessionCookie && ( connection.lastActive.getTime() < dt.getTime() ) ) {
      self.cli.prompt = function () { return ( connect + '> ' ); };
      self.cli.setPrompt();
      self.cli.loop();
    }
    else {
      var keypressListener = function( s, key ) {
        self.cli.readline._ttyWrite( s, key );
      };
      process.stdin.removeAllListeners( 'keypress' );
      self.auth.promptForPassword( keypressListener );
    }
  };

  self.sanitize = function ( connection ) {
    if (!connection)
      return;
    if ( connection.password )
      delete connection.password;
    if ( connection.lastActive ) {
      var t = Util.timeElapse( ( new Date() ).getTime(), connection.lastActive.getTime() );
      connection.timeElapse = t;
    }
    return connection;
  };

}
