#!/usr/bin/env node

var MCat      = require( 'message-catalog/shell.js' ).MCat,
    Env       = require( 'ocap/env.js' ).Env,
    Library   = require( MCat.functions ).Library;
    net       = require( 'net' ),
    Prompt    = require( 'prompt.js' ).Prompt,
    repl      = require( 'repl' ),
    Connector = require( 'connector.js' ).Connector,
    Util      = require( 'util.js' ).Util,
    version   = '0.0.1';

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
// start
//
var shell = new Connector( env, prompt, library );

// 
// add to connection list only after 
// signin attempt fully authenticated
//
library.auth.signInCallback = function ( connectionId, pwd, user, instance, response, error ) {
  if ( error ) {
    console.error( MCat.errorConnect + ': ' + connectionId );
    finishHandler( MCat.promptPrefix, error );
    return;
  }
  else {
    if ( response ) {
      if ( library.auth.isDebugging ) { 
        console.info( MCat.debugPrefix + ' - ' + instance + ' - ' + MCat.sessionGrantMsg );
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
      console.error( MCat.errorConnect + ': ' + connectionId );
      finishHandler( MCat.promptPrefix );
      return;
    }
  }
};

shell.prompt.handleCommand = function ( command ) {

  //
  // ** these commands don't require a connection
  //
        
  //
  // <user>@<instance> (connect)
  //
  if ( /^\s*[A-Za-z0-9\-_]+\@.+[\@A-Za-z0-9\-_]*\s*$/.test( command ) ) {
    shell.connect( command, MCat.sessionTimeout );
    return;
  }

  //
  // help - h
  //
  else if ( /^\s*(h|help)\s*$/.test( command ) ) {
    MCat.helpMsg( prompt );
    return;
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
      console.error( err );
    }
  }

  //
  // quit - q
  //
  else if ( /^\s*(q|quit)\s*$/.test( command ) ) {
    if ( env.context.debug ) 
      console.info( MCat.exitMsg );
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
      console.error( e );
      shell.prompt.show();
    });
    console.log( MCat.replUseMsg + ' ' + MCat.replAddress + ' ' + MCat.replPort );
  }

  // 
  // no connections error
  //
  else if ( !shell.env.hasConnections() ) {
    shell.prompt.show();
    return;
  }

  //
  // ** these commands require a connection
  //
        
  else { 

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
        console.error( MCat.notFoundMsg );
        shell.prompt.show();
      }
    }

    //
    // baskets - b 
    //
    else if ( /^\s*(b|baskets)\s+\d+\s*\d*\s*$/.test( command ) ) {

      command     = command.split(/\s+/);
      var eventId = command[1] && command[1].trim();
      var id      = command[2] && command[2].trim();
      if ( eventId && id ) {
        try {
          if ( connection.events[eventId].baskets[id] ) {
            shell.log( connection.events[eventId].baskets[id] );
          }
          else {
            console.error( MCat.notFoundMsg );
          }
        }
        catch ( err ) {
          try {
            if ( connection.events[eventId].event_participations[id] ) {
              shell.log( connection.events[eventId].event_participations[id] );
            }
            else {
              console.error( MCat.notFoundMsg );
            }
          }
          catch ( err ) {
            console.error( MCat.notFoundMsg );
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
          else if ( connection.events[eventId].event_participations ) {
            for ( e in connection.events[eventId].event_participations ) {
              shell.log( connection.events[eventId].event_participations[e] );
            }
          }
          else {
            console.error( MCat.noBasketsMsg );
          }
        }
        catch ( err ) {
          console.error( MCat.notFoundMsg );
        }
      }
    }

    //
    // connections - c
    //
    else if ( /^\s*(c|connections)[ \@a-zA-Z0-9\-_]*$/.test( command ) ) {
 
      var connections  = shell.env.connections;
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
          console.error( MCat.notFoundMsg );
        }
      }
      else if ( /^\s*(c|connections)\s*$/.test( command) ) {
        found = true;
        shell.log( shell.env.listConnections() );
      }
      if ( !found ) {
        console.error( MCat.notFoundMsg );
      }
      shell.prompt.show();
      return;
    }

    //
    // delete connection - d
    //
    else if ( /^\s*(d|delete)\s+.+$/.test( command ) ) {

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
        console.error( MCat.notFoundMsg );
      }
      shell.prompt.show();
      return;
    }

    //
    // environment - e 
    //
    else if ( /^\s*(e|environment)[ a-zA-Z0-9\-_]*$/.test( command ) ) {

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
        console.error( MCat.notFoundMsg );
      }
    }

    //
    // invoices - i 
    //
    else if ( /^\s*(i|invoices)[ =<>a-zA-Z0-9\-\._]*$/.test( command ) ) {

      // has query
      if ( /^\s*(i|invoices)\s+[ =<>a-zA-Z0-9\-\._]+$/.test( command ) ) {
        var tokens = command.split( /\s+/ );
  
        if ( /^\s*(i|invoices)\s+(p|print)\s*$/.test( command ) ) {
          if ( env.context.debug )
            console.info( MCat.debugPrefix + ' - ' + MCat.invPrintMsg );
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
          if ( env.context.debug )
            console.info( MCat.debugPrefix + ' - ' + MCat.invClearMsg );
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
        console.error( MCat.notFoundMsg );
      }
    }

    //
    // LOCK - L
    //
    else if ( /^\s*(L|LOCK)\s+\d+\s+\d+\s+\d+\s+[012]\s*$/.test( command ) ) {

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
        if ( env.context.debug )
          console.info( MCat.logClearMsg );
      }
      else if ( instruction == 'w' || instruction == 'write' ) {
        var logFile = MCat.logFile || ( process.argv[1].split( '/' ).pop() + '.log' );
        if ( env.context.debug )
          console.info( MCat.logWriteMsg + ' ' + logFile + '...' );
        try {
          Util.appendFile( logFile,  logText );
        }
        catch ( err ) {
          console.error( err );
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
    else if ( /^\s*(m|monitor)\s*[0-9]+\s*(off)*$/.test( command ) ) {

      var c = command.split( /\s+/ );
      var requestedEvent = c[1].trim();
      var turnOff = c[2] && c[2].trim();

      if ( turnOff == 'off' ) {
        if ( library.event.timers[requestedEvent] ) {
          if ( env.context.debug )
            console.info( MCat.monitorOffMsg + ' '  + requestedEvent );
          clearInterval( library.event.timers[requestedEvent] );
          delete library.event.timers[requestedEvent];
        }
        else {
          console.error( MCat.errorEventNotFound + ': '  + requestedEvent );
        }
      }
      else {
        if ( library.event.timers[requestedEvent] ) {
          if ( env.context.debug )
            console.info( requestedEvent + ' ' + MCat.nowMonitoredMsg );
        }
        else {
          var sanitizedConnection = Util.sanitizeConnection( connection );

          if ( sanitizedConnection && sanitizedConnection.events) {
            var eventFound = 0;
            if ( env.context.debug )
              console.info( MCat.monitorSearchMsg + requestedEvent + '...' );
            for ( var e in sanitizedConnection.events ) {
              if ( requestedEvent == e ) {
                eventFound = e
              }
            }
            if ( eventFound ) {
              if ( env.context.debug )
                console.info( MCat.monitorOnMsg + ' '  + eventFound );
              var monitorEvent = function () {                      // finishHandler override
                library.event.getDetails( connectionId, connection, function ( promptContent, msg ) {
                  if ( msg )
                    console.log( msg );
                  prompt.show();
                } );
                var monitorMsg;
                thisEvent = connection.events[eventFound];
                if ( thisEvent.is_active && thisEvent.is_live ) 
                  monitorMsg = MCat.monitorLiveMsg;
                else if ( thisEvent.is_active && thisEvent.is_buyer_live ) 
                  monitorMsg = MCat.monitorBliveMsg;
                else
                  monitorMsg = MCat.monitorSchedMsg;
                  
                console.log( "\n" + connection.instance + ' - ' + monitorMsg + ' #' + eventFound + ': ' + thisEvent.cash_pool );
              };
              monitorEvent();
              library.event.timers[eventFound] = setInterval(
                monitorEvent,
                MCat.monitorDelay
             );
            }
            else {
              console.error( MCat.errorEventNotFound + ': ' + requestedEvent );
            }
          }
          else {
            console.error( MCat.errorNoEventsMsg );
          }
        }
      }
      shell.prompt.show();
    }

    //
    // offer - o
    //
    else if ( /^\s*(o|offer)\s+\d+\s+\d+\s+\d+\s*$/.test( command ) ) {

      command = command.split( /\s+/ );
      var eventId      = command[1] && command[1].trim();
      var basket       = command[2] && command[2].trim();
      var bps          = command[3] && command[3].trim();
      if ( !connection.events ) {
        console.error( MCat.errorNoEventsMsg );
        shell.prompt.show();
        return;
      }
      else if ( connection.user_type == MCat.BUYER ) {
        console.error( MCat.errorPrefix + ' - ' + MCat.errorBuyerBid );
        shell.prompt.show();
        return;
      }
      else if ( !connection.events[eventId] ) {
        console.error( MCat.notFoundMsg );
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
            console.error( MCat.notFoundMsg );
            shell.prompt.show();
          }
        }
        else if ( !connection.events[eventId] ) {
          console.error( MCat.notFoundMsg );
        }
      }
      else {
        console.error( MCat.notFoundMsg );
      }
    }

    //
    // toggle - t
    //
    else if ( /^\s*(t|toggle)\s+[ \d\|ei]+$/i.test( command ) ) {

      if ( connection ) {

        for ( var e in connection.events ) {
          if (  connection.events[e].is_live || connection.events[e].is_buyer_live ) {
            console.error( MCat.errorLiveEventMsg );
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
            console.error( MCat.errorAmbiguous + ': ' + iId );
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
              console.error( MCat.notFoundMsg );
              shell.prompt.show();
              return;
            }
          }
        }
        library.invoice.toggle( connectionId, connection, keep, exclude );
      }
      else {
        console.error( MCat.notFoundMsg );
        shell.prompt.show();
      }
    }

    //
    // unrecognized command
    //
    else {
      console.error( MCat.notFoundMsg );
    }
  }

  shell.prompt.show();

};
