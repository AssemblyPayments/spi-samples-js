import React from 'react';
import { Spi } from '@mx51/spi-client-js';
import SPI from '../../pages/Burger/spi';

function Flow(props: any) {
  const { terminal } = props;
  function showPairingUpdate(pairingFlow: any) {
    if (pairingFlow && !pairingFlow.Message) return '';
    if (pairingFlow.Successful) {
      const { spi } = SPI.getInstance(terminal.id);
      return `
      # --------------- STATUS ------------------
      # ${spi._posId} <-> Eftpos: ${spi._eftposAddress} #
      # SPI STATUS: ${spi.CurrentStatus}     FLOW: ${spi.CurrentFlow} #
      # SPI CONFIG: ${JSON.stringify((spi._spiPreauth && spi._spiPreauth.Config) || spi.Config)}
      # -----------------------------------------
      # POS: v${spi._posVersion} Spi: v${Spi.GetVersion()}
      `;
    }

    return `
      ### PAIRING PROCESS UPDATE ###
      # ${pairingFlow.Message}
      # Finished? ${pairingFlow.Finished}
      # Successful? ${pairingFlow.Successful}
      # Confirmation Code: ${pairingFlow.ConfirmationCode}
      # Waiting Confirm from Eftpos? ${pairingFlow.AwaitingCheckFromEftpos}
      # Waiting Confirm from POS? ${pairingFlow.AwaitingCheckFromPos}
            `;
  }

  return (
    <div>
      <h2 className="sub-header">Flow </h2>
      <pre className="ml-3 mr-3" style={{ whiteSpace: 'pre-line' }}>
        {showPairingUpdate(terminal && terminal.pairingFlow ? terminal.pairingFlow : {})}
      </pre>
    </div>
  );
}

export default Flow;
