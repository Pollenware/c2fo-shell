var Config = require( '../config/ocap.js' ).Config,
    Util   = require( './util.js' ).Util,
    request = require( './request.js' );

exports.OCAP = OCAP;

function OCAP( userAgent, isDebugging ) {

  var self = this;

  self.flipSupplier = function ( connectionId, connection, callback, basket ) {
    if ( connection ) { 
      if ( connection.user_type == Config.BUYER ) {
         // events/<eventId>/<supplierId>/basket/<basketId>/status
         // POST payload:
         //   {"details":[supplierId,"basket","<basketId>","status"],"supplierId":<supplierId>,"status":"<status>"}:
      }
      else if ( connection.user_type = Config.SUPPLIER ) {
        // suppliers don't have this feature
      }
    }
    else {
      console.warn( Config.errorPrefix + ' - ' + Config.errorNoConnection );
    }
  };

  self.getInvoices = function ( connectionId, connection, callback, query ) {
    if ( connection ) { 
      if ( connection.user_type == Config.BUYER ) {
        self.__getInvoices( connectionId, connection, callback, 'buyer'   , query );
      }
      else if ( connection.user_type = Config.SUPPLIER ) {
        self.__getInvoices( connectionId, connection, callback, 'supplier', query );
      }
    }
    else {
      console.warn( Config.errorPrefix + ' - ' + Config.errorNoConnection );
    }
  };

  self.getEventDetails = function ( connectionId, connection, callback, query ) {
    if ( connection.user_type == Config.BUYER ) {
      self.__getEventDetails( connectionId, connection, callback, 'buyer' );
    }
    else if ( connection.user_type = Config.SUPPLIER ) {
      self.__getEventDetails( connectionId, connection, callback, 'supplier' );
    }
  };

  self.getUserDetails = function ( connectionId, connection, callback ) {
    var cId       = connectionId.split( '@' );
    var instance  = cId[1];
    var emulating = cId[2];
    if ( !connection || !( connection.sessionCookie ) ) {
      callback( connectionId );
      return;
    }
    self.__get( 'auth/manage',
      function ( error ) {
        if ( !error )
          error = Config.networkError;
        connection.lastAction = Config.failedLoginMsg;
        console.error( Config.errorPrefix + ' ' + error );
        callback( connectionId, error );
      },
      function ( response ) {
        connection.lastAction    = Config.userDetailsAction;
        console.log( instance + ' - ' + Config.userDetailsMsg );
        var payload              = JSON.parse( response.body ).payload;
        connection.lastActive    = new Date( payload.created );
        delete payload.created;
        for (p in payload.response) {
          connection[p] = payload.response[p];
        }
        if ( connection.user_type == Config.SUPPLIER  || connection.user_type == Config.BUYER ) {
          self.getEventDetails( connectionId, connection, callback );
        }
        else {
          callback( connectionId );
        }
      },
      instance,
      connection.sessionCookie
    );
  };

  self.loginUser = function ( connectionId, connection, callback ) {
    var cId      = connectionId.split( '@' );
    var user     = cId[0].trim();
    var instance = cId[1].trim();
    var payload  = {
      user_name: user,
      password : connection.password
    };
    delete connection.password;

    if (cId[2]) {
      payload.euid = cId[2].trim();
    }

    console.log( Config.connectMsg );

    self.__post( payload, 'login',
      function ( error ) {
        if ( !error )
          error = Config.networkError;
        connection.lastAction = Config.failedLoginMsg;
        console.error( Config.errorPrefix + ' ' + error );
        callback( connectionId, error );
      },
      function ( response ) {
        connection.sessionCookie = response.headers['set-cookie'][0];
        connection.lastAction    = Config.successLoginMsg;
        connection.id            = self.__connectionCount++;
        console.log( instance + ' - ' + Config.sessionGrantMsg );
        var payload              = JSON.parse( response.body ).payload;
        connection.lastActive    = new Date( payload.created );
        callback( connectionId );
      },
      instance
    );
  };

  self.placeOffer = function ( connectionId, connection, callback, basket ) {
    var cId      = connectionId.split( '@' );
    var instance = cId[1].trim();
    var isLive       = connection.events[basket.event].is_live;
    var isBuyerLive  = connection.events[basket.event].is_buyer_live;
    var isActive     = connection.events[basket.event].is_active;
    var endpoint, payload;
    if ( !isLive && !isBuyerLive ) {
      payload  = {
        details  : ["user", connection.user_id, "pre_bid"],
        pre_bids : {}
      };
      payload.pre_bids[basket.id] = Math.floor( basket.offer / 100 * 100 ) / 100 ;
      endpoint = 'pre_bid';
    }
    else {
      payload  = {
        details : ["user", connection.user_id, "bid"],
        bids    : {}
      };
      payload.bids[basket.id] = Math.floor( basket.offer / 100 * 100 ) / 100 ;
      endpoint = 'bid';
    }

    if ( isDebugging ) 
      console.log( Config.debugPrefix + ' ' + JSON.stringify( payload ) );

    console.log( Config.offerMsg );

    self.__post( payload, 'events/user/' + connection.user_id + '/' + endpoint,
      function ( error ) {
        if ( !error )
          error = Config.networkError;
        connection.lastAction = Config.failedOfferMsg;
        console.error( Config.errorPrefix + ' ' + error );
        callback( connectionId, error );
      },
      function ( response ) {
        connection.lastAction    = Config.successOfferMsg;
        console.log( instance + ' - ' + Config.successOfferMsg );
        var payload              = JSON.parse( response.body ).payload;
        connection.lastActive    = new Date( payload.created );
        callback( connectionId );
      },
      instance,
      connection.sessionCookie
    );
  };

  self.toggleInvoice = function ( connectionId, connection, callback, keep, exclude ) {
    var cId          = connectionId.split( '@' );
    var instance     = cId[1].trim();

    var payload                 = {};
    payload.details             = ["invoices"];
    payload.include_invoice_ids = {};
    payload.exclude_invoice_ids = {};

    var userType = '';
    if ( connection.user_type == Config.BUYER ) {

      //
      // buyers must specify a supplier id with each invoice id
      //
      userType = 'buyer';
      for (var tuple in keep) {
        if ( /\|/.test( keep[tuple] ) ) {
          var bySupplier = keep[tuple].split('|');
          var supplierId = bySupplier[0];
          payload.include_invoice_ids[supplierId] = payload.include_invoice_ids[supplierId] || [];
          payload.include_invoice_ids[supplierId].push( bySupplier[1] );
        }
        else {
          console.log( Config.errAmbiguous + ': ' + keep[tuple] );
        }
      } 
      for (var tuple in exclude) {
        if ( /\|/.test( exclude[tuple] ) ) {
          var bySupplier = exclude[tuple].split('|');
          var supplierId = bySupplier[0];
          payload.exclude_invoice_ids[supplierId] = payload.exclude_invoice_ids[supplierId] || [];
          payload.exclude_invoice_ids[supplierId].push( bySupplier[1] );
        }
        else {
          console.log( Config.errAmbiguous + ': ' + exclude[tuple] );
        }
      } 
    }
    else if ( connection.user_type == Config.SUPPLIER ) {
      userType = 'supplier'; 
      payload.include_invoice_ids[connection.org_id] = keep;
      payload.exclude_invoice_ids[connection.org_id] = exclude;
    }

    if ( isDebugging ) 
      console.log( Config.debugPrefix + ' ' + JSON.stringify( payload ) );

    console.log( Config.toggleMsg );
    self.__post( payload, 'invoices/' + userType + '/' + connection.org_id + '/invoices',
      function ( error ) {
        if ( !error )
          error = Config.networkError;
        connection.lastAction = Config.failedToggleMsg;
        console.error( Config.errorPrefix + ' ' + error );
        callback( connectionId, error );
      },
      function ( response ) {
        connection.lastAction    = Config.successToggleMsg;
        console.log( instance + ' - ' + Config.successToggleMsg );
        var payload              = JSON.parse( response.body ).payload;

        if ( isDebugging ) 
          console.log( Config.debugPrefix + ' - ' + JSON.stringify( payload ) );

        connection.lastActive    = new Date( payload.created );
        callback( connectionId );
      },
      instance,
      connection.sessionCookie
    );
  };

  //
  // ---
  //
 
  self.__connectionCount = 1;

  self.__get = function ( route, err, resp, instance, cookie ) {
    if ( isDebugging )
      console.log(Config.debugPrefix + ' GET https://' + instance + '.pollenware.com/services/' + route);
    request(
      {
        'method' : 'get',
        'uri'    : 'https://' + instance + '.pollenware.com/services/' + route,
        'headers': {
          'Referer'      : 'https://' + instance + '.pollenware.com',
          'Cookie'       : cookie,
          'User-Agent'   : userAgent || ( Config.agentDefault + ' ' + process.argv[1].split( '/' ).pop()  )
         }
      },
      function ( error, response, body ) {
        if ( !error && response.statusCode == 200 ) {
          var ocap = JSON.parse(body);
          if ( ocap.payload.response.error ) {
            err(ocap.payload.response.error_msg );
          }
          else {
            resp( response );
          }
        }
        else {
          ( response && err( response.statusCode ) ) || err();
        }
      }
    );
  };

  self.__getEventDetails = function ( connectionId, connection, callback, userType ) {
    var cId      = connectionId.split( '@' );
    var instance = cId[1];
    if ( !connection || !( connection.sessionCookie ) ) {
      callback( connectionId );
      return;
    }
    self.__get( 'events/' + userType + '/' + connection.org_id,
      function ( error ) {
        if ( !error )
          error = Config.networkError;
        connection.lastAction = Config.failedLoginMsg;
        console.error( Config.errorPrefix + ' ' + error );
        callback( connectionId, error );
      },
      function ( response ) {
        connection.lastAction = Config.eventDetailAction;
        console.log( instance   + ' - ' + Config.eventsDetailMsg );
        var payload           = JSON.parse( response.body ).payload;
        connection.lastActive = new Date( payload.created );
        var events            = payload.response.events; 
        for ( e in events ) {
          var theEvent = events[e];
          var eventId  = theEvent.event_id;
          connection.events = connection.events || {};
          connection.events[eventId] = {};
          console.log(instance + ' - ' + Config.foundEventMsg + eventId );
          for ( key in theEvent ) {
            if ( /_time$/.test( key ) ) {
              connection.events[eventId][key] = new Date( theEvent[key] );
            }
            else {
              connection.events[eventId][key] = theEvent[key];
            }
          }
          var isLive       = connection.events[eventId].is_live;
          var isBuyerLive  = connection.events[eventId].is_buyer_live;
          var isActive     = connection.events[eventId].is_active;
          var startTime    = connection.events[eventId].start_time;
          var endTime      = connection.events[eventId].end_time;
          var isEncumbered = connection.events[eventId].is_encumbered;
          var newCheckDate = Util.iso8601Date( connection.events[eventId].new_check_date );
          var payThruDate  = Util.iso8601Date( connection.events[eventId].pay_thru_date );
          var startsIn     = Util.timeElapse( ( new Date() ).getTime(), startTime.getTime() );
          var duration     = Util.timeElapse( startTime.getTime(), endTime.getTime() );
          console.log( instance + ' - #' + eventId + ': ' + Config.countdownMsg + ': ' +  startsIn );
          console.log( instance + ' - #' + eventId + ': ' + Config.durationMsg  + ': ' +  duration );
          console.log( instance + ' - #' + eventId + ': ' + Config.newCheckMsg  + ': ' +  newCheckDate );
          console.log( instance + ' - #' + eventId + ': ' + Config.payThruMsg   + ': ' +  payThruDate );
          var eventStatus = ''
          if ( isActive && isLive && isBuyerLive ) {
            eventStatus = Config.liveStatus;
          }
          else if ( isActive && isBuyerLive ) {
            eventStatus = Config.awaitingStatus;
          }
          else if ( isActive ) {
            eventStatus = Config.preofferStatus;
          }
          console.log( instance + ' - #' + eventId + ': ' + Config.statusPrefix + ': ' + eventStatus );
        }
        callback( connectionId );
      },
      instance,
      connection.sessionCookie
    );
  };

  self.__getInvoices = function ( connectionId, connection, callback, userType, query ) {
    var cId      = connectionId.split( '@' );
    var instance = cId[1];
    if ( !connection || !( connection.sessionCookie ) ) {
      callback( connectionId );
      return;
    }

    if ( !query ) {
      query = 'sortOn=amount';
    }

    console.log( Config.invoiceRetriMsg );

    self.__get(  'invoices/' + userType + '/' + connection.org_id + self.__marshalInvoiceQuery( connection, query ),
      function ( error ) {
        if ( !error )
          error = Config.networkError;
        connection.lastAction = Config.failedLoginMsg;
        console.error( Config.errorPrefix + ' ' + error );
        callback( connectionId, error );
      },
      function ( response ) {
        connection.lastAction = Config.eventDetailAction;
        console.log( instance   + ' - ' + Config.eventsDetailMsg );
        var payload           = JSON.parse( response.body ).payload;
        connection.lastActive = new Date( payload.created );
        var invoices            = payload.response.invoices; 
        var invoiceCount        = invoices.length;
        console.log( instance + ' - ' + Config.invoiceCountMsg + invoiceCount );
        for ( i in invoices ) {
          var thisInvoice = invoices[i];
          var invoiceId   = thisInvoice.pollenware_invoice_id;
          connection.invoices_local = connection.invoices_local || {};
          connection.invoices_local[invoiceId] = {};
          for (key in thisInvoice) {
            connection.invoices_local[invoiceId][key] = thisInvoice[key];
          }
        }
        callback( connectionId );
      },
      instance,
      connection.sessionCookie
    );
  };

  self.__invoicePlaceholder = 0 - Config.invoicesPageSize;

  self.__invoicePaginate = function ( connection ) {
    if ( !connection.invoicePlaceholder && connection.invoicePlaceholder !== 0 ) {
      connection.invoicePlaceholder = self.__invoicePlaceholder;
    }
    return function ( add ) {
      connection.invoicePlaceholder = connection.invoicePlaceholder + add;
      return connection.invoicePlaceholder;
    };
  };

  // amount:
  //  *  float 
  // amount_meta:
  //  *  greater
  //  *  lesser
  // date_meta:
  //  *  greater
  //  *  lesser
  // date_start:
  //  *  YYYY-MM-DD
  // event_id:
  //  *  integer
  // sortType:
  //  *  _item (amount)
  //  *  supplier_id
  //  *  name (company name)
  //  *  payment_due_date
  //  *  voucher_id
  // supplier_id
  //  *  integer
  self.__marshalInvoiceQuery = function ( connection, query ) {
    var validCommands = {
    // cmd           internal       regex                 , canBeRange 
      'amount'   : [ 'amount',      /^\d+\.{0,1}\d{1,2}$/ , true  ],
      'duedate'  : [ 'date_start',  /^\d{4}-\d{2}-\d{2}$/ , true  ],
      'event'    : [ 'event_id',    /^\d+$/               , false ],
      'sortOn'   : [ 'sortType',    /^[a-zA-Z_]+$/        , false ],
      'supplier' : [ 'supplier_id', /^\d+$/               , false ]
    };

    var translateSortValues = {
      amount : '_item',
      supplier : 'supplier_id',
      name     : 'name',
      due      : 'payment_due_date',
      voucher  : 'voucher_id'
    };
    var queryString = '';
    query = query.split( /\s+/ );
  
    var usingEventFilter = false;
    var usingDateFilter = false;
    var seen = {}
    for ( var token in query ) {
      var pattern = /^([amountdevsrOipl_\-]+)([<>=])([A-Za-z0-9_\-\.]+)$/;
      var matches = query[token].trim().match( pattern );
      if ( matches && matches[0] ) {
        var cmd     = matches[1];
        var op      = matches[2];
        var value   = matches[3];
        if ( !validCommands[cmd] || !value.match( validCommands[cmd][1] ) || ( ( op == '>' || op == '<' ) && !validCommands[cmd][2] ) ) {
          console.warn( Config.invalidTokenMsg + query[token] + Config.skippingMsg  );
        }
        else {
          if ( seen[cmd] )
            continue;
          seen[cmd] = 1;
          if ( cmd == 'event' ) {
            usingEventFilter = true;
            if ( usingDateFilter ) {
              console.warn( Config.noEventFilterMsg  );
              queryString = queryString.replace(/event_id=\d+&{0,1}/g, '');
              continue;
            }
          }
          else if ( cmd == 'duedate' ) {
            usingDateFilter = true;
            if ( usingEventFilter ) {
              console.warn( Config.noDateFilterMsg  );
              queryString = queryString.replace(/date_start[=<>][\d\-]+&{0,1}/g, '');
              queryString = queryString.replace(/date_meta[=<>](greater|lesser)&{0,1}/g, '');
              continue;
            }
          }
          else if ( cmd == 'sortOn' ) {
            value = translateSortValues[value];
          }
          
          queryString = queryString + encodeURIComponent( validCommands[cmd][0] ) + '=' + encodeURIComponent( value ) + '&';

          if ( op == '>' ) {
            if ( cmd == 'duedate' )
              queryString = queryString + 'date_meta=' + encodeURIComponent( 'greater' )   + '&'
            else if ( cmd == 'amount' )
              queryString = queryString + 'amount_meta=' + encodeURIComponent( 'greater' ) + '&'
          }
          else if ( op == '<' ) {
            if ( cmd == 'duedate' )
              queryString = queryString + 'date_meta=' + encodeURIComponent( 'lesser' )    + '&'
            else if ( cmd == 'amount' )
              queryString = queryString + 'amount_meta=' + encodeURIComponent( 'lesser' )  + '&'
          }
        } 
      }
      else {
        console.warn( Config.invalidTokenMsg + query[token] );
      }
    }

    queryString = queryString.replace( /\&$/,'' );

    var start = self.__invoicePaginate( connection );
    return '?count=' + Config.invoicesPageSize + '&' + 'start=' + start( Config.invoicesPageSize ) + '&' + queryString;
  };

  self.__post = function ( payload, route, err, resp, instance, cookie ) {
    if ( isDebugging )
      console.log(Config.debugPrefix + ' POST https://' + instance + '.pollenware.com/services/' + route);
    request(
      {
        'method' : 'post',
        'uri'    : 'https://' + instance + '.pollenware.com/services/' + route,
        'headers': {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Cookie'       : cookie,
        'Referer'      : 'https://' + instance + '.pollenware.com'
      },
      'body'   : JSON.stringify( payload )
      },
      function ( error, response, body ) {
        if ( !error && response.statusCode == 200 ) {
          var ocap = JSON.parse( body );
          if ( ocap.payload.response.error ) {
            err( ocap.payload.response.error_msg );
          }
          else {
            resp( response );
          }
        }
        else {
          ( response && err( response.statusCode ) ) || err();
        }
      }
    );
  };

}
