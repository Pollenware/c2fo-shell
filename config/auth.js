exports.Config = new Config();

function Config () {
  this.agentString       = 'OCAP shell, v';
  this.badValueMsg       = 'not a valid value';
  this.BUYER             = 2;
  this.emulatePrefix     = 'Emulate: ';
  this.errorConnect      = 'connection could not be established';
  this.errorFlip         = 'could not flip supplier basket for: ';
  this.errorInvoice      = 'could not retrieve invoices';
  this.errorMonitEvent   = 'no connection';
  this.errorNoConnection = 'no connection';
  this.errorOffer        = 'could not place offer';
  this.errorPrefix       = '[error]';
  this.errorToggle       = 'could not update invoices';
  this.instancePrefix    = 'Instance: ';
  this.nonAdminWarning   = '[warning] no connection added; only admins can emulate';
  this.passwordPrefix    = 'Password: ';
  this.promptPrefix      = 'ocap';
  this.successFlip       = 'basket status flipped';
  this.successInvoice    = 'invoices retrieved';
  this.successMonitEvent = 'event monitor updated';
  this.successOffer      = 'offer placed';
  this.successToggle     = 'invoices updated';
}
