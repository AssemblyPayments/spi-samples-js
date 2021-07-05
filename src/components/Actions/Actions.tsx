import React from 'react';
import { Logger, SpiStatus, TransactionType } from '@mx51/spi-client-js';
import { Modal, Button } from 'react-bootstrap';

import { settlement as settlementService, settlementEnquiry as settlementEnquiryService } from '../../services';

function settlementEnquiry(
  status: string,
  onErrorMsg: Function,
  setActionType: Function,
  receiptEl: React.RefObject<HTMLPreElement>,
  flowEl: React.RefObject<HTMLDivElement>,
  spi: Spi
) {
  if (status !== SpiStatus.PairedConnected && SpiStatus.PairedConnecting) {
    onErrorMsg('Please pair your POS to the terminal or check your network connection');
  } else {
    const flowMsg = new Logger(flowEl.current);
    setActionType(TransactionType.SettlementEnquiry);
    if (receiptEl.current !== null) {
      const receiptMsg = new Logger(receiptEl.current);
      receiptMsg.Clear();
    }
    settlementEnquiryService.initiateSettlementEnquiry(flowMsg, spi);
  }
}

function settlement(
  status: string,
  onErrorMsg: Function,
  setActionType: Function,
  receiptEl: React.RefObject<HTMLPreElement>,
  flowEl: React.RefObject<HTMLDivElement>,
  spi: Spi
) {
  if (status !== SpiStatus.PairedConnected && SpiStatus.PairedConnecting) {
    onErrorMsg('Please pair your POS to the terminal or check your network connection');
  } else {
    const flowMsg = new Logger(flowEl.current);
    setActionType(TransactionType.Settle);
    if (receiptEl.current !== null) {
      const receiptMsg = new Logger(receiptEl.current);
      receiptMsg.Clear();
    }
    settlementService.initiateSettlement(flowMsg, spi);
  }
}

function terminalStatus(status: string, onErrorMsg: Function, receiptEl: any, spi: any, getTerminalStatus: Function) {
  if (status !== SpiStatus.PairedConnected && SpiStatus.PairedConnecting) {
    onErrorMsg('Please pair your POS to the terminal or check your network connection');
  } else {
    if (receiptEl.current !== null) {
      const receiptMsg = new Logger(receiptEl.current);
      receiptMsg.Clear();
    }
    getTerminalStatus(spi);
  }
}
function Actions(props: {
  spi: Spi;
  setActionType: Function;
  flowEl: React.RefObject<HTMLDivElement>;
  getTerminalStatus: Function;
  receiptEl: React.RefObject<HTMLPreElement>;
  status: string;
  errorMsg: string;
  onErrorMsg: Function;
}) {
  const { spi, setActionType, flowEl, getTerminalStatus, receiptEl, status, errorMsg, onErrorMsg } = props;

  return (
    <div>
      <h2 className="sub-header">Actions</h2>
      <Modal show={errorMsg !== ''} onHide={() => onErrorMsg('')}>
        <Modal.Header closeButton>
          <Modal.Title>Alert</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{errorMsg}</p>
          <Button variant="primary" className="btn-custom" onClick={() => onErrorMsg('')} block>
            OK
          </Button>
        </Modal.Body>
      </Modal>
      <div className="ml-2 mr-2">
        <button
          id="btnSettlement"
          type="button"
          className="btn btn-primary rounded-0 btn-block btn-lg"
          onClick={() => settlement(status, onErrorMsg, setActionType, receiptEl, flowEl, spi)}
        >
          Settlement
        </button>
        <button
          id="btnSettlementEnquiry"
          type="button"
          className="btn btn-primary rounded-0 btn-block btn-lg"
          onClick={() => settlementEnquiry(status, onErrorMsg, setActionType, receiptEl, flowEl, spi)}
        >
          Settlement Enquiry
        </button>
        <button
          id="btnTerminalStatus"
          type="button"
          className="btn btn-primary rounded-0 btn-block btn-lg"
          onClick={() => terminalStatus(status, onErrorMsg, receiptEl, spi, getTerminalStatus)}
        >
          Terminal Status
        </button>
      </div>
    </div>
  );
}

export default Actions;
