import {
  DeviceAddressResponseCode,
  Secrets,
  Spi,
  SpiFlow,
  SpiStatus,
  SuccessState,
  TransactionOptions,
  TransactionType,
} from '@mx51/spi-client-js';

import {
  cashout,
  moto,
  pairing,
  purchase,
  refund,
  settlement,
  settlementEnquiry,
  terminalStatus,
  transactionFlow,
} from '../../services';
import Pos from '../../services/_common/pos';
import { getSpiVersion } from '../../services/_common/uiHelpers';

import '../legacyStyles.scss';

// <summary>
// NOTE: THIS PROJECT USES THE latest verion of the SPI Client Library
//
// This is your POS. To integrate with SPI, you need to instantiate a Spi object
// and interact with it.
//
// Primarily you need to implement 3 things.
// 1. Settings Screen
// 2. Pairing Flow Screen
// 3. Transaction Flow screen
//
// To see logs from spi, check the console
// </summary>
class RamenPos extends Pos {
  private _log: Console;
  private _receipt: Logger;
  private _flowMsg: Logger;
  private _spi: Spi;
  private _posId: string;
  private _eftposAddress: string;
  private _spiSecrets?: any;
  private _options?: any;
  private _version?: string | null;
  private _serialNumber?: string;
  private _rcptFromEftpos: boolean;
  private _sigFlowFromEftpos: boolean;

  private _apiKey: string | null;
  private _tenantCode: string;
  private _autoResolveEftposAddress: boolean;
  private _testMode: boolean;
  private _useSecureWebSockets: boolean;

  constructor(log: Console, receipt: Logger, flowMsg: Logger) {
    super();
    this._log = log;
    this._receipt = receipt;
    this._flowMsg = flowMsg;

    this._spi = null;
    this._posId = 'RAMENPOS1';
    this._eftposAddress = '192.168.1.1';
    this._spiSecrets = null;
    this._options = null;
    this._version = getSpiVersion();
    this._rcptFromEftpos = false;
    this._sigFlowFromEftpos = false;

    this._apiKey = null;
    this._serialNumber = '';
    this._tenantCode = 'wbc';
    this._autoResolveEftposAddress = false;
    this._testMode = true;
    this._useSecureWebSockets = false;

    this.PrintStatusAndActions = this.PrintStatusAndActions.bind(this);
  }

  Start() {
    this._log.info('Starting RamenPos...');
    this.LoadPersistedState();

    try {
      this._spi = new Spi(this._posId, this._serialNumber, this._eftposAddress, this._spiSecrets); // It is ok to not have the secrets yet to start with.
      this._spi.Config.PromptForCustomerCopyOnEftpos = this._rcptFromEftpos;
      this._spi.Config.SignatureFlowOnEftpos = this._sigFlowFromEftpos;

      this._spi.SetPosInfo('assembly', this._version);
      this._spi.SetAcquirerCode(this._tenantCode);
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

    document.addEventListener('DeviceAddressChanged', (e: SpiEvent) => this.onDeviceAddressChanged(e.detail));
    document.addEventListener('StatusChanged', (e: SpiEvent) =>
      terminalStatus.onSpiStatusChanged(this._flowMsg, this.PrintStatusAndActions, e.detail)
    );
    document.addEventListener('PairingFlowStateChanged', () =>
      terminalStatus.onPairingFlowStateChanged(this._flowMsg, this.PrintStatusAndActions)
    );
    document.addEventListener('SecretsChanged', (e: SpiEvent) => terminalStatus.onSecretsChanged(this._log, e.detail));
    document.addEventListener('TxFlowStateChanged', () =>
      terminalStatus.onTxFlowStateChanged(this._flowMsg, this.PrintStatusAndActions)
    );

    this._spi.PrintingResponse = (message: Message) =>
      terminalStatus.handlePrintingResponse(this._flowMsg, this._spi, message, this.PrintStatusAndActions);
    this._spi.TerminalStatusResponse = (message: Message) =>
      terminalStatus.handleTerminalStatusResponse(this._flowMsg, this._spi, message, this.PrintStatusAndActions);
    this._spi.BatteryLevelChanged = (message: Message) =>
      terminalStatus.handleBatteryLevelChanged(
        this._flowMsg,
        this._log,
        this._spi,
        message,
        this.PrintStatusAndActions
      );

    this.SetAutoAddressResolutionState();
    this._spi.Start();

    this._flowMsg.Clear();
    this._flowMsg.Info('# Welcome to RamenPos !');

    this.PrintStatusAndActions();
    this.AcceptUserInput();
  }

  onDeviceAddressChanged(deviceAddressStatus: any) {
    const eftposAddress = document.getElementById('eftpos_address') as HTMLInputElement;
    const _alert = alert;

    switch (deviceAddressStatus.DeviceAddressResponseCode) {
      case DeviceAddressResponseCode.SUCCESS:
        eftposAddress.value = deviceAddressStatus.Address;
        this._eftposAddress = deviceAddressStatus.Address;
        this._flowMsg.Info(`Device Address has been updated to ${deviceAddressStatus.Address}`);
        break;
      case DeviceAddressResponseCode.INVALID_SERIAL_NUMBER:
        eftposAddress.value = '';
        this._eftposAddress = '';
        _alert(
          `The serial number is invalid: ${deviceAddressStatus.ResponseStatusDescription} : ${deviceAddressStatus.ResponseMessage}`
        );
        break;
      case DeviceAddressResponseCode.DEVICE_SERVICE_ERROR:
        eftposAddress.value = '';
        this._eftposAddress = '';
        _alert(
          `The device service error: ${deviceAddressStatus.ResponseStatusDescription} : ${deviceAddressStatus.ResponseMessage}`
        );
        break;
      case DeviceAddressResponseCode.ADDRESS_NOT_CHANGED:
        _alert('The IP address have not changed!');
        break;
      case DeviceAddressResponseCode.SERIAL_NUMBER_NOT_CHANGED:
        _alert('The serial number have not changed!');
        break;
      default:
        _alert('The serial number is invalid! or The IP address have not changed!');
        break;
    }
  }

  PrintStatusAndActions() {
    this.PrintFlowInfo();
    this.PrintActions();
    this.PrintPairingStatus();
  }

  PrintFlowInfo() {
    switch (this._spi.CurrentFlow) {
      case SpiFlow.Pairing: {
        pairing.handlePairingUpdate(this._flowMsg, this._spi.CurrentPairingFlowState);
        break;
      }
      case SpiFlow.Transaction: {
        const txState = this._spi.CurrentTxFlowState;
        transactionFlow.handleTransaction(this._flowMsg, txState);

        if (txState.AwaitingSignatureCheck) {
          // We need to print the receipt for the customer to sign.
          this._flowMsg.Info(`# RECEIPT TO PRINT FOR SIGNATURE`);
          this._receipt.Info(txState.SignatureRequiredMessage.GetMerchantReceipt().trim());
        }

        if (txState.AwaitingPhoneForAuth) {
          this._flowMsg.Info(`# PHONE FOR AUTH DETAILS:`);
          this._flowMsg.Info(`# CALL: ${txState.PhoneForAuthRequiredMessage.GetPhoneNumber()}`);
          this._flowMsg.Info(`# QUOTE: Merchant Id: ${txState.PhoneForAuthRequiredMessage.GetMerchantId()}`);
        }

        if (txState.Finished) {
          switch (txState.Type) {
            case TransactionType.Purchase:
            case TransactionType.ZipPurchase:
              Pos.processCompletedEvent(this._flowMsg, this._receipt, purchase, txState);
              break;
            case TransactionType.Refund:
            case TransactionType.ZipRefund:
              Pos.processCompletedEvent(this._flowMsg, this._receipt, refund, txState);
              break;
            case TransactionType.CashoutOnly:
              Pos.processCompletedEvent(this._flowMsg, this._receipt, cashout, txState);
              break;
            case TransactionType.MOTO:
              Pos.processCompletedEvent(this._flowMsg, this._receipt, moto, txState);
              break;
            case TransactionType.Settle:
              Pos.processCompletedEvent(this._flowMsg, this._receipt, settlement, txState);
              break;
            case TransactionType.SettlementEnquiry:
              Pos.processCompletedEvent(this._flowMsg, this._receipt, settlementEnquiry, txState);
              break;
            case TransactionType.GetLastTransaction:
              transactionFlow.handleGetLastTransaction(
                this._flowMsg,
                this._receipt,
                this._spi,
                txState,
                (document.getElementById('pos_ref_id') as HTMLInputElement).value
              );
              break;
            default:
              this._flowMsg.Error(`# CAN'T HANDLE TX TYPE: ${txState.Type}`);
              break;
          }
        }
        break;
      }
      default:
    }
  }

  PrintActions() {
    // List of input controls which are enabled / shown for the current application state
    const inputsEnabled = [];
    const statusEl = document.getElementById('status_indicator') as HTMLElement;
    const primaryStatusEl = document.getElementById('primary_status') as HTMLElement;
    const flowStatusEl = document.getElementById('flow_status') as HTMLElement;
    const flowStatusHeading = document.getElementById('flow_status_heading') as HTMLElement;

    statusEl.dataset.status = this._spi.CurrentStatus;
    statusEl.dataset.flow = this._spi.CurrentFlow;
    primaryStatusEl.innerText = this._spi.CurrentStatus;
    flowStatusEl.innerText = this._spi.CurrentFlow;
    flowStatusHeading.innerText = this._spi.CurrentFlow;

    // Available Actions depend on the current status (Unpaired/PairedConnecting/PairedConnected)
    switch (this._spi.CurrentStatus) {
      case SpiStatus.Unpaired: // Unpaired...
        switch (this._spi.CurrentFlow) {
          case SpiFlow.Idle: // Unpaired, Idle
            inputsEnabled.push(
              'auto_resolve_eftpos_address',
              'pair',
              'pos_id',
              'pos_vendor_key',
              'print_merchant_copy_input',
              'print',
              'rcpt_from_eftpos',
              'receipt_footer_input',
              'receipt_header_input',
              'save_address_settings',
              'save_receipt',
              'save_settings',
              'serial_number',
              'sig_flow_from_eftpos',
              'terminal_status',
              'test_mode',
              'use_secure_web_sockets'
            );

            if (!this.IsUnknownStatus()) {
              inputsEnabled.push('eftpos_address');
            }
            break;

          case SpiFlow.Pairing: {
            // Unpaired, PairingFlow
            const pairingState = this._spi.CurrentPairingFlowState;
            if (pairingState.AwaitingCheckFromPos) {
              inputsEnabled.push('pair_confirm');
            }
            if (!pairingState.Finished) {
              inputsEnabled.push('pair_cancel');
            } else {
              inputsEnabled.push('ok');
            }
            break;
          }
          case SpiFlow.Transaction: // Unpaired, TransactionFlow - Should never be the case!
          default:
            this._log.info(`# .. Unexpected Flow .. ${this._spi.CurrentFlow}`);
            break;
        }
        break;
      case SpiStatus.PairedConnecting: // This is still considered as a Paired kind of state, but...
        // .. we give user the option of changing IP address, just in case the EFTPOS got a new one in the meanwhile
        inputsEnabled.push('rcpt_from_eftpos', 'save_settings', 'sig_flow_from_eftpos');
        // .. but otherwise we give the same options as PairedConnected
        // goto case SpiStatus.PairedConnected;

        if (!this.IsUnknownStatus()) {
          inputsEnabled.push('eftpos_address');
        }
      // caution: intentionally falls through

      case SpiStatus.PairedConnected:
        switch (this._spi.CurrentFlow) {
          case SpiFlow.Idle: // Paired, Idle
            inputsEnabled.push(
              'amount_input',
              'tip_amount_input',
              'surcharge_amount_input',
              'suppress_merchant_password_input',
              'cashout_amount_input',
              'purchase_inputs',
              'prompt_for_cash',
              'pos_ref_id_input',
              'save_settings',
              'save_receipt',
              'zip_purchase_input',
              'zip_refund_input',

              'purchase',
              'moto',
              'refund',
              'cashout',
              'settle',
              'settle_enq',
              'recover',
              'unpair',
              'glt',
              'rcpt_from_eftpos',
              'sig_flow_from_eftpos',
              'zip_purchase',
              'zip_refund',

              'receipt_header_input',
              'receipt_footer_input',
              'print',
              'terminal_status'
            );

            break;
          case SpiFlow.Transaction: // Paired, Transaction
            if (this._spi.CurrentTxFlowState.AwaitingSignatureCheck) {
              inputsEnabled.push('tx_sign_accept', 'tx_sign_decline');
            }

            if (this._spi.CurrentTxFlowState.AwaitingPhoneForAuth) {
              inputsEnabled.push('auth_code_input', 'tx_auth_code');
            }

            if (this.IsUnknownStatus()) {
              inputsEnabled.push('ok_retry', 'ok_override_paid', 'ok_cancel');
            }

            if (!this._spi.CurrentTxFlowState.Finished && !this._spi.CurrentTxFlowState.AttemptingToCancel) {
              inputsEnabled.push('tx_cancel');
            } else {
              switch (this._spi.CurrentTxFlowState.Success) {
                case SuccessState.Success:
                  inputsEnabled.push('ok');
                  break;
                case SuccessState.Failed:
                  inputsEnabled.push('ok_cancel');
                  break;
                default:
                  // Unknown
                  inputsEnabled.push('ok_cancel');
                  break;
              }
            }
            break;
          case SpiFlow.Pairing: // Paired, Pairing - we have just finished the pairing flow. OK to ack.
            inputsEnabled.push('ok');
            break;
          default:
            this._log.info(`# .. Unexpected Flow .. ${this._spi.CurrentFlow}`);
            break;
        }
        break;

      default:
        this._log.info(`# .. Unexpected State .. ${this._spi.CurrentStatus}`);
        break;
    }

    // Configure buttons / inputs
    const inputs = document.querySelectorAll('.input');
    for (let i = 0; i < inputs.length; i += 1) {
      (inputs[i] as HTMLInputElement).disabled = true;
    }

    inputsEnabled.forEach((input) => {
      (document.getElementById(input) as HTMLInputElement).disabled = false;
    });

    this._flowMsg.Info();
  }

  IsUnknownStatus() {
    if (this._spi.CurrentFlow === SpiFlow.Transaction) {
      if (this._spi.CurrentTxFlowState.Finished && this._spi.CurrentTxFlowState.Success === SuccessState.Unknown) {
        return true;
      }
    }

    return false;
  }

  PrintPairingStatus() {
    this._flowMsg.Info(`# --------------- STATUS ------------------`);
    this._flowMsg.Info(`# ${this._posId} <-> Eftpos: ${this._eftposAddress} #`);
    this._flowMsg.Info(`# SPI STATUS: ${this._spi.CurrentStatus}     FLOW: ${this._spi.CurrentFlow} #`);
    this._flowMsg.Info(`# SPI CONFIG: ${JSON.stringify(this._spi.Config)}`);
    this._flowMsg.Info(`# -----------------------------------------`);
    this._flowMsg.Info(`# POS: v${this._version} Spi: v${Spi.GetVersion()}`);
  }

  SetAutoAddressResolutionState() {
    this._spi.SetTestMode(this._testMode);
    this._spi.SetSecureWebSockets(this._useSecureWebSockets);
    this._spi.SetAutoAddressResolution(this._autoResolveEftposAddress);
  }

  AcceptUserInput() {
    this.addUiOperation('#address_settings_form', 'submit', (e: InputEvent) => {
      e.preventDefault();

      if (this._spi.CurrentStatus === SpiStatus.Unpaired && this._spi.CurrentFlow === SpiFlow.Idle) {
        this._testMode = Pos.getElementCheckboxValue('#test_mode');
        this._useSecureWebSockets = Pos.getElementCheckboxValue('#use_secure_web_sockets');
        this._autoResolveEftposAddress = Pos.getElementCheckboxValue('#auto_resolve_eftpos_address');
        this.SetAutoAddressResolutionState();
        this._log.info(`Auto address settings saved`);
      }
    });

    this.addUiOperation('#settings_form', 'submit', (e: InputEvent) => {
      e.preventDefault();

      if (this._spi.CurrentStatus === SpiStatus.Unpaired && this._spi.CurrentFlow === SpiFlow.Idle) {
        this._posId = Pos.getElementValue('#pos_id');
        this._apiKey = Pos.getElementValue('#pos_vendor_key');
        this._eftposAddress = Pos.getElementValue('#eftpos_address');
        this._serialNumber = Pos.getElementValue('#serial_number');

        this._spi.SetPosId(this._posId);
        this._spi.SetDeviceApiKey(this._apiKey);
        this._spi.SetEftposAddress(this._eftposAddress);
        this._spi.SetSerialNumber(this._serialNumber);

        localStorage.setItem('pos_id', this._posId);
        localStorage.setItem('pos_vendor_key', this._apiKey);
        localStorage.setItem('eftpos_address', this._eftposAddress);
        localStorage.setItem('auto_resolve_eftpos_address', this._autoResolveEftposAddress.toString());
        localStorage.setItem('serial_number', this._serialNumber);
        localStorage.setItem('test_mode', this._testMode.toString());
        localStorage.setItem('use_secure_web_sockets', this._useSecureWebSockets.toString());

        this._log.info(`Saved settings`);
      }

      this._spi.Config.PromptForCustomerCopyOnEftpos = Pos.getElementCheckboxValue('#rcpt_from_eftpos');
      this._spi.Config.SignatureFlowOnEftpos = Pos.getElementCheckboxValue('#sig_flow_from_eftpos');

      localStorage.setItem('rcpt_from_eftpos', this._spi.Config.PromptForCustomerCopyOnEftpos);
      localStorage.setItem('sig_flow_from_eftpos', this._spi.Config.SignatureFlowOnEftpos);

      this.PrintPairingStatus();

      return false;
    });

    this.addUiOperation('#auto_resolve_eftpos_address', 'change', () => {
      (document.getElementById('eftpos_address') as HTMLInputElement).disabled = Pos.getElementCheckboxValue(
        '#auto_resolve_eftpos_address'
      );
    });

    this.addUiOperation('#use_secure_web_sockets', 'change', () => {
      const isSecure = Pos.getElementCheckboxValue('#use_secure_web_sockets');

      this._spi.SetSecureWebSockets(isSecure);
    });

    this.addUiOperation('#print_merchant_copy', 'click', () => {
      terminalStatus.setIsMerchantReceiptPrinted(
        this._flowMsg,
        this._spi,
        Pos.getElementCheckboxValue('#print_merchant_copy'),
        this.PrintStatusAndActions
      );
    });

    this.addUiOperation('#save_receipt', 'click', () =>
      terminalStatus.setCustomReceiptStrings(
        this._flowMsg,
        this._options,
        this._spi,
        this.PrintStatusAndActions,
        Pos.getElementSanitizedValue('#receipt_header'),
        Pos.getElementSanitizedValue('#receipt_footer'),
        Pos.getElementSanitizedValue('#receipt_header'),
        Pos.getElementSanitizedValue('#receipt_footer')
      )
    );

    this.addUiOperation('#pair', 'click', () => pairing.pair(this._spi));
    this.addUiOperation('#pair_confirm', 'click', () => pairing.pairingConfirmCode(this._spi));
    this.addUiOperation('#pair_cancel', 'click', () => pairing.pairingCancel(this._spi));
    this.addUiOperation('#unpair', 'click', () => pairing.unpair(this._spi));

    this.addUiOperation('#purchase', 'click', () =>
      purchase.initiatePurchase(
        this._flowMsg,
        this._options,
        this._spi,
        Pos.getElementNumberValue('#amount'),
        Pos.getElementNumberValue('#tip_amount'),
        Pos.getElementNumberValue('#cashout_amount'),
        Pos.getElementNumberValue('#surcharge_amount'),
        Pos.getElementCheckboxValue('#prompt_for_cash')
      )
    );

    this.addUiOperation('#refund', 'click', () =>
      refund.initiateRefund(
        this._flowMsg,
        this._spi,
        Pos.getElementNumberValue('#amount'),
        Pos.getElementCheckboxValue('#suppress_merchant_password')
      )
    );

    this.addUiOperation('#zip_purchase', 'click', () =>
      purchase.initiateZipPurchase(
        this._flowMsg,
        this._options,
        this._spi,
        Pos.getElementNumberValue('#zip_purchase_amount'),
        Pos.getElementValue('#zip_purchase_store_code'),
        Pos.getElementValue('#zip_purchase_description')
      )
    );

    this.addUiOperation('#zip_refund', 'click', () =>
      refund.initiateZipRefund(
        this._flowMsg,
        this._options,
        this._spi,
        Pos.getElementNumberValue('#zip_refund_amount'),
        Pos.getElementValue('#zip_refund_store_code')
      )
    );

    this.addUiOperation('#cashout', 'click', () =>
      cashout.initiateCashout(
        this._flowMsg,
        this._log,
        this._spi,
        Pos.getElementNumberValue('#cashout_amount'),
        Pos.getElementNumberValue('#surcharge_amount')
      )
    );

    this.addUiOperation('#moto', 'click', () =>
      moto.initiateMotoPurchase(
        this._flowMsg,
        this._spi,
        Pos.getElementNumberValue('#amount'),
        Pos.getElementNumberValue('#surcharge_amount'),
        Pos.getElementCheckboxValue('#suppress_merchant_password')
      )
    );

    this.addUiOperation('#settle', 'click', () => settlement.initiateSettlement(this._flowMsg, this._spi));
    this.addUiOperation('#settle_enq', 'click', () =>
      settlementEnquiry.initiateSettlementEnquiry(this._flowMsg, this._spi)
    );

    this.addUiOperation('#print', 'click', () =>
      transactionFlow.printReceipt(
        this._spi,
        Pos.getElementSanitizedValue('#receipt_header'),
        Pos.getElementSanitizedValue('#receipt_footer'),
        this._apiKey || ''
      )
    );

    this.addUiOperation('#recover', 'click', () =>
      transactionFlow.initiateRecovery(this._flowMsg, this._spi, Pos.getElementValue('#pos_ref_id'))
    );
    this.addUiOperation('#glt', 'click', () => transactionFlow.initiateGetLastTransaction(this._flowMsg, this._spi));

    this.addUiOperation('#tx_sign_accept', 'click', () => transactionFlow.acceptSignature(this._spi));
    this.addUiOperation('#tx_sign_decline', 'click', () => transactionFlow.declineSignature(this._spi));
    this.addUiOperation('#tx_cancel', 'click', () => transactionFlow.cancelTransaction(this._spi));
    this.addUiOperation('#tx_auth_code', 'click', () =>
      transactionFlow.submitAuthCode(this._flowMsg, this._spi, Pos.getElementValue('#auth_code'))
    );
    this.addUiOperation('#terminal_status', 'click', () => terminalStatus.getTerminalStatus(this._spi));

    this.addUiOperation('#ok', 'click', () =>
      transactionFlow.acknowledgeCompletion(this._flowMsg, this._spi, this.PrintStatusAndActions)
    );
    this.addUiOperation('#ok_cancel', 'click', () =>
      transactionFlow.acknowledgeCancellation(this._flowMsg, this._spi, this.PrintStatusAndActions)
    );
  }

  LoadPersistedState() {
    if (localStorage.getItem('pos_id')) {
      this._posId = localStorage.getItem('pos_id') || '';
      (document.getElementById('pos_id') as HTMLInputElement).value = this._posId;
    } else {
      this._posId = Pos.getElementValue('#pos_id');
    }

    if (localStorage.getItem('pos_vendor_key')) {
      this._apiKey = localStorage.getItem('pos_vendor_key');
      (document.getElementById('pos_vendor_key') as HTMLInputElement).value = this._apiKey || '';
    } else {
      this._apiKey = Pos.getElementValue('#pos_vendor_key');
    }

    if (localStorage.getItem('eftpos_address')) {
      this._eftposAddress = localStorage.getItem('eftpos_address') || '';
      (document.getElementById('eftpos_address') as HTMLInputElement).value = this._eftposAddress;
    } else {
      this._eftposAddress = Pos.getElementValue('#eftpos_address');
    }

    this._rcptFromEftpos = localStorage.getItem('rcpt_from_eftpos') === 'true' || false;
    (document.getElementById('rcpt_from_eftpos') as HTMLInputElement).checked = this._rcptFromEftpos;
    this._sigFlowFromEftpos = localStorage.getItem('sig_flow_from_eftpos') === 'true' || false;
    (document.getElementById('sig_flow_from_eftpos') as HTMLInputElement).checked = this._sigFlowFromEftpos;

    if (localStorage.getItem('EncKey') && localStorage.getItem('HmacKey')) {
      this._spiSecrets = new Secrets(localStorage.getItem('EncKey'), localStorage.getItem('HmacKey'));
    }

    if (localStorage.getItem('serial_number')) {
      this._serialNumber = localStorage.getItem('serial_number') || '';
      (document.getElementById('serial_number') as HTMLInputElement).value = this._serialNumber;
    }

    if (localStorage.getItem('auto_resolve_eftpos_address')) {
      this._autoResolveEftposAddress = !!localStorage.getItem('auto_resolve_eftpos_address') || false;
      (document.getElementById(
        'auto_resolve_eftpos_address'
      ) as HTMLInputElement).checked = this._autoResolveEftposAddress;
    }

    this._testMode = localStorage.getItem('test_mode') === 'true' || false;
    (document.getElementById('test_mode') as HTMLInputElement).checked = this._testMode;
    this._useSecureWebSockets = localStorage.getItem('use_secure_web_sockets') === 'true' || false;
    (document.getElementById('use_secure_web_sockets') as HTMLInputElement).checked = this._useSecureWebSockets;
  }
}

export default RamenPos;
