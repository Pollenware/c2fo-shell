#!/usr/bin/env node

var MCat   = require( 'message-catalog/shell.js' ).MCat,
    Env      = require( 'ocap/env' ).Env,
    Library  = require( MCat.functions ).Library;
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
  default   : function () { return MCat.promptPrefix + '> '; },
  exitMsg   : MCat.exitMsg,
  helpBlurb : MCat.helpBlurb,
  title     : MCat.title,
  version   : version
} );

//
// specify prompt to surface when every command is finished;
// optionally printing a message first
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
// load external routines
//
var library = new Library( MCat.agentString + version, finishHandler );

//
// handle command-line options and signing in 
//
var authHandler = function ( connectionId, pwd ) {
  library.auth.signIn( connectionId, pwd );
};
var errorHandler = function ( error ) {
  throw error;
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
// add to shell's connection list only after 
// signin attempt has fully authenticated
//
library.auth.signInCallback = function ( connectionId, pwd, user, instance, response, error ) {
  if ( error ) {
    console.log( MCat.errorConnect + ': ' + connectionId );
    finishHandler( MCat.promptPrefix, error );
    return;
  }
  else {
    if ( response ) {
      if ( library.auth.isDebugging ) { 
        console.log( MCat.debugPrefix + ' - ' + instance + ' - ' + MCat.sessionGrantMsg );
      }
      shell.env.connections[connectionId] = shell.env.connections[connectionId] || {};
      var connection           = shell.env.connections[connectionId];
      var payload              = JSON.parse( response.body ).payload;
      connection.id            = library.connectionCount++;
      connection.instance      = instance;
      connection.lastActive    = new Date( payload.created );
      connection.lastAction    = MCat.successSigninMsg;
      connection.password      = pwd;
      connection.sessionCookie = response.headers['set-cookie'][0];
      connection.user          = user;
      library.auth.getDetails( connectionId, connection, library.event.getDetails );
    }
    else {
      console.log( MCat.errorConnect + ': ' + connectionId );
      finishHandler( MCat.promptPrefix );
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
        shell.connect(c, MCat.sessionTimeout);
        return;
      }
    }
    if ( !found ) {
      console.log( MCat.notFoundMsg );
      shell.prompt.show();
    }
  }

  //
  // <user>@<instance> (connect)
  //
  else if ( /^\s*[A-Za-z0-9\-_]+\@.+[\@A-Za-z0-9\-_]*\s*$/.test( command ) ) {
    shell.connect( command, MCat.sessionTimeout );
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
          console.log( MCat.notFoundMsg );
        }
      }
      catch ( err ) {
        try {
          if ( connection.events[eventId].event_participations[id] ) {
            shell.log( connection.events[eventId].event_participations[id] );
          }
          else {
            console.log( MCat.notFoundMsg );
          }
        }
        catch ( err ) {
          console.log( MCat.notFoundMsg );
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
        console.log( MCat.notFoundMsg );
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
        console.log( MCat.notFoundMsg );
      }
    }
    else if ( /^\s*(c|connections)\s*$/.test( command) ) {
      found = true;
      shell.log( shell.env.listConnections() );
    }
    if ( !found ) {
      console.log( MCat.notFoundMsg );
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
            shell.prompt.content = function () { return MCat.promptPrefix + '> '};
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
          shell.prompt.content = function () { return MCat.promptPrefix + '> '};
          shell.prompt.set() ;
        }
      }
    }
    if ( !found ) {
      console.log( MCat.notFoundMsg );
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
      console.log( MCat.notFoundMsg );
    }
  }

  //
  // help - h
  //
  else if ( /^\s*(h|help)\s*$/.test( command ) ) {
    MCat.helpMsg( prompt );
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
        console.log( MCat.invPrintMsg );
        var invoices = shell.env.connections[shell.env.connectionString()].invoices_local;
     
        var header = 'pollenware_invoice_id,';
        for ( var c in MCat.invColumns ) {
          header = header + MCat.invColumns[c] + ',';
        }
        shell.log( header.replace( /,$/, '' ) );
        var row = '';
        for ( var i in invoices ) {
          row = i + ',';
          for ( var c in MCat.invColumns ) {
            row = row + invoices[i][MCat.invColumns[c]] + ',';
          }
          shell.log( row.replace( /,$/, '' ) );
        }
      }
      else if ( /^\s*(i|invoices)\s+(c|clear)\s*$/.test( command ) ) {
        console.log( MCat.invClearMsg );
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
      console.log( MCat.notFoundMsg );
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
      console.log( MCat.logClearMsg );
    }
    else if ( instruction == 'w' || instruction == 'write' ) {
      var logFile = MCat.logFile || ( process.argv[1].split( '/' ).pop() + '.log' );
      console.log( MCat.logWriteMsg + ' ' + logFile + '...' );
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
  // monitor - m 
  //
  else if ( /^\s*(m|monitor)\s+[0-9]+\s*$/.test( command ) ) {

    if ( !shell.env.hasConnections() ) {
      shell.prompt.show();
      return;
    }

    var sanitizedConnection = Util.sanitizeConnection( connection );

    if ( sanitizedConnection && sanitizedConnection.events) {
      var c = command.split( /\s+/ );
      var requestedEvent = c[1];
      var eventFound = 0;
      console.log( 'Searching for event ' + requestedEvent + '...' );
      for ( var e in sanitizedConnection.events ) {
        if ( requestedEvent == e ) {
          eventFound = e
        }
      }
      if ( eventFound ) {
        console.log( MCat.eventFound + ': '  + eventFound + ', interval...' );
        thisEvent = sanitizedConnection.events[eventFound];
        library.event.getDetails.timerId = setInterval(
          function () {
            library.event.getDetails( connectionId, connection);
            console.log( "\n*** " + thisEvent.event_id );
          },
          // MCat.monitorDelay
          5000
       );
      }
      else {
        console.log( MCat.errorEventNotFound + ': ' + requestedEvent );
      }
    }
    else {
      console.log('No events!');
    }
    shell.prompt.show();
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
      console.log( MCat.noEventsMsg );
      shell.prompt.show();
      return;
    }
    else if ( connection.user_type == MCat.BUYER ) {
      console.log( MCat.errorPrefix + ' - ' + MCat.errorBuyerBid );
      shell.prompt.show();
      return;
    }
    else if ( !connection.events[eventId] ) {
      console.log( MCat.notFoundMsg );
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
          console.log( MCat.notFoundMsg );
          shell.prompt.show();
        }
      }
      else if ( !connection.events[eventId] ) {
        console.log( MCat.notFoundMsg );
      }
    }
    else {
      console.log( MCat.notFoundMsg );
    }
  }

  //
  // quit - q
  //
  else if ( /^\s*(q|quit)\s*$/.test( command ) ) {
    console.log( MCat.exitMsg );
    process.exit( 0 );
  }

  //
  // repl - r 
  //
  else if ( /^\s*(r|repl)\s*$/.test( command ) ) {
    var server = net.createServer( function ( socket ) {
      shell.replConnections += 1;
      repl.start( MCat.replPrompt, socket, null, false ).context.shell = shell;
    });
    server.listen( MCat.replPort || 5100 )
    server.on( 'error', function ( e ) {
      console.log(e);
      shell.prompt.show();
    });
    console.log( MCat.replUseMsg + ' ' + MCat.replAddress + ' ' + MCat.replPort );
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
          console.log( MCat.errorLiveEventMsg );
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
          console.log( MCat.errorAmbiguous + ': ' + iId );
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
            console.log( MCat.notFoundMsg );
            shell.prompt.show();
            return;
          }
        }
      }
      library.invoice.toggle( connectionId, connection, keep, exclude );
    }
    else {
      console.log( MCat.notFoundMsg );
      shell.prompt.show();
    }
  }

  //
  // unrecognized command
  //
  else {
    console.log( MCat.notFoundMsg );
  }

  shell.prompt.show();

};
