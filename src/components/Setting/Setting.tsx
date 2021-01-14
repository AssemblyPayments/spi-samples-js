import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Col, Row, Modal, Button } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { Logger, TransactionType } from '@mx51/spi-client-js';
import SettingConfig from '../SettingConfig';
import Actions from '../Actions';
import {
  settlement as settlementService,
  settlementEnquiry as settlementEnquiryService,
  terminalStatus as terminalStatusService,
  transactionFlow as transactionFlowService,
} from '../../services';
import { updateSetting as updateSettingAction } from '../../features/terminals/terminalSlice';
import eventBus from '../../pages/Burger/eventBus';
// import events from '../../constants/events';
import PosUtils from '../../services/_common/pos';

function handleActionCallback(
  event: TxFlowStateChangedEvent,
  setModel: Function,
  flowEl: React.RefObject<HTMLPreElement>,
  receiptEl: React.RefObject<HTMLPreElement>,
  actionType: string,
  spi: Spi
) {
  const flowMsg = new Logger(flowEl.current);
  const receipt = new Logger(receiptEl.current);

  if (event.detail.Finished) {
    if (event.detail.Response.Data.error_reason === 'HOST_DECLINED') {
      setModel('Please enter currect date');
    }
    if (event.detail.Response.Data.error_reason === 'OPERATION_IN_PROGRESS') {
      setModel('Please check your terminal is paired');
    }
    let eventType = null;
    if (actionType === TransactionType.SettlementEnquiry) {
      eventType = settlementEnquiryService;
    } else {
      eventType = settlementService;
    }
    PosUtils.processCompletedEvent(flowMsg, receipt, eventType, event.detail);
    spi.AckFlowEndedAndBackToIdle();
  } else {
    transactionFlowService.handleTransaction(flowMsg, event.detail);
  }
}

function terminalStatus(spi: any, flowEl: React.RefObject<HTMLPreElement>) {
  spi.GetTerminalStatus();
  const flowMsg = new Logger(flowEl.current);
  flowMsg.Clear();
  // eslint-disable-next-line no-param-reassign
  spi.TerminalStatusResponse = (message: Message) =>
    terminalStatusService.handleTerminalStatusResponse(flowMsg, spi, message, () => {});
}

function Setting(props: { spi: Spi; status: string; errorMsg: string; onErrorMsg: Function; terminal: any }) {
  const { spi, errorMsg, onErrorMsg, terminal } = props;
  const flowEl = useRef<HTMLPreElement>(null);
  const receiptEl = useRef<HTMLPreElement>(null);

  const [actionType, setActionType] = useState<string>('');
  const [model, setModel] = useState('');

  const handleAction = useCallback(
    (event: TxFlowStateChangedEvent) =>
      handleActionCallback({ detail: event.detail.payload }, setModel, flowEl, receiptEl, actionType, spi),
    [actionType, spi]
  );

  const dispatch = useDispatch();
  const updateSetting = (id: string, config: any) => dispatch(updateSettingAction(id, config));

  useEffect(() => {
    eventBus.addEventListener('TxFlowStateChanged', handleAction);
    return function cleanup() {
      eventBus.removeEventListener('TxFlowStateChanged', handleAction);
    };
  });

  return (
    <div>
      <Row>
        <Col lg={4} className="sub-column">
          <div className="flex-fill d-flex flex-column">
            <SettingConfig
              terminal={terminal}
              handleSaveSetting={(
                eftposReceipt: boolean,
                sigFlow: boolean,
                printMerchantCopy: boolean,
                receiptHeader: string,
                receiptFooter: string,
                suppressMerchantPassword: boolean
              ) =>
                updateSetting(terminal.id, {
                  eftposReceipt,
                  sigFlow,
                  printMerchantCopy,
                  suppressMerchantPassword,
                  receiptHeader,
                  receiptFooter,
                })
              }
            />
          </div>
          <div className="flex-fill">
            <Actions
              spi={spi}
              setActionType={setActionType}
              flowEl={flowEl}
              receiptEl={receiptEl}
              getTerminalStatus={() => terminalStatus(spi, flowEl)}
              status={terminal.status}
              errorMsg={errorMsg}
              onErrorMsg={onErrorMsg}
            />
          </div>
        </Col>
        <Col lg={5} className="sub-column d-flex flex-column">
          <div className="flex-fill ">
            {/* <Flow ref={flowEl} /> */}
            <div>
              <h2 className="sub-header">Flow </h2>
              <pre className="ml-3 mr-3" style={{ whiteSpace: 'pre-line' }} ref={flowEl} />
            </div>
          </div>
        </Col>
        <Col lg={3} className="sub-column d-flex flex-column">
          <div className="flex-fill ">
            <h2 className="sub-header">Receipt</h2>
            <pre className="receipt-alignment" ref={receiptEl} />
          </div>
        </Col>
      </Row>
      <Modal show={model !== ''} onHide={() => setModel('')}>
        <Modal.Header closeButton>
          <Modal.Title>ERROR</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{model}</p>
          <Button variant="primary" className="btn-custom" onClick={() => setModel('')} block>
            OK
          </Button>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Setting;
