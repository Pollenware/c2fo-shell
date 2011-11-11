exports.Config = new Config();

function Config () {
  this.errorBuyerBid     = 'buyers cannot bid in their own events';
  this.BUYER             = 2;
  this.errorAmbiguous    = 'ambiguous instruction, skipping';
  this.errorLiveEventMsg = 'event in progress';
  this.errorPrefix       = '[error]';
  this.exitMsg           = "leaving OCAP";
  this.helpBlurb         = "type 'h' for help";
  this.helpMsg           = function () {
    console.log(
      "\n" +
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' <user>@<instance>  (connect)   - connect to OCAP instance   > 3schofid@toysrus-test'             + "\n" +
      ' <user>@<instance>@<emulate>    - connect, emulating         > jon_admin@costco@costco1 (admins)'        + 
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' b <evt>            baskets     - show all baskets           > b 150'                             + "\n" + 
      ' b <evt> <bk>       baskets     - show basket by id          > b 155 1'                                  + 
      "\n-------------------------------------------------------------------------------------------------\n"   + 
      ' c                  connections - show all connections       > c'                                 + "\n" +
      ' c <cid>            connections - switch to connection by id > c 1'                               + "\n" +
      ' c <cname>          connections - switch by name             > c user@instance'                          + 
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' d <cid>            delete      - delete connection by id    > d 4'                               + "\n" + 
      ' d <cname>          delete      - delete connection by name  > d usr@inst'                               + 
      "\n-------------------------------------------------------------------------------------------------\n"   + 
      ' e                  environment - show environment detail    > e'                                 + "\n" +
      ' e <attr>           environment - show environment attr      > e org_id'                                 + 
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' h                  help        - show this message          > h'                                        + 
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' i                  invoices    - load invoices              > i'                                 + "\n" +
      ' i <query>          invoices    - load invoices with filter  > i <see examples below>'            + "\n" +
      '                                                             > i duedate>2012-11-01 amount<20000' + "\n" +
      '                                                             > i sortOn=amount event=6518'        + "\n" +
      '                                                             > i supplier=21 amount=741999.47' + "\n" +
      '                                                             > i sortOn=amount event=165'         + "\n" +
      ' i c             invoice clear  - erase invoice cache        > i c'                               + "\n" +
      ' i p             invoice print  - show invoice cache         > i p'                                      + 
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' j <code>           javascript  - evaluate some code         > j Math.random(5);'                        + 
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' l                  log         - show log contents          > l'                                 + "\n" +
      ' l c                log clear   - clear log                  > l c'                               + "\n" +
      ' l w                log write   - write log to disk          > l w'                                      + 
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' o <evt> <bk> <bps> offer       - submit a discount          > o 169 90940 120'                          + 
      "\n-------------------------------------------------------------------------------------------------\n"   + 
      ' r                  repl        - start TCP REPL server      > r'                                        + 
      "\n-------------------------------------------------------------------------------------------------\n"   +
      ' t <inv> <inv>...   toggle      - inc/exc invs               > t i24849731 ei24855904...'         + "\n" +
      ' t <inv> <inv>...   toggle      - inc/exc supp invs as buyer > t i21440051|24849731...'                  + 
      "\n-------------------------------------------------------------------------------------------------\n"
    );
  };
  this.invClearMsg    = 'trashing local copies of invoices...';
  // "voucher_id","buyer_id","supplier_id","event_id","short_name","name","group_id",
  // "payment_due_date","amount""invoice_date","is_buyer_included","is_supplier_included"
  // "status","invoice_id","has_adjustments","is_supplier_excluded","is_unmatched_adjustment",
  // "is_covering_adjust","is_reserved","is_eligible"
  this.invColumns     = ['supplier_id', 'payment_due_date', 'amount', 'group_id', 'name'];
  this.invPrintMsg    = 'printing invoices... ';
  this.logFile        = 'log/ocap.log';
  this.logClearMsg    = 'log cleared';
  this.logWriteMsg    = 'writing log to';
  this.noEventsMsg    = "no events";
  this.notFoundMsg    = "command not found type 'h' for help";
  this.promptPrefix   = 'ocap> ';
  this.replAddress    = 'localhost';
  this.replUseMsg     = 'visit via telnet';
  this.replPort       = 5100;
  this.replPrompt     = 'ocap repl> ';
  this.sessionTimeout = 45; 
  this.SUPPLIER       = 3;
  this.title          = '(pollenware OCAP)';
}
