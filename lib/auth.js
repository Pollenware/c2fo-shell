var Config = require( '../config/auth.js' ).Config,
    OCAP   = require( './ocap.js' ).OCAP,
    p      = require( './commander.js' ),
    tty    = require( 'tty' );

exports.Auth = Auth;

function Auth( version, callback ) {

  var self = this;
  p.version( version )
    .option( '-u, --user  <user name>'         , 'user name'         , validString )
    .option( '-i, --instance <instance name>'  , 'instance host name', validString )
    .option( '-e, --emulating <user name>'     , 'user to emulate'   , validString )
    .option( '-d, --debug'                     , 'turn on debug messages'               )
    .parse( process.argv );

  this.callback = callback;

  this.hasConnections = function () {
    var totalConnections = Object.keys(self.connections).length;
    if (totalConnections === 0 ) {
      console.log( Config.errorPrefix + ' - ' + Config.errorNoConnection );
      return false;
    }
    return true;
  };

  this.connections = {};

  this.connectionString = function () {
    var connect = p.user + '@' + p.instance;
    if ( p.emulating ) {
      connect = connect + '@' + p.emulating;
    }
    return connect;        
  };

  this.getInvoices = function ( connectionId, query ) {
    self.ocap.getInvoices(
      connectionId,
      self.connections[connectionId], 
      function () {self.invoiceCallback( connectionId ) },
      query
    );
  }

  this.invoiceCallback = function ( connectionId, error ) {
    var cId = connectionId.split('@');
    if ( error ) {
      console.log( cId[1] + ' - ' + Config.errorInvoice );
      self.callback( connectionId );
      return;
    }
    else {
      console.log( cId[1] + ' - ' + Config.successInvoice );
      self.callback( connectionId );
    }
  };

  this.lockBasket = function ( connectionId, connection, eventId, supplierId, basketId, statusCode ) {
    self.ocap.lockBasket(
      connectionId,
      self.connections[connectionId], 
      function () {self.lockBasketCallback( connectionId ) },
      eventId,
      supplierId,
      basketId,
      statusCode
    );
  };

  this.lockBasketCallback = function ( connectionId, error ) {
    if ( error ) {
      console.log( Config.errorFlip + ': ' + connectionId );
      self.callback( Config.promptPrefix );
      return;
    }
    else {
      console.log( Config.successFlip );
    }
  };

  this.listConnections = function () {
    var keys = {};
    for( var i in self.connections ) if ( self.connections.hasOwnProperty( i ) ) {
      keys[self.connections[i].id] =  i;
    }
    return keys;
  };

  this.loginCallback = function ( connectionId, error ) {
    if ( error ) {
      console.log( Config.errorConnect + ': ' + connectionId );
      delete self.connections[connectionId]; 
      self.callback( Config.promptPrefix );
      return;
    }
    else {
      self.ocap.getUserDetails( connectionId, self.connections[connectionId], function () {self.callback( connectionId )} );
    }
  };

  this.offerCallback = function ( connectionId, error ) {
    var cId = connectionId.split( '@' );
    if ( error ) {
      console.log( cId[1] + ' - ' + Config.errorOffer );
      self.callback( connectionId );
      return;
    }
    else {
      console.log( cId[1] + ' - ' + Config.successOffer );
      self.callback( connectionId );
    }
  };

  this.placeOffer = function ( connectionId, basket ) {
    self.ocap.placeOffer(
      connectionId,
      self.connections[connectionId], 
      function () {self.offerCallback( connectionId ) },
      basket
    );
  }

  this.toggleCallback = function ( connectionId, error ) {
    var cId = connectionId.split('@');
    if ( error ) {
      console.log( cId[1] + ' - ' + Config.errorToggle );
      self.callback( connectionId );
      return;
    }
    else {
      console.log( cId[1] + ' - ' + Config.successToggle );
      self.callback( connectionId );
    }
  };

  if ( version )
    this.ocap = new OCAP( Config.agentString + version, p.debug );
  else
    this.ocap = new OCAP( null, p.debug );

  this.program = p;

  this.promptForEmulatee = function ( connectionId, listener ) {
    p.prompt( Config.emulatePrefix, function( e ) {
      p.emulating = e.trim();
      newConnectionId = connectionId + '@' + p.emulating;
      self.connections[newConnectionId] = self.connections[connectionId];
      delete self.connections[connectionId];
      if ( listener ) {
        tty.setRawMode( true );
        process.stdin.addListener( 'keypress', listener );
      }
      self.ocap.loginUser( newConnectionId, self.connections[newConnectionId], self.loginCallback );
    });
  };

  this.promptForInstance = function () {
    p.prompt( Config.instancePrefix, function( i ){
      p.instance = i.trim();
      if ( !p.user ) {
        self.promptForUser();
      }
      else {
        self.promptForPassword();
      }
    });
  };

  this.promptForPassword = function ( listener ) {
    tty.setRawMode( false );
    p.password( Config.passwordPrefix, '*', function( pwd ) {
      var connectionId = self.connectionString();
      self.connections[connectionId]           = self.connections[connectionId] || {};
      self.connections[connectionId].password  = pwd;
      self.connections[connectionId].user      = p.user;
      self.connections[connectionId].instance  = p.instance;
      if ( !p.emulating && /^.+_admin$/i.test( p.user ) ) {
        self.promptForEmulatee( connectionId, listener );
      }
      else {
        if ( listener ) {
          tty.setRawMode( true );
          process.stdin.addListener( 'keypress', listener );
        }
        self.ocap.loginUser( connectionId, self.connections[connectionId], self.loginCallback );
      }
    });
  };

  this.promptForUser = function () {
    p.prompt( 'User: ', function( u ) {
      p.user = u.trim();
      if ( p.emulating && !( /^.+_admin$/i.test( p.user ) ) ) {
        console.error( Config.nonAdminWarning );
        callback();
      }
      else if ( !p.instance ) {
        self.promptForInstance();
      }
      else {
        self.promptForPassword();
      }
    });
  };

  this.toggleInvoice = function ( connectionId, keep, exclude ) {
    self.ocap.toggleInvoice(
      connectionId,
      self.connections[connectionId], 
      function () {self.toggleCallback( connectionId ) },
      keep,
      exclude
    );
  };

  var initState = {
    isInvalidEmulator   : ( p.emulating && p.user && !( /^.+_admin$/i.test( p.user ) ) ), 
    isEmulatingInstance : ( p.emulating && p.instance ), 
    isEmulatingUser     : ( p.emulating && p.user ), 
    isEmulatingReady    : ( p.emulating && p.instance && p.user ), 
    hasInstanceAndUser  : ( p.user      && p.instance ),
    hasEmulatingOnly    : ( p.emulating ),
    hasUserOnly         : ( p.user      && 1 ),
    hasInstanceOnly     : ( p.instance && 1 )
  };
  if ( initState.isInvalidEmulator ) {
    callback(null, Config.nonAdminWarning );
  }
  else if ( initState.hasInstanceAndUser || initState.isEmulatingReady ) {
    process.stdin.resume();
    this.promptForPassword();
  }
  else if ( initState.hasUserOnly || initState.isEmulatingUser ) {
    this.promptForInstance();
  }
  else if ( initState.hasInstanceOnly || initState.isEmulatingInstance || initState.hasEmulatingOnly ) {
    this.promptForUser();
  }
  else {
    callback();
  }
}

function validString ( val ) {
  var result = ( /^[_\-a-zA-Z0-9]+$/.test( val ) ) ? val : false;
  if ( result ) {
    return result;
  }
 else {
    console.error( val, Config.badValueMsg );
    process.exit();
  }
}
