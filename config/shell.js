var Util = require( '../lib/util.js' ).Util;
exports.Config = new Config();

function Config () {
  this.errorBuyerBid     = 'buyers cannot bid in their own events';
  this.BUYER             = 2;
  this.errorAmbiguous    = 'ambiguous instruction, skipping';
  this.errorLiveEventMsg = 'event in progress';
  this.errorPrefix       = '[error]';
  this.exitMsg           = "leaving OCAP";
  this.helpBlurb         = "type 'h' for help";
  this.helpMsg           = function ( cli ) { var readme = Util.spitFile( 'README', cli ); };
  this.invClearMsg       = 'trashing local copies of invoices...';
  // "voucher_id","buyer_id","supplier_id","event_id","short_name","name","group_id",
  // "payment_due_date","amount""invoice_date","is_buyer_included","is_supplier_included"
  // "status","invoice_id","has_adjustments","is_supplier_excluded","is_unmatched_adjustment",
  // "is_covering_adjust","is_reserved","is_eligible"
  this.invColumns        = ['supplier_id', 'payment_due_date', 'amount', 'group_id', 'name'];
  this.invPrintMsg       = 'printing invoices... ';
  this.logFile           = 'log/ocap.log';
  this.logClearMsg       = 'log cleared';
  this.logWriteMsg       = 'writing log to';
  this.noEventsMsg       = "no events";
  this.notFoundMsg       = "command not found type 'h' for help";
  this.promptPrefix      = 'ocap> ';
  this.replAddress       = 'localhost';
  this.replUseMsg        = 'visit via telnet';
  this.replPort          = 5100;
  this.replPrompt        = 'ocap repl> ';
  this.sessionTimeout    = 45; 
  this.SUPPLIER          = 3;
  this.title             = '(pollenware OCAP)';
}
