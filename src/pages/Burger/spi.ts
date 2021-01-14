import { Secrets as SPISecrets, Spi as SPIClient, SpiStatus, TransactionOptions } from '@mx51/spi-client-js';
import { v4 as uuid } from 'uuid';
import events from '../../constants/events';
import eventBus from './eventBus';
import EventTarget from '../../utils/eventTarget';
import Pos from '../../services/_common/pos';

class SPI {
  libraryInstances: any;
  globalConfig: any;
  posIdInstanceMap: any;

  constructor() {
    this.globalConfig = {};
    this.libraryInstances = {};
    this.posIdInstanceMap = {};
  }

  spiAddTerminal(config: any) {
    const instance = this.createLibraryInstance(config);
    const terminalConfig = { ...config };
    this.log.info({ message: 'created new instance', id: instance.id });

    const { CurrentFlow, CurrentPairingFlowState, CurrentStatus, CurrentTxFlowState } = instance.spi;
    return SPI.createEventPayload(instance.id, {
      status: CurrentStatus,
      terminalStatus: 'Idle',
      flow: CurrentFlow,
      txFlow: CurrentTxFlowState,
      terminalConfig,
    });
  }

  spiUnpairTerminal(id: any) {
    this.getInstance(id).spi.Unpair();

    return SPI.createEventPayload(id, {
      ...this.getCurrentPairingFlow(id),
    });
  }

  spiCancelPairingTerminal(id: any) {
    this.getInstance(id).spi.PairingCancel();

    return SPI.createEventPayload(id, {
      ...this.getCurrentPairingFlow(id),
    });
  }

  spiRemoveTerminal(id: string) {
    const { _posId: posId, _transactionMonitoringThread: transactionMonitoringThread } = this.getInstance(id).spi;
    // There is a setTimeout that need to be stopped so the library can be garbage collected
    clearInterval(transactionMonitoringThread);

    delete this.posIdInstanceMap[posId];
    delete this.libraryInstances[id];
    this.log.info({ message: 'instance removed', id });

    return SPI.createEventPayload(id, {});
  }

  spiSaveTerminalConfig(id: string, config: any) {
    const { spi } = this.getInstance(id);
    // Auto-address needs to be disabled to change an eftpos address
    spi.SetTestMode(config.testMode);
    spi.SetSecureWebSockets(config.secureWebSocket);
    spi.SetPosId(config.posId);
    // spi.SetSerialNumber(config.serialNumber);
    spi.SetAutoAddressResolution(config.autoAddress);
    spi.SetDeviceApiKey(config.apiKey);
    spi.SetEftposAddress(config.eftpos);
    if (spi.HasSerialNumberChanged(config.serialNumber)) {
      spi.SetSerialNumber(config.serialNumber);
    }

    const terminalConfig = { ...config };

    const event = SPI.createEventPayload(id, {
      terminalConfig,
    });
    console.log({ event });

    return event;
  }

  spiPairTerminal(id: string, config: any) {
    const { spi } = this.getInstance(id);

    // spi.SetPosId(config.posId);
    // // Auto-address needs to be disabled to change an eftpos address
    // spi.SetAutoAddressResolution(config.autoAddress);
    // spi.SetTestMode(config.testMode);
    // spi.SetEftposAddress(config.eftpos);
    // spi.SetDeviceApiKey(config.apiKey);
    // spi.SetSecureWebSockets(config.secureWebSocket);
    // if (spi.HasSerialNumberChanged(config.serialNumber)) {
    //   spi.SetSerialNumber(config.serialNumber);
    // }

    spi.Pair();
    const terminalConfig = { ...config };

    SPI.broadcastEvent(id, {
      type: 'StatusChanged',
      detail: SpiStatus.PairedConnecting,
    });

    return SPI.createEventPayload(id, {
      terminalConfig,
    });
  }

  spiUpdateSetting(instanceId: string, config: any) {
    const { spi } = this.getInstance(instanceId);

    spi.Config.PromptForCustomerCopyOnEftpos = config.eftposReceipt;
    spi.Config.SignatureFlowOnEftpos = config.sigFlow;
    spi.Config.PrintMerchantCopy = config.printMerchantCopy;
    const options = new TransactionOptions();
    spi._options = options;
    options.SetCustomerReceiptHeader(Pos.sanitizePrintText(config.receiptHeader));
    options.SetCustomerReceiptFooter(Pos.sanitizePrintText(config.receiptFooter));
    options.SetMerchantReceiptHeader(Pos.sanitizePrintText(config.receiptHeader));
    options.SetMerchantReceiptFooter(Pos.sanitizePrintText(config.receiptFooter));
    spi.AckFlowEndedAndBackToIdle();

    // flowMsg.Info('Receipt header / footer updated.');
    // printStatusAndActions();

    return SPI.createEventPayload(instanceId, config);
  }

  getInstance(instanceId: string) {
    return this.libraryInstances[instanceId];
  }

  initalizeInstances(state: any) {
    const { terminals } = state || { terminals: [] };
    if (!terminals) return;

    Object.entries(terminals)
      .filter((e) => e[0] !== 'activeTerminal')
      .map((e) => e[1])
      .forEach((t: any) => {
        const { id, terminalConfig, setting, secret } = t;
        console.log('init spi', id, terminalConfig, setting);

        if (id && terminalConfig) {
          this.createLibraryInstance(terminalConfig, id, secret);
          this.spiSaveTerminalConfig(id, terminalConfig);
          if (id && setting) {
            this.spiUpdateSetting(id, setting);
          }
          this.spiPairTerminal(id, terminalConfig);
        }
      });
  }

  createLibraryInstance(config: any, instanceId = uuid(), secret: any = null): EventTarget {
    const name = 'mx51';
    const version = '2.8.0';
    console.log('createLibraryInstance', config, secret);

    const instance = new EventTarget();
    instance.id = instanceId;
    this.libraryInstances[instance.id] = instance;
    instance.spi = new SPIClient(config?.posId || '', config?.serialNumber || '', config?.eftpos || '', secret || null);
    instance.spi.SetEventBus(instance);

    instance.spi.SetPosInfo(name, version);
    instance.spi.SetAcquirerCode('wbc');
    instance.spi.SetDeviceApiKey(config?.apiKey || 'RamenPosDeviceIpApiKey');
    instance.spi.SetSecureWebSockets(config?.secureWebSocket || false); // prefer IP over FQDN
    instance.spi._inTestMode = config?.testMode || false;
    instance.spi.SetAutoAddressResolution(config?.autoAddress || '');
    instance.spi.PrintingResponse = () => true;

    // this is used in tx flow state overrride mechanism to emulate SPI tx flow change
    // wihtout mutating spi client's tx flow object.
    instance.currentTxFlowStateOverride = null; // we start with no override
    // we patch TxFlowStateChanged events with our overrride so that every
    // consumer is seeing our override when required without changing every
    // single consumer to check with spice.spi

    instance.setEventMapper(events.spiTxFlowStateChanged, (e: any) => {
      console.log('instance.setEventMapper(events.spiTxFlowStateChanged', e);

      const { detail } = e;

      // if this is not an override but "EFTPOS" event, we reset our override:
      if (!detail.override) instance.currentTxFlowStateOverride = null;

      const updatedEvent = {
        type: events.spiTxFlowStateChanged,
        detail: this.getCurrentTxFlow(instanceId),
      };

      // Auto acknowledge Settlements and SettlementEnquires when there is no UI
      // const isHeadlessMode = this.globalConfig.data.HeadlessTransactions;
      // if (isHeadlessMode) {
      //   instance.spi.AckFlowEndedAndBackToIdle();
      // }
      instance.spi.AckFlowEndedAndBackToIdle();
      SPI.broadcastEvent(instance.id, updatedEvent);
      return updatedEvent;
    });

    instance.addEventListener(events.spiTxFlowStateChanged, (e: any) => {
      console.log('addEventListener events.spiTxFlowStateChanged', e);
    });

    instance.addEventListener(events.spiPairingFlowStateChanged, (e: any) => {
      const { detail } = e;

      if (detail?.ConfirmationCode && !detail.AwaitingCheckFromEftpos && detail.AwaitingCheckFromPos) {
        instance.spi.PairingConfirmCode();
      }

      // this.getTerminalStatus(instanceId);
      // this.getTerminalConfig(instanceId);

      SPI.broadcastEvent(instanceId, e);
    });

    instance.addEventListener(events.spiSecretsChanged, (e: any) => {
      this.log.info({ message: 'keys rolled', id: instanceId, e });
      console.log('secret', { e });

      // this.setConfig({ Secrets: updatedSecrets }, instanceId, true);
      SPI.broadcastEvent(instanceId, { type: 'SecretsChanged', detail: { ...e.detail } });
    });

    instance.addEventListener(events.spiDeviceAddressChanged, (e: any) => {
      console.log('spiDeviceAddressChanged', e);

      SPI.broadcastEvent(instanceId, e);
    });

    instance.addEventListener(events.spiStatusChanged, (e: any) => {
      // this.getTerminalStatus(instanceId);
      // this.getTerminalConfig(instanceId);
      if (e.detail && e.detail === 'PairedConnected') {
        instance.spi.AckFlowEndedAndBackToIdle();
      }

      SPI.broadcastEvent(instanceId, e);

      // const { detail: CurrentStatus } = e;
      // return CurrentStatus === SpiStatus.PairedConnected && this.retriveConfig(instanceId);
    });

    instance.addEventListener(events.spiTxUpdateMessage, (e: any) => {
      // this.getTerminalStatus(instanceId);
      // this.getTerminalConfig(instanceId);
      // SPI.broadcastEvent(instanceId, e);

      SPI.broadcastEvent(instance.id, e);
      // return CurrentStatus === SpiStatus.PairedConnected && this.retriveConfig(instanceId);
    });

    instance.addEventListener(events.spiTerminalConfigChanged, (e: any) => {
      // this.getTerminalStatus(instanceId);
      // this.getTerminalConfig(instanceId);
      // SPI.broadcastEvent(instanceId, e);

      SPI.broadcastEvent(instance.id, e);
      // return CurrentStatus === SpiStatus.PairedConnected && this.retriveConfig(instanceId);
    });

    instance.addEventListener(events.spiTerminalStatusChanged, (e: any) => {
      console.log('a12ddEventListener spiTerminalStatusChanged', e);

      SPI.broadcastEvent(instance.id, e);
    });

    instance.spi.TransactionUpdateMessage = (message: any) => {
      // SPI.broadcastEvent(instance.id, {
      //   type: events.spiTxUpdateMessage,
      //   ...message,
      // });
      console.log('TransactionUpdateMessage', message);

      instance.dispatchEvent(
        new CustomEvent(events.spiTxUpdateMessage, {
          detail: message,
        })
      );

      this.log.info({ message: 'transaction update', data: message, id: instance.id });
    };

    instance.spi.TerminalConfigurationResponse = (e: any) => {
      instance.dispatchEvent(
        new CustomEvent(events.spiTerminalConfigChanged, {
          detail: e.Data,
        })
      );
      // SPI.broadcastEvent(instanceId, {
      //   type: events.spiTerminalConfigChanged,
      //   detail: {
      //     ...e.Data,
      //     updatedAt: e.DateTimeStamp,
      //   },
      // });
    };

    instance.spi.TerminalStatusResponse = (e: any) => {
      console.log('addEvent TerminalStatusResponse', e);
      instance.spi.AckFlowEndedAndBackToIdle();
      instance.dispatchEvent(
        new CustomEvent(events.spiTerminalStatusChanged, {
          detail: e.Data,
        })
      );
    };

    instance.spi.Start();
    // window.setTimeout(() => instance.spi.Pair(), 1000);
    return instance;
  }

  log = {
    info: function info(message: any) {
      console.log(message);
    },
  };

  static createEventPayload(instanceId: String, payload: any) {
    return { id: instanceId, payload };
  }

  static broadcastEvent(instanceId: string, event: any) {
    const { detail: payload, type } = event;
    eventBus.dispatchEvent(new CustomEvent(type, { detail: SPI.createEventPayload(instanceId, payload) }));
  }

  getCurrentPairingFlow(instanceId: string) {
    return this.getInstance(instanceId).spi.CurrentPairingFlowState;
  }

  getCurrentTxFlow(instanceId: string) {
    const instance = this.getInstance(instanceId);
    return instance.currentTxFlowStateOverride || instance.spi.CurrentTxFlowState;
  }
}

export default new SPI();
