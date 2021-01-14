const eventTypes = {
  electronActivate: 'activate',
  electronBeforeQuit: 'before-quit',
  electronClose: 'close',
  electronReady: 'ready',
  electronSecondInstance: 'second-instance',

  spiceAcceptEULA: 'spiceAcceptEULA',
  spiceAddTerminal: 'spiceAddTerminal',
  spiceDeclineEULA: 'spiceDeclineEULA',
  spiceGetAllTerminalDetails: 'spiceGetAllTerminalDetails',
  spiceBillPaymentReceived: 'spiceBillPaymentReceived',
  spiceBillStatusReceived: 'spiceBillStatusReceived',
  spiceConfigChanged: 'spiceConfigChanged',
  spiceDismissNotifications: 'spiceDismissNotifications',
  spiceGetBillStatus: 'spiceGetBillStatus',
  spiceGetConfig: 'spiceGetConfig',
  spiceGetNotifications: 'spiceGetNotifications',
  spiceNotificationsChanged: 'spiceNotificationsChanged',
  spiceRemoveTerminal: 'spiceRemoveTerminal',
  spiceTxFlowOverride: 'spiceTxFlowOverride',
  spiceTxLogChanged: 'spiceTxLogChanged',

  spiceUpdaterDownload: 'spiceUpdaterDownload',
  spiceUpdaterGetLatest: 'spiceUpdaterGetLatest',
  spiceUpdaterGetStatus: 'spiceUpdaterGetStatus',
  spiceUpdaterLatestChanged: 'spiceUpdaterLatestChanged',
  spiceUpdaterStatusChanged: 'spiceUpdaterStatusChanged',
  spiceUpdaterUninstall: 'spiceUpdaterUninstall',
  spiceUpdaterUpgrade: 'spiceUpdaterUpgrade',

  spiCallAcceptSignature: 'spiCallAcceptSignature',
  spiCallAckFlowEnd: 'spiCallAckFlowEnd',
  spiCallCancelTx: 'spiCallCancelTx',
  spiCallGetTerminalConfig: 'spiCallGetTerminalConfig',
  spiCallGetTerminalStatus: 'spiCallGetTerminalStatus',
  spiCallInitiateTx: 'spiCallInitiateTx',
  spiCallPair: 'spiCallPair',
  spiCallPairingCancel: 'spiCallPairingCancel',
  spiCallPairingConfirmCode: 'spiCallPairingConfirmCode',
  spiCallSetConfig: 'spiCallSetConfig',
  spiCallUnpair: 'spiCallUnpair',

  spiAutoAddressResolutionFailed: 'AutoAddressResolutionFailed',
  spiDeviceAddressChanged: 'DeviceAddressChanged',
  spiSecretsChanged: 'SecretsChanged',
  spiFlowChanged: 'spiFlowChanged',
  spiPairingFlowStateChanged: 'PairingFlowStateChanged',
  spiPong: 'SpiPong',
  spiStatusChanged: 'StatusChanged',
  spiTerminalConfigChanged: 'TerminalConfigChanged',
  spiTerminalStatusChanged: 'TerminalStatusChanged',
  spiTxFlowStateChanged: 'TxFlowStateChanged',
  spiTxUpdateMessage: 'TransactionUpdateMessage',
};

export { eventTypes as default };
