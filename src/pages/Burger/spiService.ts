import { Spi as SpiClient, SpiFlow, TerminalConfigurationResponse, TransactionOptions } from '@mx51/spi-client-js';

class Spi {
  _spi: any;
  _posId: string;
  _eftposAddress: string;
  _spiSecrets: any;
  _options: any;
  _version: any;
  _rcptFromEftpos: Boolean;
  _sigFlowFromEftpos: Boolean;
  _apiKey: any;
  _serialNumber: string;
  _acquirerCode: string;
  _autoResolveEftposAddress: Boolean;
  _testMode: Boolean;
  _useSecureWebSockets: Boolean;
  _log: any;
  _printMerchantCopy: Boolean;

  constructor() {
    this._spi = null;
    this._posId = window.localStorage.getItem('posID') || '';
    this._eftposAddress = window.localStorage.getItem('eftpos_address') || '192.168.1.1';
    this._spiSecrets = null;
    this._options = null;
    this._version = '2.8.0';
    this._rcptFromEftpos = window.localStorage.getItem('rcpt_from_eftpos') === 'true';
    this._sigFlowFromEftpos = window.localStorage.getItem('check-sig-eftpos') === 'true';
    this._printMerchantCopy = window.localStorage.getItem('print_merchant_copy_input') === 'true';
    this._apiKey = window.localStorage.getItem('api_key') || '';
    this._serialNumber = window.localStorage.getItem('serial') || '';
    this._acquirerCode = 'wbc';
    this._autoResolveEftposAddress = window.localStorage.getItem('auto_address') === 'true';
    this._testMode = window.localStorage.getItem('test_mode') === 'true';
    this._useSecureWebSockets = window.localStorage.getItem('use_secure_web_sockets') === 'true';
    this._log = console;
    const secretsString = window.localStorage.getItem('secrets') || '';
    try {
      const secrets = JSON.parse(secretsString);
      if (secrets) {
        this._spiSecrets = secrets;
      }
    } catch (error) {
      this._log.error('unable to access secrets');
    }
  }

  start() {
    try {
      this._spi = new SpiClient(this._posId, this._serialNumber, this._eftposAddress, this._spiSecrets); // It is ok to not have the secrets yet to start with.
      this._spi.Config.PromptForCustomerCopyOnEftpos = this._rcptFromEftpos;
      this._spi.Config.SignatureFlowOnEftpos = this._sigFlowFromEftpos;
      this._spi.Config.PrintMerchantCopy = this._printMerchantCopy;
      this._spi.SetPosInfo('mx51', this._version);
      this._spi.SetAcquirerCode(this._acquirerCode);
      this._spi.SetDeviceApiKey(this._apiKey);
      this._options = new TransactionOptions();
      this._options.SetCustomerReceiptHeader(window.localStorage.getItem('receipt_header_input') || '');
      this._options.SetCustomerReceiptFooter(window.localStorage.getItem('receipt_footer_input') || '');
      this._options.SetMerchantReceiptHeader(window.localStorage.getItem('receipt_header_input') || '');
      this._options.SetMerchantReceiptFooter(window.localStorage.getItem('receipt_footer_input') || '');
    } catch (e) {
      this._log.info(e.Message);
      return;
    }
    this.onSpiStateChange = this.onSpiStateChange.bind(this);
    document.addEventListener('DeviceAddressChanged', this.onSpiStateChange);
    document.addEventListener('StatusChanged', this.onSpiStateChange);
    document.addEventListener('PairingFlowStateChanged', this.onSpiStateChange);
    document.addEventListener('SecretsChanged', Spi.onSecretsChange);
    document.addEventListener('TxFlowStateChanged', this.onSpiStateChange);
    this._spi.PrintingResponse = this.onSpiResponse.bind(this);
    this._spi.TerminalConfigurationResponse = Spi.onTerminalConfigurationChange;
    this._spi.TerminalStatusResponse = this.onSpiResponse.bind(this);
    this._spi.BatteryLevelChanged = this.onSpiResponse.bind(this);
    this._spi.TransactionUpdateMessage = Spi.onSpiTransactionUpdate.bind(this);
    this.setAutoAddressResolutionState();
    // this._spi.Start(); //TODO Commented to test multi-pairing
    this.printStatusAndActions();
  }

  onSpiStateChange(e: any) {
    if (e.detail && e.detail === 'PairedConnected') {
      this._spi.AckFlowEndedAndBackToIdle();
    }
  }

  static onSecretsChange(e: any) {
    window.localStorage.setItem('secrets', JSON.stringify(e.detail));
  }

  static onTerminalConfigurationChange(m: Message) {
    const terminalConfigurationResponse = new TerminalConfigurationResponse(m);
    window.localStorage.setItem('serial', terminalConfigurationResponse.GetSerialNumber());
  }

  static onSpiTransactionUpdate(m: Message) {
    document.dispatchEvent(new CustomEvent('TxnUpdateMessage', { detail: m }));
  }

  onSpiResponse() {
    this._spi.AckFlowEndedAndBackToIdle();
    this.printStatusAndActions();
  }

  setAutoAddressResolutionState() {
    this._spi.SetTestMode(this._testMode);
    this._spi.SetSecureWebSockets(this._useSecureWebSockets);
    this._spi.SetAutoAddressResolution(this._autoResolveEftposAddress);
  }

  printStatusAndActions() {
    this.printFlowInfo();
  }

  printFlowInfo() {
    switch (this._spi.CurrentFlow) {
      case SpiFlow.Pairing:
        this._log.info(this._spi.CurrentPairingFlowState);
        break;
      case SpiFlow.Transaction:
        this._log.info(this._spi.CurrentTxFlowState);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log('Unable to handle flow state');
    }
  }
}

export { Spi as default };
