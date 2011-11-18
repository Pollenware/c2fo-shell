var Auth    = require( './auth.js' ).Auth;

exports.C2FO = C2FO;

function C2FO ( cli ) {

  var self = this;

  self.cli = cli;
  self.auth = new Auth( self.cli.version, function ( prompt, msg ) {
    if ( msg ) {
      console.log( msg );
    }
    if ( prompt )  {
      self.cli.prompt = function () { return prompt + '> '; };
    }
    self.prompt.show();
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
    self.boot.environment.user      = tokens[0].trim();
    self.boot.environment.instance  = tokens[1].trim();
    self.boot.environment.emulating = (tokens[2] && tokens[2].trim());
    var dt = new Date(),
        expiryTime = dt.setTime( dt.getTime() + ( sessionTimeout * 60 * 1000 ) ); 
    if ( connection && connection.sessionCookie && ( connection.lastActive.getTime() < dt.getTime() ) ) {
      self.cli.prompt = function () { return ( connect + '> ' ); };
      self.cli.setPrompt();
      self.prompt.show();
    }
    else {
      var keypressListener = function( s, key ) {
        self.cli.readline._ttyWrite( s, key );
      };
      process.stdin.removeAllListeners( 'keypress' );
      self.auth.promptForPassword( keypressListener );
    }
  };

}
