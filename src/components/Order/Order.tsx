import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Col, Row, Modal, Button } from 'react-bootstrap';
import GetTransactionModal from '../GetTransactionModal';
import SurchargeModal from '../SurchargeModal';
import './Order.scss';
import { selectIsPairedTerminalStatus, selectCurrentPairedTerminal } from '../../features/terminals/terminalSelectors';

function removeProductQuantityAction(
  id: string,
  list: Array<Product>,
  handleApplySurcharge: Function,
  onChangeProductQuantity: Function
) {
  if (list.length === 1 && list[0].quantity === 1) {
    handleApplySurcharge(0);
  }
  onChangeProductQuantity(id, -1);
}

function checkoutAction(isTerminalPaired: boolean, currentTerminal: any, onErrorMsg: Function, onCheckout: Function) {
  // if (currentTerminal === undefined) {
  //   onErrorMsg('No selected terminal for transaction');
  // }
  if (!isTerminalPaired) {
    onErrorMsg('Please pair your POS to the terminal or check your network connection');
  } else {
    onCheckout();
  }
}
function Order(props: {
  list: Array<Product>;
  onCheckout: Function;
  onGetTransaction: Function;
  onRefund: Function;
  onLastTransaction: Function;
  onChangeProductQuantity: Function;
  handleApplySurcharge: Function;
  posRefId: string;
  setPosRefId: Function;
  surchargeAmount: number;
  errorMsg: string;
  onErrorMsg: Function;
}) {
  const {
    list,
    onCheckout,
    onGetTransaction,
    onRefund,
    onLastTransaction,
    onChangeProductQuantity,
    handleApplySurcharge,
    posRefId,
    setPosRefId,
    surchargeAmount,
    errorMsg,
    onErrorMsg,
  } = props;

  const [showGetTransactionModal, setShowGetTransactionModal] = useState(false);

  const [showSurcharge, setShowSurcharge] = useState(false);
  const [surcharge, setSurcharge] = useState<number>(0);

  const subTotalAmount: number = list.reduce(
    (total: number, product: Product) => total + parseFloat(product.price) * product.quantity,
    0
  );
  const totalAmount = subTotalAmount + surchargeAmount / 100;

  const isTerminalPaired = useSelector(selectIsPairedTerminalStatus);
  const currentTerminal = useSelector(selectCurrentPairedTerminal);

  return (
    <div className="min-vh-100 sticky-top">
      <GetTransactionModal
        posRefId={posRefId}
        setPosRefId={setPosRefId}
        show={showGetTransactionModal}
        handleClose={() => setShowGetTransactionModal(false)}
        handleGetTransaction={() => {
          onGetTransaction(posRefId);
          setShowGetTransactionModal(false);
        }}
      />

      <SurchargeModal
        show={showSurcharge}
        surcharge={surcharge}
        setSurcharge={setSurcharge}
        handleClose={() => setShowSurcharge(false)}
        handleApplySurcharge={() => {
          handleApplySurcharge(surcharge);
          setShowSurcharge(false);
        }}
      />

      <h2 className="sub-header mb-0">Order</h2>
      <Row className="order-header-buttons no-gutters">
        {new URLSearchParams(window.location.search).get('qamode') === 'true' && (
          <Col sm={12}>
            <button
              className="btn btn-outline-primary rounded-0"
              id="lastTransactionButton"
              type="button"
              onClick={() => onLastTransaction()}
            >
              Last Transaction
            </button>
          </Col>
        )}
        <Col sm={4}>
          <button
            className="btn btn-outline-primary rounded-0"
            id="getTransactionButton"
            type="button"
            onClick={() => setShowGetTransactionModal(true)}
          >
            Get Transaction
          </button>
        </Col>
        <Col sm={4}>
          <button
            className="btn btn-outline-primary rounded-0"
            id="surchargeButton"
            type="button"
            onClick={() => setShowSurcharge(true)}
          >
            Add Surcharge
          </button>
        </Col>
        <Col sm={4}>
          <button
            className="btn btn-outline-primary rounded-0"
            id="refundButton"
            type="button"
            onClick={() => onRefund()}
          >
            Refund
          </button>
        </Col>
      </Row>
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
      <div className="orderListScroll">
        <ul className="nobull removeStyle">
          {list.map((item: Product) => (
            <li className="space" key={`order-list-${item.id}`}>
              <Row>
                <Col sm={12}>
                  <Row>
                    <Col sm={5}>
                      <div className="quantity-buttons">
                        <button
                          className="btn btn-secondary rounded-0 btn-block"
                          id={`btnItemDec${item.id}`}
                          type="button"
                          onClick={() =>
                            removeProductQuantityAction(item.id, list, handleApplySurcharge, onChangeProductQuantity)
                          }
                        >
                          -
                        </button>
                        <div id={`itemQuantity${item.id}`} className="quantity-label">
                          {item.quantity}
                        </div>
                        <button
                          className="btn btn-secondary rounded-0 btn-block"
                          id={`btnItemInc${item.id}`}
                          type="button"
                          onClick={() => onChangeProductQuantity(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </Col>
                    <Col sm={5} className="quantity">
                      {item.name}
                    </Col>
                    <Col sm={2} className="quantity text-right">
                      ${parseFloat(item.price) * item.quantity}
                    </Col>
                  </Row>
                </Col>
              </Row>
            </li>
          ))}
        </ul>
      </div>

      <div className="total">
        <div>
          <Row>
            <Col sm={7}>Subtotal</Col>
            <Col sm={5} className="text-right">
              ${subTotalAmount.toFixed(2)}
            </Col>
          </Row>
          <Row>
            <Col sm={7}>Surcharge</Col>
            <Col sm={5} className="text-right">
              ${(surchargeAmount / 100).toFixed(2)}
            </Col>
          </Row>
        </div>
        <hr />
        <div className="total-amount">
          <Row>
            <Col sm={7}>Total</Col>
            <Col sm={5} className="text-right">
              ${totalAmount.toFixed(2)}
            </Col>
          </Row>
        </div>
      </div>
      <button
        type="button"
        className="primary-button checkout-button mb-0"
        onClick={() => checkoutAction(isTerminalPaired, currentTerminal, onErrorMsg, onCheckout)}
      >
        Checkout
      </button>
    </div>
  );
}

export default Order;
