#!/usr/bin/env node
var Config       = require( './config/shell.js' ).Config,
    CommandLine  = require( './lib/commandline.js' ).CommandLine,
    C2FO         = require( './lib/c2fo.js' ).C2FO,
    Util         = require( './lib/util.js' ).Util,
    net          = require( "net" ),
    repl         = require( "repl" ),
    version      = '0.0.1';

var cli  = new CommandLine( {
  defaultPrompt : function () { return Config.promptPrefix; },
  exitMsg       : Config.exitMsg,
  helpBlurb     : Config.helpBlurb,
  title         : Config.title,
  version       : version
} );

var c2fo = new C2FO( cli );

c2fo.cli.handleCommand = function ( command ) {

  //
  // [integer] (connection alias)
  //
  if ( /^\s*\d+\s*$/.test( command ) ) {
    var connections = c2fo.auth.connections;
    var found = false;
    for ( var c in connections ) {
      var connection = connections[ c ];
      if (connection.id == command) {
        found = true; 
        if ( connection.password )
          delete connection.password;
        c2fo.login(c, Config.sessionTimeout);
        return;
      }
    }
    if ( !found ) {
      console.log( Config.notFoundMsg );
      c2fo.cli.loop();
    }
  }

  //
  // <user>@<instance> (connect)
  //
  else if ( /^\s*[A-Za-z0-9\-_]+\@.+[\@A-Za-z0-9\-_]*\s*$/.test( command ) ) {
    c2fo.login( command, Config.sessionTimeout );
    return;
  }

  //
  // baskets - b 
  //
  else if ( /^\s*(b|baskets)\s+\d+\s*\d*\s*$/.test( command ) ) {

    if ( !c2fo.auth.hasConnections() ) {
      c2fo.cli.loop();
      return;
    }

    command = command.split(/\s+/);
    var connectionId = c2fo.auth.connectionString();
    var eventId      = command[1] && command[1].trim();
    var id           = command[2] && command[2].trim();
    if ( eventId && id ) {
      try {
        if ( c2fo.auth.connections[connectionId].events[eventId].baskets[id] ) {
          c2fo.log( c2fo.auth.connections[connectionId].events[eventId].baskets[id] );
        }
        else {
          console.log( Config.notFoundMsg );
        }
      }
      catch ( err ) {
        try {
          if ( c2fo.auth.connections[connectionId].events[eventId].event_participations[id] ) {
            c2fo.log( c2fo.auth.connections[connectionId].events[eventId].event_participations[id] );
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
        if ( c2fo.auth.connections[connectionId].events[eventId].baskets ) {
          for ( b in c2fo.auth.connections[connectionId].events[eventId].baskets ) {
            c2fo.log( c2fo.auth.connections[connectionId].events[eventId].baskets[b] );
          }
        }
        else {
          if ( c2fo.auth.connections[connectionId].events[eventId].event_participations ) {
            for ( e in c2fo.auth.connections[connectionId].events[eventId].event_participations ) {
              c2fo.log( c2fo.auth.connections[connectionId].events[eventId].event_participations[e] );
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
 
    if ( !c2fo.auth.hasConnections() ) {
      c2fo.cli.loop();
      return;
    }

    var connections  = c2fo.auth.connections;
    for ( var c in connections ) {
      connections[c] = Util.sanitizeConnection( connections[c] );
    }
    var found     = false;
    if (  /^\s*(c|connections)\s+[\@a-zA-Z0-9\-_]+$/.test( command ) ) {
      var tokens = command.split(/\s+/);
      var connectionId = tokens[1].trim();
      if ( /^\d+$/.test( connectionId ) ) {
        for ( var c in connections ) {
          if ( connections[c].id == connectionId ) {
            found = true;
            c2fo.log( c2fo.auth.connections[c] );
            break;
          }
        }
      }
      else {
        c2fo.log( connections[connectionId] );
        found = true;
      }
      if ( !found ) {
        console.log( Config.notFoundMsg );
      }
    }
    else if ( /^\s*(c|connections)\s*$/.test( command) ) {
      found = true;
      c2fo.log( c2fo.auth.listConnections() );
    }
    if ( !found ) {
      console.log( Config.notFoundMsg );
    }
    c2fo.cli.loop();
    return;
  }

  //
  // delete connection - d
  //
  else if ( /^\s*(d|delete)\s+.+$/.test( command ) ) {

    if ( !c2fo.auth.hasConnections() ) {
      c2fo.cli.loop();
      return;
    }

    command = command.split(/\s+/);
    var connectionId = command[1].trim();
    var found     = false;
    if ( /^\d+$/.test( connectionId ) ) {
      var connections = c2fo.auth.connections;
      for ( var c in connections ) {
        if (connections[c].id == connectionId) {
          found = true;
          delete c2fo.auth.connections[c];
          if ( c == c2fo.auth.connectionString() ) {
            c2fo.cli.prompt = function () { return Config.promptPrefix };
            c2fo.cli.setPrompt() ;
          }
        }
      } 
    }
    else {
      if ( c2fo.auth.connections[connectionId] ) {
        found = true;
        delete c2fo.auth.connections[connectionId];
        if ( c == c2fo.auth.connectionString() ) {
          c2fo.cli.prompt = function () { return Config.promptPrefix };
          c2fo.cli.setPrompt() ;
        }
      }
    }
    if ( !found ) {
      console.log( Config.notFoundMsg );
    }
    c2fo.cli.loop();
    return;
  }

  //
  // environment - e 
  //
  else if ( /^\s*(e|environment)[ a-zA-Z0-9\-_]*$/.test( command ) ) {

    if ( !c2fo.auth.hasConnections() ) {
      c2fo.cli.loop();
      return;
    }

    var login = c2fo.auth.connectionString();
    var connection = c2fo.auth.connections[login];
    connection = Util.sanitizeConnection( connection );
    if ( connection && /^\s*(e|environment)\s+[a-zA-Z0-9\-_]+$/.test( command ) ) {
      var c = command.split( /\s+/ );
      var attribute = c[1];
      c2fo.log( connection[attribute] );
    }
    else if ( connection && /^\s*(e|environment)\s*$/.test( command ) ) {
      connection = connection || {};
      var suppressDetail      =  {};
      suppressDetail.events   =  [];
      suppressDetail.invoices =  0;
      for ( c in connection ) {
        if ( c == 'events' ) {
          for ( eid in connection['events'] ) {
            suppressDetail.events.push(eid);
          }
        }
        else if ( c == 'invoices_local' ) {
          var totalInvoices = Object.keys( connection.invoices_local ).length;
          suppressDetail.invoices = totalInvoices;
        }
        else if ( c == 'sessionCookie' ) {
          var cookie = connection.sessionCookie.split( ' ' )[0];
          cookie = cookie && ( cookie.substr( 0,4 ) + '...' + cookie.substr( -5,5 ) );
          suppressDetail.sessionCookie = cookie;
        }
        else {
          suppressDetail[c] = connection[c];
        }
      }
      c2fo.log( suppressDetail );
    }
    else {
      console.log( Config.notFoundMsg );
    }
  }

  //
  // help - h
  //
  else if ( /^\s*(h|help)\s*$/.test( command ) ) {
    Config.helpMsg();
    c2fo.cli.loop();
    return;
  }

  //
  // invoices - i 
  //
  else if ( /^\s*(i|invoices)[ =<>a-zA-Z0-9\-\._]*$/.test( command ) ) {

    if ( !c2fo.auth.hasConnections() ) {
      c2fo.cli.loop();
      return;
    }

    // has query
    if ( /^\s*(i|invoices)\s+[ =<>a-zA-Z0-9\-\._]+$/.test( command ) ) {
      var tokens = command.split( /\s+/ );

      if ( /^\s*(i|invoices)\s+(p|print)\s*$/.test( command ) ) {
        console.log( Config.invPrintMsg );
        var invoices = c2fo.auth.connections[c2fo.auth.connectionString()].invoices_local;
     
        var header = 'pollenware_invoice_id,';
        for ( var c in Config.invColumns ) {
          header = header + Config.invColumns[c] + ',';
        }
        c2fo.log( header.replace( /,$/, '' ) );
        var row = '';
        for ( var i in invoices ) {
          row = i + ',';
          for ( var c in Config.invColumns ) {
            row = row + invoices[i][Config.invColumns[c]] + ',';
          }
          c2fo.log( row.replace( /,$/, '' ) );
        }
      }
      else if ( /^\s*(i|invoices)\s+(c|clear)\s*$/.test( command ) ) {
        console.log( Config.invClearMsg );
        c2fo.auth.connections[c2fo.auth.connectionString()].invoices_local = {};
        delete c2fo.auth.connections[c2fo.auth.connectionString()].invoicePlaceholder;
      }
      else {
        tokens.shift();
        var query = tokens.join( ' ' );
        c2fo.auth.getInvoices( c2fo.auth.connectionString(), query );
      }
    }

    // no query
    else if ( /^\s*(i|invoices)\s*$/.test( command ) ) {
      c2fo.auth.getInvoices( c2fo.auth.connectionString() );
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
    try { c2fo.log( eval ( code ) ) ; } 
    catch ( err ) {
      console.log( err );
    }
  }

  //
  // log - l
  //
  else if ( /^\s*(l|log)\s*([c|w]|(clear|write))*$/.test( command ) ) {
    var tokens = command.split( /\s+/ );
    var instruction = tokens[1];
    var logText = JSON.stringify( c2fo.logData, null, 2 ) + ',';
    if ( instruction == 'c' || instruction == 'clear' ) {
      c2fo.logData = [];
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
        self.cli.loop();
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

    if ( !c2fo.auth.hasConnections() ) {
      c2fo.cli.loop();
      return;
    }

    command = command.split( /\s+/ );
    var connectionId = c2fo.auth.connectionString();
    var connection   = c2fo.auth.connections[connectionId];
    var eventId      = command[1] && command[1].trim();
    var basket       = command[2] && command[2].trim();
    var bps          = command[3] && command[3].trim();
    if ( !connection.events ) {
      console.log( Config.noEventsMsg );
      c2fo.cli.loop();
      return;
    }
    else if ( connection.user_type == Config.BUYER ) {
      console.log( Config.errorPrefix + ' - ' + Config.errorBuyerBid );
      c2fo.cli.loop();
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
          c2fo.auth.placeOffer( connectionId, thisBasket );
        }
        else {
          console.log( Config.notFoundMsg );
          c2fo.cli.loop();
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
      c2fo.connections += 1;
      repl.start( Config.replPrompt, socket, null, false ).context.c2fo = c2fo;
    });
    server.listen( Config.replPort || 5100 )
    server.on( 'error', function ( e ) {
      console.log(e);
      c2fo.cli.loop();
    });
    console.log( Config.replUseMsg + ' ' + Config.replAddress + ' ' + Config.replPort );
  }

  //
  // toggle - t
  //
  else if ( /^\s*(t|toggle)\s+[ \d\|ei]+$/i.test( command ) ) {
    if ( !c2fo.auth.hasConnections() ) {
      c2fo.cli.loop();
      return;
    }

    var connectionId = c2fo.auth.connectionString();
    var connection   = c2fo.auth.connections[connectionId];

    if ( connection ) {

      for ( var e in connection.events ) {
        if (  connection.events[e].is_live || connection.events[e].is_buyer_live ) {
          console.log( Config.errorLiveEventMsg );
          c2fo.cli.loop();
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
            c2fo.cli.loop();
            return;
          }
        }
      }
      c2fo.auth.toggleInvoice( connectionId, keep, exclude );
    }
    else {
      console.log( Config.notFoundMsg );
      c2fo.cli.loop();
    }
  }

  //
  // unrecognized command
  //
  else {
    console.log( Config.notFoundMsg );
  }

  c2fo.cli.loop();

};
