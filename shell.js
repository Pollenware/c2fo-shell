#!/usr/bin/env node

var Config   = require( 'config/shell.js' ).Config,
    Env      = require( 'env.js' ).Env,
    Library  = require( Config.functions ).Library;
    net      = require( 'net' ),
    Prompt   = require( 'prompt.js' ).Prompt,
    repl     = require( 'repl' ),
    Shell    = require( 'shell.js' ).Shell,
    Util     = require( 'util.js' ).Util,
    version  = '0.0.1';

//
// define appearance & behavior of command-line
//
var prompt = new Prompt( {
  debug     : false,
  default   : function () { return Config.promptPrefix + '> '; },
  exitMsg   : Config.exitMsg,
  helpBlurb : Config.helpBlurb,
  title     : Config.title,
  version   : version
} );

//
// present prompt; optionally first displaying a custom message
//
var finishHandler = function ( promptContent, msg ) {
  if ( msg ) {
    console.log( msg );
  }
  if ( promptContent )  {
    prompt.content = function () { return promptContent + '> '; };
  }
  prompt.show();
};

//
// load external routines the shell can call
//
var library = new Library( Config.agentString + version, finishHandler );

//
// deal with command-line options and signing in 
//
var authHandler = function ( connectionId, pwd ) {
  library.auth.signIn( connectionId, pwd );
};
var env = new Env( version, authHandler, finishHandler );
prompt.isDebugging = env.context.debug;
var libModules = [ 'net', 'auth', 'event', 'invoice' ];
for (var m in libModules) {
  library[libModules[m]].isDebugging = env.context.debug;
}

//
// start shell
//
var shell = new Shell( env, prompt, library );

// 
// add to shell's connection list after 
// signin attempt has fully authenticated
//
library.auth.signInCallback = function ( connectionId, pwd, user, instance, response, error ) {
  if ( error ) {
    console.log( Config.errorConnect + ': ' + connectionId );
    finishHandler( Config.promptPrefix, error );
    return;
  }
  else {
    if ( response ) {
      console.log( instance + ' - ' + Config.sessionGrantMsg );
      shell.env.connections[connectionId] = shell.env.connections[connectionId] || {};
      var connection           = shell.env.connections[connectionId];
      var payload              = JSON.parse( response.body ).payload;
      connection.id            = library.connectionCount++;
      connection.instance      = instance;
      connection.lastActive    = new Date( payload.created );
      connection.lastAction    = Config.successSigninMsg;
      connection.password      = pwd;
      connection.sessionCookie = response.headers['set-cookie'][0];
      connection.user          = user;
      library.auth.getDetails( connectionId, connection, library.event.getDetails );
    }
    else {
      console.log( Config.errorConnect + ': ' + connectionId );
      finishHandler( Config.promptPrefix );
      return;
    }
  }
};

shell.prompt.handleCommand = function ( command ) {
        
  var connectionId = shell.env.connectionString();
  var connection = shell.env.connections[ connectionId ];

  //
  // [integer] (connection alias)
  //
  if ( /^\s*\d+\s*$/.test( command ) ) {
    var connections = shell.env.connections;
    var found = false;
    for ( var c in connections ) {
      var thisConnection = connections[ c ];
      if (thisConnection.id == command) {
        found = true; 
        if ( thisConnection.password )
          delete thisConnection.password;
        shell.connect(c, Config.sessionTimeout);
        return;
      }
    }
    if ( !found ) {
      console.log( Config.notFoundMsg );
      shell.prompt.show();
    }
  }

  //
  // <user>@<instance> (connect)
  //
  else if ( /^\s*[A-Za-z0-9\-_]+\@.+[\@A-Za-z0-9\-_]*\s*$/.test( command ) ) {
    shell.connect( command, Config.sessionTimeout );
    return;
  }

  //
  // baskets - b 
  //
  else if ( /^\s*(b|baskets)\s+\d+\s*\d*\s*$/.test( command ) ) {

    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    command     = command.split(/\s+/);
    var eventId = command[1] && command[1].trim();
    var id      = command[2] && command[2].trim();
    if ( eventId && id ) {
      try {
        if ( connection.events[eventId].baskets[id] ) {
          shell.log( connection.events[eventId].baskets[id] );
        }
        else {
          console.log( Config.notFoundMsg );
        }
      }
      catch ( err ) {
        try {
          if ( connection.events[eventId].event_participations[id] ) {
            shell.log( connection.events[eventId].event_participations[id] );
          }
          else {
            console.log( Config.notFoundMsg );
          }
        }
        catch ( err ) {
          console.log( Config.notFoundMsg );
        }
      }
    }
    else if ( eventId ) {
      try {
        if ( connection.events[eventId].baskets ) {
          for ( b in connection.events[eventId].baskets ) {
            shell.log( connection.events[eventId].baskets[b] );
          }
        }
        else {
          if ( connection.events[eventId].event_participations ) {
            for ( e in connection.events[eventId].event_participations ) {
              shell.log( connection.events[eventId].event_participations[e] );
            }
          }
        }
      }
      catch ( err ) {
        console.log( Config.notFoundMsg );
      }
    }
  }

  //
  // connections - c
  //
  else if ( /^\s*(c|connections)[ \@a-zA-Z0-9\-_]*$/.test( command ) ) {
 
    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    var connections  = shell.env.connections;
    for ( var c in connections ) {
      connections[c] = Util.sanitizeConnection( connections[c] );
    }
    var found     = false;
    if (  /^\s*(c|connections)\s+[\@a-zA-Z0-9\-_]+$/.test( command ) ) {
      var tokens = command.split(/\s+/);
      var thisConnectionId = tokens[1].trim();
      if ( /^\d+$/.test( thisConnectionId ) ) {
        for ( var c in connections ) {
          if ( connections[c].id == thisConnectionId ) {
            found = true;
            shell.log( shell.env.connections[c] );
            break;
          }
        }
      }
      else {
        shell.log( connections[thisConnectionId] );
        found = true;
      }
      if ( !found ) {
        console.log( Config.notFoundMsg );
      }
    }
    else if ( /^\s*(c|connections)\s*$/.test( command) ) {
      found = true;
      shell.log( shell.env.listConnections() );
    }
    if ( !found ) {
      console.log( Config.notFoundMsg );
    }
    shell.prompt.show();
    return;
  }

  //
  // delete connection - d
  //
  else if ( /^\s*(d|delete)\s+.+$/.test( command ) ) {

    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    command = command.split(/\s+/);

    var thisConnectionId = command[1].trim();

    var found = false;

    if ( /^\d+$/.test( thisConnectionId ) ) {
      var connections = shell.env.connections;
      for ( var c in connections ) {
        if (connections[c].id == thisConnectionId) {
          found = true;
          delete shell.env.connections[c];
          if ( c == shell.env.connectionString() ) {
            shell.prompt.content = function () { return Config.promptPrefix + '> '};
            shell.prompt.set() ;
          }
        }
      } 
    }
    else {
      if ( shell.env.connections[thisConnectionId] ) {
        found = true;
        delete shell.env.connections[thisConnectionId];
        if ( c == shell.env.connectionString() ) {
          shell.prompt.content = function () { return Config.promptPrefix + '> '};
          shell.prompt.set() ;
        }
      }
    }
    if ( !found ) {
      console.log( Config.notFoundMsg );
    }
    shell.prompt.show();
    return;
  }

  //
  // environment - e 
  //
  else if ( /^\s*(e|environment)[ a-zA-Z0-9\-_]*$/.test( command ) ) {

    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    var sanitizedConnection = Util.sanitizeConnection( connection );

    if ( sanitizedConnection && /^\s*(e|environment)\s+[a-zA-Z0-9\-_]+$/.test( command ) ) {
      var c = command.split( /\s+/ );
      var attribute = c[1];
      shell.log( sanitizedConnection[attribute] );
    }
    else if ( sanitizedConnection && /^\s*(e|environment)\s*$/.test( command ) ) {
      sanitiziedConnection = sanitizedConnection || {};
      var suppressDetail      =  {};
      suppressDetail.events   =  [];
      suppressDetail.invoices =  0;
      for ( c in sanitizedConnection ) {
        if ( c == 'events' ) {
          for ( eid in sanitizedConnection['events'] ) {
            suppressDetail.events.push(eid);
          }
        }
        else if ( c == 'invoices_local' ) {
          var totalInvoices = Object.keys( sanitizedConnection.invoices_local ).length;
          suppressDetail.invoices = totalInvoices;
        }
        else if ( c == 'sessionCookie' ) {
          var cookie = sanitizedConnection.sessionCookie.split( ' ' )[0];
          cookie = cookie && ( cookie.substr( 0,4 ) + '...' + cookie.substr( -5,5 ) );
          suppressDetail.sessionCookie = cookie;
        }
        else {
          suppressDetail[c] = sanitizedConnection[c];
        }
      }
      shell.log( suppressDetail );
    }
    else {
      console.log( Config.notFoundMsg );
    }
  }

  //
  // help - h
  //
  else if ( /^\s*(h|help)\s*$/.test( command ) ) {
    Config.helpMsg( prompt );
    return;
  }

  //
  // invoices - i 
  //
  else if ( /^\s*(i|invoices)[ =<>a-zA-Z0-9\-\._]*$/.test( command ) ) {

    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    // has query
    if ( /^\s*(i|invoices)\s+[ =<>a-zA-Z0-9\-\._]+$/.test( command ) ) {
      var tokens = command.split( /\s+/ );

      if ( /^\s*(i|invoices)\s+(p|print)\s*$/.test( command ) ) {
        console.log( Config.invPrintMsg );
        var invoices = shell.env.connections[shell.env.connectionString()].invoices_local;
     
        var header = 'pollenware_invoice_id,';
        for ( var c in Config.invColumns ) {
          header = header + Config.invColumns[c] + ',';
        }
        shell.log( header.replace( /,$/, '' ) );
        var row = '';
        for ( var i in invoices ) {
          row = i + ',';
          for ( var c in Config.invColumns ) {
            row = row + invoices[i][Config.invColumns[c]] + ',';
          }
          shell.log( row.replace( /,$/, '' ) );
        }
      }
      else if ( /^\s*(i|invoices)\s+(c|clear)\s*$/.test( command ) ) {
        console.log( Config.invClearMsg );
        shell.env.connections[shell.env.connectionString()].invoices_local = {};
        delete shell.env.connections[shell.env.connectionString()].invoicePlaceholder;
      }
      else {
        tokens.shift();
        var query = tokens.join( ' ' );
        library.invoice.get( connectionId, connection, query );
      }
    }

    // no query
    else if ( /^\s*(i|invoices)\s*$/.test( command ) ) {
      library.invoice.get( connectionId, connection );
    }

    else {
      console.log( Config.notFoundMsg );
    }
  }

  //
  // javascript -j 
  //
  else if ( /^\s*(j|javascript)\s+.+$/.test( command ) ) {
    var tokens = command.split( /\s+/ );
    tokens.shift();
    var code = tokens.join( ' ' );
    try { shell.log( eval ( code ) ) ; } 
    catch ( err ) {
      console.log( err );
    }
  }

  //
  // LOCK - L
  //
  else if ( /^\s*(L|LOCK)\s+\d+\s+\d+\s+\d+\s+[012]\s*$/.test( command ) ) {

    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    command = command.split( /\s+/ );
    var eventId      = command[1] && command[1].trim();
    var supplierId   = command[2] && command[2].trim();
    var basketId     = command[3] && command[3].trim();
    var statusCode   = command[4] && command[4].trim();
    library.event.lockBasket( connectionId, connection, eventId, supplierId, basketId, statusCode );
    shell.prompt.show();
    return;
  }

  //
  // log - l
  //
  else if ( /^\s*(l|log)\s*([c|w]|(clear|write))*$/.test( command ) ) {
    var tokens = command.split( /\s+/ );
    var instruction = tokens[1];
    var logText = JSON.stringify( shell.logData, null, 2 ) + ',';
    if ( instruction == 'c' || instruction == 'clear' ) {
      shell.logData = [];
      console.log( Config.logClearMsg );
    }
    else if ( instruction == 'w' || instruction == 'write' ) {
      var logFile = Config.logFile || ( process.argv[1].split( '/' ).pop() + '.log' );
      console.log( Config.logWriteMsg + ' ' + logFile + '...' );
      try {
        Util.appendFile( logFile,  logText );
      }
      catch ( err ) {
        console.log( err );
        self.prompt.show();
      }
    }
    else {
      console.log( logText );
    } 
  }

  //
  // offer - o
  //
  else if ( /^\s*(o|offer)\s+\d+\s+\d+\s+\d+\s*$/.test( command ) ) {

    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    command = command.split( /\s+/ );
    var eventId      = command[1] && command[1].trim();
    var basket       = command[2] && command[2].trim();
    var bps          = command[3] && command[3].trim();
    if ( !connection.events ) {
      console.log( Config.noEventsMsg );
      shell.prompt.show();
      return;
    }
    else if ( connection.user_type == Config.BUYER ) {
      console.log( Config.errorPrefix + ' - ' + Config.errorBuyerBid );
      shell.prompt.show();
      return;
    }
    else if ( !connection.events[eventId] ) {
      console.log( Config.notFoundMsg );
    }
    else if ( eventId && basket && bps ) {
      if ( connection.events[eventId] ) {
        var baskets = connection.events[eventId].event_participations;
        var found = false;
        var thisBasket = {};
        for ( b in baskets ) {
          if ( baskets[b].id == basket ) {
            found = true;
            thisBasket = baskets[b];
          }
        }
        if ( found ) {
          thisBasket.offer = bps;
          thisBasket.event = eventId;
          library.event.placeOffer( connectionId, connection, thisBasket );
        }
        else {
          console.log( Config.notFoundMsg );
          shell.prompt.show();
        }
      }
      else if ( !connection.events[eventId] ) {
        console.log( Config.notFoundMsg );
      }
    }
    else {
      console.log( Config.notFoundMsg );
    }
  }

  //
  // quit - q
  //
  else if ( /^\s*(q|quit)\s*$/.test( command ) ) {
    console.log( Config.exitMsg );
    process.exit( 0 );
  }

  //
  // repl - r 
  //
  else if ( /^\s*(r|repl)\s*$/.test( command ) ) {
    var server = net.createServer( function ( socket ) {
      shell.replConnections += 1;
      repl.start( Config.replPrompt, socket, null, false ).context.shell = shell;
    });
    server.listen( Config.replPort || 5100 )
    server.on( 'error', function ( e ) {
      console.log(e);
      shell.prompt.show();
    });
    console.log( Config.replUseMsg + ' ' + Config.replAddress + ' ' + Config.replPort );
  }

  //
  // toggle - t
  //
  else if ( /^\s*(t|toggle)\s+[ \d\|ei]+$/i.test( command ) ) {
    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    if ( connection ) {

      for ( var e in connection.events ) {
        if (  connection.events[e].is_live || connection.events[e].is_buyer_live ) {
          console.log( Config.errorLiveEventMsg );
          shell.prompt.show();
          return;
        }
      }

      var invoiceIds = command.split( /\s+/ );
      invoiceIds.shift();
      var keep = [];
      var exclude = [];
      for ( var i in invoiceIds ) {
        var iId = invoiceIds[i];
        if (! /^[ieEI][\|\d]+$/.test( iId ) ) {
          console.log( Config.errorAmbiguous + ': ' + iId );
          continue;
        }
        else {
          if ( /^i/i.test( iId ) ) {
            iId = iId.replace(/[iI]/, '');
            keep.push( iId );
          }
          else if ( /^e/i.test( iId ) ) {
            iId = iId.replace(/[eE]/, '');
            exclude.push( iId );
          }
          else {
            console.log( Config.notFoundMsg );
            shell.prompt.show();
            return;
          }
        }
      }
      library.invoice.toggle( connectionId, connection, keep, exclude );
    }
    else {
      console.log( Config.notFoundMsg );
      shell.prompt.show();
    }
  }

  //
  // unrecognized command
  //
  else {
    console.log( Config.notFoundMsg );
  }

  shell.prompt.show();

};
