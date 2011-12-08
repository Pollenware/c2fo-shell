#!/usr/bin/env node
          
(function() {

  var Config    = require( 'config/shell.js' ).Config,
      MCat      = require( 'message-catalog/shell.js' ).MCat,
      Env       = require( 'ocap/env.js' ).Env,
      events    = require( 'events' ),
      emitter   = new events.EventEmitter(),
      Library   = require( MCat.functions ).Library,
      net       = require( 'net' ),
      Prompt    = require( 'prompt.js' ).Prompt,
      repl      = require( 'repl' ),
      Connector = require( 'connector.js' ).Connector,
      Util      = require( 'util.js' ).Util,
      version   = '0.0.1';
  
  var prompt = new Prompt( {
    debug     : false,
    default   : function () { return MCat.promptPrefix + MCat.promptPoint; },
    exitMsg   : MCat.exit,
    helpBlurb : MCat.helpBlurb,
    title     : MCat.title,
    version   : version
  } );
  
  var failHandler = function ( promptContent, fail ) {
    try {
      if ( fail ) {
        console.error( fail );
      }
      if ( promptContent )  {
        prompt.content = function () { return promptContent + MCat.promptPoint; };
      }
      prompt.show();
    }
    catch( fail ) {
      console.error( MCat.failPrefix + fail );
      return;
    }
  };
 
  var serviceHandler = function ( promptContent, msg ) {
    try {
      if ( msg ) 
        console.log( msg );
      if ( promptContent ) 
        prompt.content = function () { return promptContent + MCat.promptPoint; };
      prompt.show();
    }
    catch( fail ) {
      console.error( MCat.failPrefix + fail );
      return;
    }
  };

  emitter.on(
    'commandComplete',  function ( prompt, shellMsg ) {
      serviceHandler( prompt,  shellMsg ); }).on(

    'commandFail', function ( failMsg ) {
      process.nextTick( function () { failHandler( null, MCat.failPrefix   + ( failMsg ||
        MCat.commandFail ) ); } ); }).on(

    'debug', function ( msg ) {
      console.info( MCat.debugPrefix + msg );  }).on(

    'failJSONParse',    function ( prompt, failMsg ) {
      process.nextTick( function () { failHandler( prompt, MCat.failPrefix + ( failMsg ||
        MCat.failJSONParse )); } ); }).on(

    'failOCAPfail',     function ( prompt, failMsg ) {
      process.nextTick( function () { failHandler( prompt, MCat.failPrefix + ( failMsg ||
        MCat.failFail ) ); } ); }).on(

    'failOCAPservice',  function ( prompt, failMsg ) {
      process.nextTick( function () { failHandler( prompt, MCat.failPrefix + ( failMsg ||
        MCat.failOCAPservice ) ); } ); }).on(

    'failOCAPresponse', function ( prompt, failMsg ) {
      process.nextTick( function () { failHandler( prompt, MCat.failPrefix + ( failMsg ||
        MCat.failOCAPresponse ) ); } ); }).on(

    'serviceCallComplete',   function ( prompt, serviceMsg ) {
      serviceHandler( prompt,  serviceMsg ); 
    }

  );

  var library = new Library( MCat.agentString + version, serviceHandler, emitter, Config.pageSize );
  
  var authHandler = function ( connectionId, pwd ) {
    library.auth.signIn( connectionId, pwd );
  };

  var env = new Env( version, authHandler, serviceHandler );

  prompt.isDebugging = env.context.debug;
  var libModules = ['net', 'auth', 'event', 'invoice'];
  for ( var m in libModules ) {
    library[libModules[m]].isDebugging = env.context.debug;
  }
  
  library.auth.access = function ( connectionId, pwd, user, instance, response ) {
    if ( response ) {
      if ( library.auth.isDebugging )
        emitter.emit( 'debug', instance + MCat.s + MCat.sessionGrant );
      var connection;
      var cachedConnectionHandler = function ( cId, c ) {
        connectionId = cId;
        connection = c;
        var tokens = cId.split( '@' );
        connection.user      = tokens[0].trim();
        connection.instance  = tokens[1].trim();
        connection.emulating = ( tokens[2] && tokens[2].trim() );
        emitter.emit( 'commandComplete', cId );
      };
      var shell = new Connector( env, prompt, library, cachedConnectionHandler );
      shell.prompt.handleCommand = function ( command ) {

      //
      // ** these commands don't require a connection
      //

        //
        // <user>@<instance> (connect)
        //
        if ( /^\s*[A-Za-z0-9\-_]+\@.+[\@A-Za-z0-9\-_]*\s*$/.test( command ) ) {
          shell.connect( command, Config.sessionTimeout );
          return;
        }
      
        //
        // help - h
        //
        else if ( /^\s*(h|help)\s*$/.test( command ) ) {
          MCat.help( prompt );
          return;
        }
      
        //
        // javascript -j 
        //
        else if ( /^\s*(j|javascript)\s+.+$/.test( command ) ) {
          var tokens = command.split( /\s+/ );
          tokens.shift();
          var code = tokens.join( ' ' );
          try {
            shell.log( eval ( code ) ) ;
            emitter.emit( 'commandComplete' );
          } 
          catch ( e ) {
            emitter.emit( 'commandFail', e );
          }
        }
      
        //
        // quit - q
        //
        else if ( /^\s*(q|quit)\s*$/.test( command ) ) {
          if ( env.context.debug ) 
            emitter.emit( 'debug', MCat.exit );
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
          server.listen( Config.replPort || 5100 )
          server.on( 'error', function ( e ) {
            emitter.emit( 'commandFail', e );
          });
          console.info( MCat.replUse + MCat.replAddress + MCat.replPort );
        }
      
        // 
        // no connections
        //
        else if ( !shell.env.hasConnections() ) {
          shell.prompt.show();
          return;
        }
      
      //
      // ** these commands require a connection
      //
              
        else { 
      
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
              emitter.emit( 'commandFail', MCat.notFound );
            }
          }
      
          // 
          // award - a 
          //
          else if ( /^\s*(a|award)\s+[\-0-9]+\s*$/.test( command ) ) {
            command = command.split( /\s+/ );
            var eventDate = command[1] && command[1].trim();
            if ( env.context.debug ) 
              emitter.emit( 'debug', MCat.award + eventDate );
            if ( connection.user_type == MCat.SUPPLIER ) {
              library.event.getAward( connectionId, connection, eventDate );
            }
            else
              emitter.emit( 'commandFail', MCat.failNoBuyer );
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
                  emitter.emit( 'commandComplete' );
                }
                else {
                  emitter.emit( 'commandFail', MCat.notFound );
                }
              }
              catch ( err ) {
                try {
                  if ( connection.events[eventId].event_participations[id] ) {
                    shell.log( connection.events[eventId].event_participations[id] );
                    emitter.emit( 'commandComplete' );
                  }
                  else {
                    emitter.emit( 'commandFail', MCat.notFound );
                  }
                }
                catch ( err ) {
                  emitter.emit( 'commandFail', MCat.notFound );
                }
              }
            }
            else if ( eventId ) {
              try {
                if ( connection.events[eventId].baskets ) {
                  for ( b in connection.events[eventId].baskets ) {
                    shell.log( connection.events[eventId].baskets[b] );
                  }
                  emitter.emit( 'commandComplete' );
                }
                else if ( connection.events[eventId].event_participations ) {
                  for ( e in connection.events[eventId].event_participations ) {
                    shell.log( connection.events[eventId].event_participations[e] );
                  }
                  emitter.emit( 'commandComplete' );
                }
                else {
                  emitter.emit( 'commandFail', MCat.noBaskets );
                }
              }
              catch ( err ) {
                emitter.emit( 'commandFail', MCat.notFound );
              }
            }
          }
      
          //
          // connections - c
          //
          else if ( /^\s*(c|connections)[ \@a-zA-Z0-9\-_]*$/.test( command ) ) {
       
            var connections  = shell.env.connections;
            var found = false;
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
                emitter.emit( 'commandFail', MCat.notFound );
              }
            }
            else if ( /^\s*(c|connections)\s*$/.test( command) ) {
              found = true;
              shell.log( shell.env.listConnections() );
            }
            if ( !found ) {
              emitter.emit( 'commandFail', MCat.notFound );
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
                    shell.prompt.content = function () { return MCat.promptPrefix + MCat.promptPoint};
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
                  shell.prompt.content = function () { return MCat.promptPrefix + MCat.promptPoint};
                  shell.prompt.set() ;
                }
              }
            }
            if ( !found ) {
              emitter.emit( 'commandFail', MCat.notFound );
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
              emitter.emit( 'commandComplete' );
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
                  cookie = cookie && ( cookie.substr( 0,4 ) + MCat.e + cookie.substr( -5,5 ) );
                      suppressDetail.sessionCookie = cookie;
                }
                else {
                  suppressDetail[c] = sanitizedConnection[c];
                }
              }
              shell.log( suppressDetail );
              emitter.emit( 'commandComplete' );
            }
            else {
              emitter.emit( 'commandFail', MCat.notFound );
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
                  emitter.emit( 'debug', MCat.invPrint );

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
                emitter.emit( 'commandComplete' );
              }
              else if ( /^\s*(i|invoices)\s+(c|clear)\s*$/.test( command ) ) {
                if ( env.context.debug )
                  emitter.emit( 'debug', MCat.invClear );
                shell.env.connections[shell.env.connectionString()].invoices_local = {};
                delete shell.env.connections[shell.env.connectionString()].invoicePlaceholder;
                emitter.emit( 'commandComplete' );
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
              emitter.emit( 'commandFail', MCat.notFound );
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
                emitter.emit( 'debug', MCat.logClear );
            }
            else if ( instruction == 'w' || instruction == 'write' ) {
              var logFile = MCat.logFile || ( process.argv[1].split( '/' ).pop() + '.log' );
              if ( env.context.debug )
                emitter.emit( 'debug', MCat.logWrite + ' ' + logFile + MCat.e );
              try {
                Util.appendFile( logFile,  logText );
                emitter.emit( 'commandComplete' );
              }
              catch ( e ) {
                emitter.emit( 'commandFail', e );
              }
            }
            else {
              console.log( logText );
              emitter.emit( 'commandComplete' );
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
              if ( library.event.timers[connection.instance] && library.event.timers[connection.instance][requestedEvent] ) {
                if ( env.context.debug )
                  emitter.emit( 'debug', MCat.monitorOff + ' ' + requestedEvent );
                clearInterval( library.event.timers[connection.instance][requestedEvent] );
                delete library.event.timers[connection.instance][requestedEvent];
                emitter.emit( 'commandComplete' );
              }
              else {
                emitter.emit( 'commandFail', MCat.failEventNotFound + ': '  + requestedEvent );
              }
            }
            else {
              if ( library.event.timers[connection.instance] && library.event.timers[connection.instance][requestedEvent] ) {
                if ( env.context.debug )
                  emitter.emit( 'debug', requestedEvent + MCat.alreadyMonitored );
              }
              else {
                var sanitizedConnection = Util.sanitizeConnection( connection );
      
                if ( sanitizedConnection && sanitizedConnection.events) {
                  var eventFound = 0;
                  if ( env.context.debug )
                    emitter.emit( 'debug', MCat.monitorSearch + requestedEvent + MCat.e );
                  for ( var e in sanitizedConnection.events ) {
                    if ( requestedEvent == e ) {
                      eventFound = e
                    }
                  }
                  if ( eventFound ) {
                    if ( env.context.debug )
                      emitter.emit( 'debug', MCat.monitorOn + eventFound );
                    var monitorEvent = function () {                    
                      var displayMsg = '', 
                          monitorMsg;
                      thisEvent = connection.events[eventFound];
                      if ( thisEvent ) {
                        if ( thisEvent.is_active && thisEvent.is_live ) 
                          monitorMsg = MCat.monitorLive;
                        else if ( thisEvent.is_active && thisEvent.is_buyer_live ) 
                          monitorMsg = MCat.monitorBlive;
                        else
                          monitorMsg = MCat.monitorSched;
      
                        // Suppliers see current offers and statuses
                        if ( connection.user_type == MCat.SUPPLIER ) {
                          displayMsg = displayMsg + connection.instance + MCat.s + monitorMsg + eventFound;
                          for (  var b in thisEvent.event_participations ) {
                             var basket = thisEvent.event_participations[b];
                             if ( basket.pre_bid_amount > 0 )
                               displayMsg = displayMsg + "\n" + connection.instance + MCat.s + basket.title + MCat.eventPreLabel +
                                 basket.pre_bid_amount;
                             if ( basket.bid_amount && basket.bid_amount > 0 )
                                   displayMsg = displayMsg + "\n" + connection.instance + MCat.s + basket.title + MCat.eventOfferLabel + 
                                 basket.bid_amount + MCat.eventStatusLabel +  MCat.eventStatuses[basket.bid_status];
                          }
                        }

                        // Buyers see cash pool only
                        else if ( connection.user_type == MCat.BUYER ) {
                          displayMsg = displayMsg + connection.instance + MCat.s + monitorMsg + eventFound + 
                            MCat.eventCashLabel + thisEvent.cash_pool;
                        }
                      }
                      else {
                        clearInterval( library.event.timers[connection.instance][eventFound] );
                        delete library.event.timers[connection.instance][eventFound];
                        displayMsg = displayMsg + "\n" + connection.instance + MCat.s + MCat.eventOver + MCat.e + eventFound;
                      }                                                   // overridding serviceHandler to not change prompt
                      library.event.getDetails( connectionId, connection, function () {
                        emitter.emit( 'commandComplete', null, displayMsg );
                      } );
                    };
                    library.event.timers[connection.instance] = library.event.timers[connection.instance] || {};
                    if ( ! library.event.timers[connection.instance][eventFound] ) {
                      monitorEvent();
                      library.event.timers[connection.instance][eventFound] = setInterval(
                        monitorEvent,
                        Config.monitorDelay
                      );
                    }
                  }
                  else {
                    emitter.emit( 'commandFail', MCat.failEventNotFound + requestedEvent );
                  }
                }
                else {
                  emitter.emit( 'commandFail', MCat.failNoEvents );
                }
              }
            }
            shell.prompt.show();
          }
      
          // 
          // offers - o (buyer syntax)
          //
          else if ( /^\s*(o|offers)\s+[0-9]+\s*$/.test( command ) ) {
            command = command.split( /\s+/ );
            var eventId = command[1] && command[1].trim();
            var eventFound = false;
            for ( var e in connection.events ) {
              if ( eventId == e )
               eventFound = true; 
            }
            if ( !eventFound ) {
              emitter.emit( 'commandFail', MCat.failEventNotFound );
            }
            else {
              if ( env.context.debug ) 
                emitter.emit( 'debug', MCat.offers + eventId );
              if ( connection.user_type == MCat.BUYER ) 
                library.event.getOffers( connectionId, connection, eventId );
              else
                emitter.emit( 'commandFail', MCat.failNoSupplier );
            }
          }
      
          //
          // offer - o (supplier syntax)
          //
          else if ( /^\s*(o|offer)\s+\d+\s+\d+\s+\d+\s*$/.test( command ) ) {
      
            command = command.split( /\s+/ );
            var eventId      = command[1] && command[1].trim();
            var basket       = command[2] && command[2].trim();
            var bps          = command[3] && command[3].trim();
            if ( !connection.events ) {
              emitter.emit( 'commandFail', MCat.failNoEvents );
              return;
            }
            else if ( connection.user_type == MCat.BUYER ) {
              emitter.emit( 'commandFail', MCat.failPrefix + MCat.s + MCat.failBuyerBid );
              return;
            }
            else if ( !connection.events[eventId] ) {
              emitter.emit( 'commandFail', MCat.notFound );
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
                  emitter.emit( 'commandFail', MCat.notFound );
                }
              }
              else if ( !connection.events[eventId] ) {
                emitter.emit( 'commandFail', MCat.notFound );
              }
            }
            else {
              emitter.emit( 'commandFail', MCat.notFound );
            }
          }
      
          // 
          // pre-offers - p
          //
          else if ( /^\s*(p|pre-offers)\s+[0-9]+\s*$/.test( command ) ) {
            command = command.split( /\s+/ );
            var eventId = command[1] && command[1].trim();
            var eventFound = false;
            for ( var e in connection.events ) {
              if ( eventId == e )
               eventFound = true; 
            }
            if ( !eventFound ) {
              emitter.emit( 'commandFail', MCat.failEventNotFound );
            }
            else {
              if ( env.context.debug ) 
                emitter.emit( 'debug', MCat.preOffers + eventId );
              if ( connection.user_type == MCat.BUYER ) 
                library.event.getPreOffers( connectionId, connection, eventId );
              else
                emitter.emit( 'commandFail', MCat.failNoSupplier );
            }
          }
      
          //
          // toggle - t
          //
          else if ( /^\s*(t|toggle)\s+[ \d\|ei]+$/i.test( command ) ) {
      
            if ( connection ) {
      
              for ( var e in connection.events ) {
                if (  connection.events[e].is_live || connection.events[e].is_buyer_live ) {
                  emitter.emit( 'commandFail', MCat.failLiveEvent );
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
                  emitter.emit( 'commandFail', MCat.failAmbiguous + iId );
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
                    emitter.emit( 'commandFail', MCat.notFound );
                    return;
                  }
                }
              }
              library.invoice.toggle( connectionId, connection, keep, exclude );
            }
            else {
              emitter.emit( 'commandFail', MCat.notFound );
            }
          }
      
          //
          // unrecognized command
          //
          else {
            emitter.emit( 'commandFail', MCat.notFound );
          }
        }
      };
      shell.env.connections[connectionId] = shell.env.connections[connectionId] || {};
      var connection = shell.env.connections[connectionId];
      connection.id            = library.connectionCount++;
      connection.instance      = instance;
      connection.lastAction    = MCat.successSignin;
      connection.password      = pwd;
      connection.sessionCookie = response.headers['set-cookie'][0];
      connection.user          = user;
      var payload;
      try {
        payload = JSON.parse( response.body ).payload;
      }
      catch( e ) {
        emitter.emit( 'failJSONParse', e );
        return;
      }
      connection.lastActive    = new Date( payload.created );
      library.auth.getDetails( connectionId, connection, function () {
        library.event.getDetails(connectionId, connection, function () {
          emitter.emit( 'serviceCallComplete', connectionId );
        });
      });
    }
    else {
      emitter.emit( 'commandFail', MCat.failConnect + connectionId );
      return;
    }
  };
}(this));
