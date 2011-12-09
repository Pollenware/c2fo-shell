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

  var failedHandler = function ( promptContent, failed ) {
    try {
      if ( failed ) {
        console.error( failed );
      }
      if ( promptContent )  {
        prompt.content = function () { return promptContent + MCat.promptPoint; };
      }
      prompt.show();
    }
    catch( failed ) {
      console.error( MCat.failedPrefix + failed );
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
    catch( failed ) {
      console.error( MCat.failedPrefix + failed );
      return;
    }
  };

  emitter.on(
    'completedCommand',  function ( prompt, shellMsg ) {
      successHandler( prompt,  shellMsg ); } ).on(

    'completedServiceCall',   function ( prompt, serviceMsg ) {
      successHandler( prompt,  serviceMsg ); } ).on(

    'debug', function ( msg ) {
      console.info( MCat.debugPrefix + msg );  }).on(

    'failedCommand', function ( failedMsg ) {
      process.nextTick( function () { failedHandler( null, MCat.failedPrefix   + ( failedMsg ||
        MCat.failedCommand ) ); } ); }).on(

    'failedJSONParse',    function ( prompt, failedMsg ) {
      process.nextTick( function () { failedHandler( prompt, MCat.failedPrefix + ( failedMsg ||
        MCat.failedJSONParse )); } ); }).on(

    'failedOCAPfailed',     function ( prompt, failedMsg ) {
      process.nextTick( function () { failedHandler( prompt, MCat.failedPrefix + ( failedMsg ||
        MCat.failedFail ) ); } ); }).on(

    'failedOCAPservice',  function ( prompt, failedMsg ) {
      process.nextTick( function () { failedHandler( prompt, MCat.failedPrefix + ( failedMsg ||
        MCat.failedOCAPservice ) ); } ); }).on(

    'failedOCAPresponse', function ( prompt, failedMsg ) {
      process.nextTick( function () { failedHandler( prompt, MCat.failedPrefix + ( failedMsg ||
        MCat.failedOCAPresponse ) ); } );
    }
  );

  var library = new Library( MCat.agentString + version, successHandler, emitter, Config.pageSize );
  prompt.handleCommand = function ( command ) {

    // prior to auth we provide a shell with limited capabilities.
    Commands( env, emitter,
      Config, MCat,
      prompt, command,
      null  , library
    );
  };
  var env = new Env( version, function ( connectionId, pwd ) {library.auth.signIn( connectionId, pwd );}, successHandler );
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
        emitter.emit( 'completedCommand', cId );
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
      shell.env.context.user   = user;
      shell.env.context.emulating = connection.emulating;
      var payload;
      try {
        payload = JSON.parse( response.body ).payload;
      }
      catch( e ) {
        emitter.emit( 'failedJSONParse', e );
        return;
      }
      connection.lastActive    = new Date( payload.created );
      library.auth.getDetails( connectionId, connection, function () {
        library.event.getDetails(connectionId, connection, function () {
          emitter.emit( 'completedServiceCall', connectionId );
        });
      });
    }
    else {
      emitter.emit( 'failedCommand', MCat.failedConnect + connectionId );
      return;
    }
  }; 
}( this ) );

