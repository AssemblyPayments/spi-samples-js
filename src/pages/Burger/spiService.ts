import { Spi as SpiClient, SpiFlow, TransactionOptions } from '@assemblypayments/spi-client-js';

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

  constructor() {
    this._spi = null;
    this._posId = 'RAMENPOS1';
    this._eftposAddress = '192.168.1.1';
    this._spiSecrets = null;
    this._options = null;
    this._version = '2.6.3';
    this._rcptFromEftpos = false;
    this._sigFlowFromEftpos = false;
    this._apiKey = null;
    this._serialNumber = '';
    this._acquirerCode = 'wbc';
    this._autoResolveEftposAddress = false;
    this._testMode = true;
    this._useSecureWebSockets = false;
    this._log = console;
  }

  start() {
    try {
      this._spi = new SpiClient(this._posId, this._serialNumber, this._eftposAddress, this._spiSecrets); // It is ok to not have the secrets yet to start with.
      this._spi.Config.PromptForCustomerCopyOnEftpos = this._rcptFromEftpos;
      this._spi.Config.SignatureFlowOnEftpos = this._sigFlowFromEftpos;
      this._spi.SetPosInfo('assembly', this._version);
      this._spi.SetAcquirerCode(this._acquirerCode);
      this._spi.SetDeviceApiKey(this._apiKey);
      this._options = new TransactionOptions();
      this._options.SetCustomerReceiptHeader('');
      this._options.SetCustomerReceiptFooter('');
      this._options.SetMerchantReceiptHeader('');
      this._options.SetMerchantReceiptFooter('');
    } catch (e) {
      this._log.info(e.Message);
      return;
    }
    this.onSpiStateChange = this.onSpiStateChange.bind(this);
    document.addEventListener('DeviceAddressChanged', this.onSpiStateChange);
    document.addEventListener('StatusChanged', this.onSpiStateChange);
    document.addEventListener('PairingFlowStateChanged', this.onSpiStateChange);
    document.addEventListener('SecretsChanged', this.onSpiStateChange);
    document.addEventListener('TxFlowStateChanged', this.onSpiStateChange);
    this._spi.PrintingResponse = this.onSpiResponse.bind(this);
    this._spi.TerminalStatusResponse = this.onSpiResponse.bind(this);
    this._spi.BatteryLevelChanged = this.onSpiResponse.bind(this);
    this.setAutoAddressResolutionState();
    this._spi.Start();
    this.printStatusAndActions();
  }

  onSpiStateChange(e: any) {
    console.log(e);
    if (e.detail && e.detail === 'PairedConnected') {
      this._spi.AckFlowEndedAndBackToIdle();
    }
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
        console.log('Unable to handle flow state');
    }
  }
}

export { Spi as default };