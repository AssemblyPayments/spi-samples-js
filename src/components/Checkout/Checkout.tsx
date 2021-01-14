import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SuccessState, Logger, TransactionType, TransactionUpdate } from '@mx51/spi-client-js';
import { Col, Row, Modal, Button } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import './Checkout.scss';
import Tick from '../Tick';
import OrderPay from '../OrderPay';
import RefundPay from '../RefundPay';
import CashOutPay from '../CashOutPay';
import PosUtils from '../../services/_common/pos';
import SigApproval from '../SigApproval';
import {
  purchase as purchaseService,
  moto as motoService,
  transactionFlow as transactionFlowService,
  refund as refundService,
  cashout as cashoutService,
} from '../../services';
import { selectPairedTerminals } from '../../features/terminals/terminalSelectors';

const isTransactionInquiry = (transactionType: String) =>
  [TransactionType.GetTransaction, TransactionType.GetLastTransaction].includes(transactionType);

function handleApproveSig(isApproved: boolean, spi: Spi, setShowSigApproval: Function) {
  if (isApproved) {
    transactionFlowService.acceptSignature(spi);
  } else {
    transactionFlowService.declineSignature(spi);
  }
  setShowSigApproval(false);
}

function handleTransactionMessageUpdateCallback(m: Message, flowLogger: Logger) {
  const txnUpdateMessage = new TransactionUpdate(m.detail);
  flowLogger.Info(`${txnUpdateMessage.GetDisplayMessageText()}`);
}

function handlePurchaseStatusCallback(
  event: TxFlowStateChangedEvent,
  flowEl: React.RefObject<HTMLDivElement>,
  receiptEl: React.RefObject<HTMLPreElement>,
  setShowSigApproval: Function,
  setShowUnknownModal: Function,
  spi: Spi,
  transactionAction: String
) {
  const flowMsg = new Logger(flowEl.current);
  const receipt = new Logger(receiptEl.current);

  if (event.detail.AwaitingSignatureCheck) {
    setShowSigApproval(true);
  }
  if (event.detail.Finished && event.detail.Success === SuccessState.Unknown) {
    setShowUnknownModal(true);
  }

  if (event.detail.Finished) {
    if (isTransactionInquiry(transactionAction)) {
      if (transactionAction === TransactionType.GetLastTransaction) {
        transactionFlowService.handleGetLastTransaction(flowMsg, receipt, spi, spi.CurrentTxFlowState);
      } else if (transactionAction === TransactionType.GetTransaction) {
        transactionFlowService.handleGetTransaction(flowMsg, receipt, spi.CurrentTxFlowState);
      }
      spi.AckFlowEndedAndBackToIdle();
    } else {
      let service;
      if (transactionAction === TransactionType.Purchase) {
        service = purchaseService;
      } else if (transactionAction === TransactionType.Refund) {
        service = refundService;
      } else {
        service = cashoutService;
      }
      PosUtils.processCompletedEvent(flowMsg, receipt, service, event.detail);
    }
  } else {
    transactionFlowService.handleTransaction(flowMsg, event.detail);
  }
}

function motoPay(
  spi: Spi,
  totalAmount: number,
  surchargeAmount: number,
  amount: number,
  suppressMerchantPassword: boolean,
  setTransactionStatus: Function,
  setFinalCashout: Function,
  setFinalTipAmount: Function,
  setFinalSurcharge: Function,
  setPurchaseAmount: Function,
  setFinalTotal: Function
) {
  motoService.initiateMotoPurchase(
    { Info: () => {} },
    spi,
    totalAmount * 100,
    surchargeAmount,
    suppressMerchantPassword
  );
  setTransactionStatus(true);
  setFinalTipAmount(0);
  setFinalSurcharge(surchargeAmount / 100);
  setFinalCashout(0);
  setPurchaseAmount(amount);
  setFinalTotal(totalAmount);
}

function creditCardPay(
  tipAmount: number,
  cashoutAmount: number,
  manualAmount: number,
  openPricing: boolean,
  flowEl: React.RefObject<HTMLDivElement>,
  spi: Spi,
  amount: number,
  surchargeAmount: number,
  promptCashout: boolean,
  setTransactionStatus: Function,
  setFinalCashout: Function,
  setFinalTipAmount: Function,
  setFinalSurcharge: Function,
  setPurchaseAmount: Function,
  setFinalTotal: Function
) {
  if (openPricing === true && manualAmount > 0) {
    const flowMsg = new Logger(flowEl.current);
    purchaseService.initiatePurchase(
      flowMsg,
      spi._options,
      spi,
      manualAmount,
      tipAmount,
      cashoutAmount,
      surchargeAmount,
      promptCashout
    );
    const total = (tipAmount + cashoutAmount + surchargeAmount) / 100 + manualAmount / 100;
    setTransactionStatus(true);
    setFinalTotal(total);
    setFinalTipAmount(tipAmount / 100);
    setFinalSurcharge(surchargeAmount / 100);
    setFinalCashout(cashoutAmount / 100);
    setPurchaseAmount(manualAmount / 100);
  } else {
    const flowMsg = new Logger(flowEl.current);
    purchaseService.initiatePurchase(
      flowMsg,
      spi._options,
      spi,
      amount * 100,
      tipAmount,
      cashoutAmount,
      surchargeAmount,
      promptCashout
    );
    setTransactionStatus(true);
    const total = (tipAmount + cashoutAmount + surchargeAmount) / 100 + amount;
    setFinalTotal(total);
    setFinalTipAmount(tipAmount / 100);
    setFinalSurcharge(surchargeAmount / 100);
    setFinalCashout(cashoutAmount / 100);
    setPurchaseAmount(amount);
  }
}
function refundPay(
  refundAmount: number,
  flowEl: React.RefObject<HTMLDivElement>,
  spi: Spi,
  suppressMerchantPassword: boolean,
  setTransactionStatus: Function,
  setFinalCashout: Function,
  setFinalTipAmount: Function,
  setFinalSurcharge: Function,
  setPurchaseAmount: Function,
  setFinalTotal: Function
) {
  const flowMsg = new Logger(flowEl.current);
  refundService.initiateRefund(flowMsg, spi, refundAmount * 100, suppressMerchantPassword);
  setTransactionStatus(true);
  setFinalTotal(refundAmount);
  setPurchaseAmount(0);
  setFinalTipAmount(0);
  setFinalSurcharge(0);
  setFinalCashout(0);
}

function cashoutPay(
  cashoutAmount: number,
  flowEl: React.RefObject<HTMLDivElement>,
  spi: Spi,
  surchargeAmount: number,
  setTransactionStatus: Function,
  setFinalCashout: Function,
  setFinalTipAmount: Function,
  setFinalSurcharge: Function,
  setPurchaseAmount: Function,
  setFinalTotal: Function
) {
  const flowMsg = new Logger(flowEl.current);

  cashoutService.initiateCashout(flowMsg, console, spi, cashoutAmount * 100, surchargeAmount);
  setTransactionStatus(true);
  setFinalCashout(cashoutAmount);
  setFinalSurcharge(surchargeAmount / 100);
  setFinalTotal(cashoutAmount + surchargeAmount / 100);
  setPurchaseAmount(0);
  setFinalTipAmount(0);
}

function backAction(
  isFinished: boolean,
  onNoThanks: Function,
  setSurchargeAmount: Function,
  setTransactionStatus: Function,
  flowEl: React.RefObject<HTMLDivElement>,
  receiptEl: React.RefObject<HTMLPreElement>,
  onClose: Function,
  clearProducts: boolean
) {
  if (isFinished && clearProducts) {
    onNoThanks();
    setSurchargeAmount(0);
  }
  setTransactionStatus(false);
  if (flowEl.current !== null) {
    const flowMsg = new Logger(flowEl.current);
    flowMsg.Clear();
  }
  if (receiptEl.current !== null) {
    const receiptMsg = new Logger(receiptEl.current);
    receiptMsg.Clear();
  }

  onClose();
}

function Checkout(props: {
  visible: Boolean;
  list: Array<Product>;
  onClose: Function;
  onNoThanks: Function;
  posRefId: string;
  spi: Spi;
  surchargeAmount: number;
  setSurchargeAmount: Function;
  setTransactionStatus: Function;
  transactionStatus: boolean;
  transactionAction: string;
  showUnknownModal: boolean;
  setShowUnknownModal: Function;
  handleOverrideTransaction: Function;
  openPricing: boolean;
  setOpenPricing: Function;
  status: string;
  onErrorMsg: Function;
  currentTerminalId: string;
}) {
  const {
    onClose,
    visible,
    onNoThanks,
    spi,
    list,
    posRefId,
    surchargeAmount,
    setSurchargeAmount,
    setTransactionStatus,
    transactionStatus,
    transactionAction,
    showUnknownModal,
    setShowUnknownModal,
    handleOverrideTransaction,
    openPricing,
    setOpenPricing,
    status,
    onErrorMsg,
    currentTerminalId,
  } = props;

  const terminals = useSelector(selectPairedTerminals) as any;
  const terminal = terminals.filter((t: any) => t.id === currentTerminalId)[0];
  const suppressMerchantPassword = terminal?.setting?.suppressMerchantPassword;

  const awaitingSigCheck = terminal && terminal.txFlow ? terminal.txFlow.AwaitingSignatureCheck : false;
  const [promptCashout, setPromptCashout] = useState(false);
  const [showSigApproval, setShowSigApproval] = useState(awaitingSigCheck);
  const [finalTotal, setFinalTotal] = useState(0);
  const [finalSurcharge, setFinalSurcharge] = useState(0);
  const [finalCashout, setFinalCashout] = useState(0);
  const [finalTipAmount, setFinalTipAmount] = useState(0);
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const flowTransactionEl = useRef<HTMLDivElement>(null);
  const flowEl = useRef<HTMLDivElement>(null);
  const receiptEl = useRef<HTMLPreElement>(null);

  const txFlowFinished = terminal && terminal.txFlow ? terminal.txFlow.Finished : false;
  const txFlowSuccess = terminal && terminal.txFlow ? terminal.txFlow.Success : SuccessState.Unknown;
  const txFlowResponse = terminal && terminal.txFlow ? terminal.txFlow.Response : null;
  const txUpdateMessage = terminal && terminal.txFlow ? terminal.txMessage : null;

  const handlePurchaseStatusChange = useCallback(
    (event: TxFlowStateChangedEvent) => {
      handlePurchaseStatusCallback(
        event,
        flowEl,
        receiptEl,
        setShowSigApproval,
        setShowUnknownModal,
        spi,
        transactionAction
      );
    },
    [setShowUnknownModal, spi, transactionAction]
  );

  const handleTransactionUpdate = useCallback((event) => {
    const flowMsg = new Logger(flowTransactionEl.current);
    handleTransactionMessageUpdateCallback(event, flowMsg);
  }, []);

  useEffect(() => {
    document.addEventListener('TxFlowStateChanged', handlePurchaseStatusChange);
    return function cleanup() {
      document.removeEventListener('TxFlowStateChanged', handlePurchaseStatusChange);
    };
  });

  useEffect(() => {
    if (transactionAction === TransactionType.GetTransaction) {
      const flowMsg = new Logger(flowEl.current);
      transactionFlowService.initiateGetTransaction(flowMsg, spi, posRefId);
    }
  }, [posRefId, spi, transactionAction]);

  useEffect(() => {
    if (transactionAction === TransactionType.GetLastTransaction) {
      const flowMsg = new Logger(flowEl.current);
      transactionFlowService.initiateGetLastTransaction(flowMsg, spi);
    }
  }, [spi, transactionAction]);

  useEffect(() => {
    document.addEventListener('TxnUpdateMessage', handleTransactionUpdate);
    return function cleanup() {
      document.removeEventListener('TxnUpdateMessage', handleTransactionUpdate);
    };
  });

  const totalBillAmount: number = list.reduce(
    (total: number, product: Product) => total + parseFloat(product.price) * product.quantity,
    0
  );
  const totalAmount = totalBillAmount + surchargeAmount / 100;
  const amount = totalBillAmount;

  function handleBackAndClearProduts() {
    backAction(txFlowFinished, onNoThanks, setSurchargeAmount, setTransactionStatus, flowEl, receiptEl, onClose, false);
  }

  function handleBack() {
    backAction(txFlowFinished, onNoThanks, setSurchargeAmount, setTransactionStatus, flowEl, receiptEl, onClose, true);
  }
  function handleRetry() {
    setTransactionStatus(false);
    transactionFlowService.acknowledgeCompletion({ Info: () => {}, Clear: () => {} }, spi, () => {});
    showRelatedPay();
  }

  function showRelatedPay() {
    if (transactionAction === TransactionType.Refund) {
      return (
        <RefundPay
          handleRefundPay={(refundAmount: number) =>
            refundPay(
              refundAmount,
              flowEl,
              spi,
              suppressMerchantPassword,
              setTransactionStatus,
              setFinalCashout,
              setFinalTipAmount,
              setFinalSurcharge,
              setPurchaseAmount,
              setFinalTotal
            )
          }
        />
      );
    }

    if (transactionAction === TransactionType.CashoutOnly && list.length === 0) {
      return (
        <CashOutPay
          handleCashoutPay={(cashoutAmount: number) =>
            cashoutPay(
              cashoutAmount,
              flowEl,
              spi,
              surchargeAmount,
              setTransactionStatus,
              setFinalCashout,
              setFinalTipAmount,
              setFinalSurcharge,
              setPurchaseAmount,
              setFinalTotal
            )
          }
        />
      );
    }
    return (
      <OrderPay
        handleCreditCardPay={(tipAmount: number, cashoutAmount: number, manualAmount: number) =>
          creditCardPay(
            tipAmount,
            cashoutAmount,
            manualAmount,
            openPricing,
            flowEl,
            spi,
            amount,
            surchargeAmount,
            promptCashout,
            setTransactionStatus,
            setFinalCashout,
            setFinalTipAmount,
            setFinalSurcharge,
            setPurchaseAmount,
            setFinalTotal
          )
        }
        handleMotoPay={() =>
          motoPay(
            spi,
            totalAmount,
            surchargeAmount,
            amount,
            suppressMerchantPassword,
            setTransactionStatus,
            setFinalCashout,
            setFinalTipAmount,
            setFinalSurcharge,
            setPurchaseAmount,
            setFinalTotal
          )
        }
        totalAmount={totalAmount}
        promptCashout={promptCashout}
        setPromptCashout={setPromptCashout}
        openPricing={openPricing}
        setOpenPricing={setOpenPricing}
        transactionStatus={transactionStatus}
        onErrorMsg={onErrorMsg}
        status={status}
      />
    );
  }

  function transactionSuccessful() {
    return (
      <div>
        {!txFlowFinished && (
          <div className="transaction-successful">
            <h6>Purchase: ${purchaseAmount}</h6>
            <h6>Tip amount: ${finalTipAmount}</h6>
            <h6>Cashout: ${finalCashout}</h6>
            <h6>Surcharge: ${finalSurcharge}</h6>
            {transactionAction === TransactionType.Refund ? (
              <p>Total Refund amount: ${finalTotal}</p>
            ) : (
              <p>Total amount: ${finalTotal}</p>
            )}
            {txUpdateMessage && <div>{txUpdateMessage.display_message_text}</div>}
            <div ref={flowTransactionEl} />
            <button
              type="button"
              className="btn btn-primary rounded-0 btn-block btn-lg mb-2"
              onClick={() => {
                transactionFlowService.cancelTransaction(spi);
              }}
            >
              Cancel
            </button>
          </div>
        )}
        {txFlowFinished && SuccessState.Failed === txFlowSuccess && (
          <div className="transaction-successful">
            <p>
              {txFlowResponse && txFlowResponse.GetErrorDetail && transactionAction === TransactionType.Refund
                ? txFlowResponse.GetErrorDetail()
                : txFlowResponse?.Data?.host_response_text}
            </p>
            <button
              type="button"
              className="btn btn-primary rounded-0 btn-block btn-lg mb-2"
              onClick={() => handleRetry()}
            >
              Retry
            </button>
            <button
              type="button"
              className="btn btn-primary rounded-0 btn-block btn-lg mb-2"
              onClick={() => handleBack()}
            >
              Cancel
            </button>
          </div>
        )}
        {txFlowFinished && SuccessState.Success === txFlowSuccess && (
          <div className="transaction-successful">
            <Tick className="color-purple" />
            <div className="transaction-successful-button">
              <p>Transaction successful!</p>
              <button type="button" className="primary-button" onClick={() => handleBack()}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`checkout-page1 ${visible ? '' : 'd-none'}`}>
      <SigApproval
        show={showSigApproval}
        handleClose={() => {
          setShowSigApproval(false);
        }}
        handleApproveSig={(isApproved: boolean) => handleApproveSig(isApproved, spi, setShowSigApproval)}
      />
      <Modal show={showUnknownModal} onHide={() => setShowUnknownModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Unable to verify transaction status.</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Please confirm the transaction status on the EFTPOS terminal.</p>
          <p>Does it show the transaction was successful? </p>
          <Button
            variant="primary"
            className="btn-custom unknownStatusButton"
            onClick={() => {
              handleOverrideTransaction();
              handleBack();
            }}
          >
            Yes
          </Button>
          <Button
            variant="primary"
            className="btn-custom"
            onClick={() => {
              handleOverrideTransaction();
              handleBack();
            }}
          >
            No
          </Button>
        </Modal.Body>
      </Modal>
      <Col sm={2} className="checkout-order min-vh-100 sticky-top">
        <button
          type="button"
          disabled={transactionStatus}
          className="primary-button checkout-button mb-0"
          onClick={() => handleBackAndClearProduts()}
        >
          Back
        </button>
      </Col>
      <Col sm={10}>
        <div className="checkout-page-flyout">
          <button
            type="button"
            disabled={transactionStatus}
            className="checkout-flyout-toggle"
            onClick={() => {
              handleBackAndClearProduts();
            }}
          >
            ▼
          </button>
          <Row style={!isTransactionInquiry(transactionAction) ? {} : { flexDirection: 'row-reverse' }}>
            {!isTransactionInquiry(transactionAction) && (
              <Col sm={4} className="sub-column">
                {showRelatedPay()}
              </Col>
            )}
            <Col sm={!isTransactionInquiry(transactionAction) ? 5 : 9} className="sub-column">
              <h2 className="sub-header mb-0">Flow</h2>
              <div className="flow-alignment" ref={flowEl} />
              {!transactionStatus ? '' : transactionSuccessful()}
            </Col>
            <Col sm={3} className="sub-column">
              <h2 className="sub-header mb-0">
                {transactionAction !== TransactionType.GetLastTransaction ? 'Receipt' : 'Last Transaction'}
              </h2>
              <pre className="receipt-alignment" ref={receiptEl}>
                {/* {displayReceipt(stateChange)} */}
                {txFlowResponse?.Data?.customer_receipt}
              </pre>
            </Col>
          </Row>
        </div>
      </Col>
    </div>
  );
}

export default Checkout;
