exports.Config = new Config();

function Config () {
  this.agentString       = 'OCAP shell, v';
  this.badValueMsg       = 'not a valid value';
  this.BUYER             = 2;
  this.emulatePrefix     = 'Emulate: ';
  this.errorConnect      = 'connection could not be established';
  this.errorMonitEvent   = 'no connection';
  this.errorNoConnection = 'no connection';
  this.errorInvoice      = 'could not retrieve invoices';
  this.errorOffer        = 'could not place offer';
  this.errorToggle       = 'could not update invoices';
  this.errorPrefix       = '[error]';
  this.instancePrefix    = 'Instance: ';
  this.nonAdminWarning   = '[warning] no connection added; only admins can emulate';
  this.passwordPrefix    = 'Password: ';
  this.promptPrefix      = 'ocap';
  this.successInvoice    = 'invoices retrieved';
  this.successMonitEvent = 'event monitor updated';
  this.successOffer      = 'offer placed';
  this.successToggle     = 'invoices updated';
}
