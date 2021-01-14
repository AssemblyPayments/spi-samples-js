import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { Logger } from '@mx51/spi-client-js';
import PairingConfig from '../PairingConfig';
import Flow from '../Flow';
import Status from '../Status';
import { pairing as pairingService } from '../../services';

type Props = {
  confirmationCode: string;
  isAwaitingConfirmation: boolean;
  isFinishedPairing: boolean;
  message: String;
  spi: Spi;
  status: string;
  setPairingState: Function;
};

function Pairing({
  confirmationCode,
  spi,
  isAwaitingConfirmation,
  isFinishedPairing,
  status,
  message,
  setPairingState,
}: Props) {
  const flowEl = useRef<HTMLDivElement>(null);

  const handlePairingStatusChange = useCallback((event: PairingFlowState) => {
    console.log('event', event);
    const flowMsg = new Logger(flowEl.current);
    const { AwaitingCheckFromPos, ConfirmationCode, Finished, Message } = event.detail;
    setTimeout(() => {
      if (flowMsg.element) {
        if (event.detail.Message !== 'Pairing Successful!') {
          pairingService.handlePairingUpdate(flowMsg, spi.CurrentPairingFlowState);
        } else {
          pairingService.printPairingStatus(flowMsg, spi);
        }
      }
    }, 1);
    setPairingState({
      AwaitingCheckFromPos,
      ConfirmationCode,
      Finished,
      Message,
    });
  }, []);
  useEffect(() => {
    document.addEventListener('PairingFlowStateChanged', handlePairingStatusChange);
    return function cleanup() {
      document.removeEventListener('PairingFlowStateChanged', handlePairingStatusChange);
    };
  }, [handlePairingStatusChange]);

  const [pairButton, setPairButton] = useState(false);

  return (
    <div>
      <Row>
        <Col lg={4} className="sub-column">
          <div className="flex-fill d-flex flex-column">
            <PairingConfig
              isFinishedPairing={isFinishedPairing}
              spi={spi}
              status={status}
              setPairButton={setPairButton}
            />
          </div>
          <div className="flex-fill">
            <Status
              status={status}
              isFinishedPairing={isFinishedPairing}
              spi={spi}
              Message={message}
              pairButton={pairButton}
            />
          </div>
        </Col>
        <Col lg={8} className="sub-column d-flex flex-column">
          <div className="flex-fill text-break">
            <Flow ref={flowEl} />
          </div>
        </Col>
      </Row>
    </div>
  );
}
export default Pairing;
