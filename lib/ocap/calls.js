var Config = require( '../config/calls.js' ).Config,
    OCAP   = require( './ocap.js' ).OCAP,
    p      = require( './commander.js' ),
    tty    = require( 'tty' );

exports.Calls = Calls;

function Calls() {

  var self = this;

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

  this.toggleInvoice = function ( connectionId, calls, exclude ) {
    self.ocap.toggleInvoice(
      connectionId,
      self.connections[connectionId], 
      function () {self.toggleCallback( connectionId ) },
      calls,
      exclude
    );
  };
}
