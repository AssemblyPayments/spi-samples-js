import React from 'react';
import { SpiStatus } from '@mx51/spi-client-js';

import { Alert } from 'react-bootstrap';

function Inprogress(props: any) {
  const { terminal } = props;
  let message = 'Unpaired';
  let alert: 'danger' | 'success' | 'warning' = 'danger';
  const isFinishedPairing =
    (terminal.status === SpiStatus.Unpaired && !terminal.pairingFlow) || terminal?.pairingFlow?.Finished;

  if (terminal.status === SpiStatus.PairedConnected && isFinishedPairing) {
    message = 'Paired connected';
    alert = 'success';
  } else if (terminal.status === SpiStatus.Unpaired && !isFinishedPairing) {
    message = `${terminal?.pairingFlow?.Message}`;
    alert = 'warning';
  } else if (terminal.status === SpiStatus.PairedConnecting && !isFinishedPairing) {
    message = 'Attempting to Connect';
    alert = 'warning';
  } else {
    message = 'Unpaired';
    alert = 'danger';
  }

  return (
    <div>
      <h2 className="sub-header">Status</h2>
      <div className="ml-3 mr-3">
        <Alert id="alertMessage" variant={alert}>
          {message}
        </Alert>
        {terminal && terminal?.pairingFlow?.ConfirmationCode && !isFinishedPairing ? (
          <Alert variant="warning">
            Please confirm the following code is shown on the EFTPOS terminal:
            <p>{terminal?.pairingFlow?.ConfirmationCode}</p>
          </Alert>
        ) : (
          ''
        )}
      </div>
    </div>
  );
}

export default Inprogress;
