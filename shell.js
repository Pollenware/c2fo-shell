#!/usr/bin/env node
          
(function() {

  var Commands  = require( 'commands.js' ).Commands,
      Config    = require( 'config/shell.js' ).Config,
      MCat      = require( 'message-catalog/shell.js' ).MCat,
      Env       = require( 'ocap/env.js' ).Env,
      events    = require( 'events' ),
      emitter   = new events.EventEmitter(),
      Library   = require( MCat.functions ).Library,
      Prompt    = require( 'prompt.js' ).Prompt,
      Connector = require( 'connector.js' ).Connector,
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
 
  var successHandler = function ( promptContent, msg ) {
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
      successHandler( prompt,  shellMsg ); }).on(

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
      successHandler( prompt,  serviceMsg ); 
    }

  );

  var identity = MCat.agentString + version;
  var library = new Library( identity, successHandler, emitter, Config.pageSize );
  var authHandler = function ( connectionId, pwd ) {
    library.auth.signIn( connectionId, pwd );
  };
  prompt.handleCommand = function ( command ) {
    Commands( env, emitter,
      Config, MCat,
      prompt, command,
      null, library
    );
  };
  
  var env = new Env( version, authHandler, successHandler );
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
        Commands( env, emitter,
          Config, MCat,
          prompt, command,
          shell, library,
          connectionId, connection
        );
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
}( this ) );

