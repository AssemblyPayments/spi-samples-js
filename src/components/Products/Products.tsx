import React, { useState, useEffect } from 'react';
import { Col, Row, Modal, Button, Alert } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { TransactionType } from '@mx51/spi-client-js';
import Checkout from '../Checkout';
import Order from '../Order';
import './Products.scss';
import ProductList from '../ProductList';
import allProducts from './ProductData';
import { transactionFlow as transactionFlowService } from '../../services';
import { selectIsPairedTerminalStatus, selectPairedTerminals } from '../../features/terminals/terminalSelectors';
import SPI from '../../pages/Burger/spi';
import TerminalSelector from '../features/Terminals/TerminalSelector';
import { clearTransaction, updateActiveTerminal } from '../../features/terminals/terminalSlice';

function productClick(
  shortlistedProducts: Array<Product>,
  productList: AllProducts,
  id: string,
  updateShortlistedProducts: Function
) {
  const products = [...shortlistedProducts];
  // find the clicked product id in existing shortlisted products list
  let shortlistedId = -1;
  shortlistedProducts.forEach((p: Product, index: number) => {
    if (p.id === id) {
      shortlistedId = index;
    }
  });

  // if clicked product found in shortlisted product list then increment the quantity
  if (shortlistedId > -1) {
    products[shortlistedId].quantity += 1;
  } else {
    // else find the clicked product details in allProducts array and insert it at top
    // of short listed product list.
    let clickedProduct: Product;
    productList.forEach((c: CategoryProducts) =>
      c.list.forEach((p: Product) => {
        if (p.id === id) {
          clickedProduct = p;
          products.unshift({ ...clickedProduct, quantity: 1 }); // push item on top of array using `unshift`
        }
      })
    );
  }

  updateShortlistedProducts(products);
}

function changeProductQuantity(
  shortlistedProducts: Array<Product>,
  updateShortlistedProducts: Function,
  id: string,
  quantity: number
) {
  const products = [...shortlistedProducts];

  // find the clicked product id in existing shortlisted products list
  let shortlistedId = -1;
  shortlistedProducts.forEach((p: Product, index: number) => {
    if (p.id === id) {
      shortlistedId = index;
    }
  });

  // if clicked product found in shortlisted product list then decrement the quantity
  if (shortlistedId > -1) {
    products[shortlistedId].quantity += quantity;
    // if the quantity reaches 0, then remove the product from shortlisted product
    if (products[shortlistedId].quantity === 0) {
      products.splice(shortlistedId, 1);
    }
  }

  updateShortlistedProducts(products);
}

function getTransaction(isTerminalPaired: boolean, onErrorMsg: Function, setTransactionAction: Function) {
  if (!isTerminalPaired) {
    onErrorMsg('Please pair your POS to the terminal or check your network connection');
  } else {
    setTransactionAction(TransactionType.GetTransaction);
  }
}

function lastTransaction(isTerminalPaired: boolean, onErrorMsg: Function, setTransactionAction: Function) {
  if (!isTerminalPaired) {
    onErrorMsg('Please pair your POS to the terminal or check your network connection');
  } else {
    setTransactionAction(TransactionType.GetLastTransaction);
  }
}

function checkoutAction(
  isTerminalPaired: boolean,
  shortlistedProducts: Array<Product>,
  setTransactionAction: Function,
  setCheckout: Function,
  onErrorMsg: Function
) {
  if (!isTerminalPaired) {
    onErrorMsg('Please pair your POS to the terminal or check your network connection');
  } else if (shortlistedProducts.length === 0) {
    setTransactionAction(TransactionType.CashoutOnly);
  } else {
    setTransactionAction(TransactionType.Purchase);
  }
}

function refundAction(isTerminalPaired: boolean, setTransactionAction: Function, onErrorMsg: Function) {
  if (!isTerminalPaired) {
    onErrorMsg('Please pair your POS to the terminal or check your network connection');
  } else {
    setTransactionAction(TransactionType.Refund);
  }
}

function noThanksAction(
  setCheckout: Function,
  setTransactionAction: Function,
  spi: Spi,
  updateShortlistedProducts: Function,
  setTransactionStatus: Function,
  cleanTransactionAction: Function
) {
  console.log('noThanksAction called');
  transactionFlowService.acknowledgeCompletion({ Info: () => {}, Clear: () => {} }, spi, () => {});
  setCheckout(false);
  setTransactionAction('');
  updateShortlistedProducts([]);
  setTransactionStatus(false);
  cleanTransactionAction();
}

function checkoutClosed(setCheckout: Function, setTransactionAction: Function, cleanTransactionAction: Function) {
  console.log('checkoutClosed called');

  setCheckout(false);
  setTransactionAction('');
  cleanTransactionAction();
}

function overrideTransaction(spi: Spi, setShowUnknownModal: Function) {
  console.log('overrideTransaction called');

  spi.AckFlowEndedAndBackToIdle();
  setShowUnknownModal(false);
}

type Props = {
  status: string;
  showUnknownModal: boolean;
  setShowUnknownModal: Function;
  errorMsg: string;
  onErrorMsg: Function;
  openPricing: boolean;
  setOpenPricing: Function;
};

function Products({
  status,
  showUnknownModal,
  setShowUnknownModal,
  errorMsg,
  onErrorMsg,
  openPricing,
  setOpenPricing,
}: Props) {
  const [shortlistedProducts, updateShortlistedProducts] = useState<Array<Product>>([]);
  const [checkout, setCheckout] = useState(false);
  const [posRefId, setPosRefId] = useState('');
  const [transactionAction, setTransactionAction] = useState('');
  const [surchargeAmount, setSurchargeAmount] = useState(0);
  const [transactionStatus, setTransactionStatus] = useState<boolean>(false);

  const isTerminalPaired = useSelector(selectIsPairedTerminalStatus);

  const [currentTerminalId, setCurrentTerminalId] = useState('');

  // const { spi } = terminal && terminal.id ? SPI.getInstance(terminal.id) : { spi: {} };
  const { spi } = currentTerminalId !== '' ? SPI.getInstance(currentTerminalId) : { spi: {} };

  const dispatch = useDispatch();
  const cleanTransactionAction = () => dispatch(clearTransaction({ id: currentTerminalId }));
  const clearActiveTerminal = () => dispatch(updateActiveTerminal({}));
  useEffect(() => {
    clearActiveTerminal();
  });

  return (
    <>
      <Row>
        <TerminalSelector
          show={!checkout && transactionAction !== ''}
          onSelect={(id) => {
            setCurrentTerminalId(id);
            setCheckout(true);
          }}
          onClose={() => {
            setTransactionAction('');
          }}
        />
        <Modal show={showUnknownModal} onHide={() => setShowUnknownModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Alert</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Let the POS know that customer actually paid?</p>
            <Button
              variant="primary"
              className="btn-custom unknownStatusButton"
              onClick={() => overrideTransaction(spi, setShowUnknownModal)}
            >
              Paid
            </Button>
            <Button
              variant="primary"
              className="btn-custom"
              onClick={() => overrideTransaction(spi, setShowUnknownModal)}
            >
              Fail
            </Button>
          </Modal.Body>
        </Modal>
        <Col lg={8}>
          {!isTerminalPaired && (
            <Alert variant="danger" className="mt-3 text-center">
              <strong>Please check your device Pairing setting.</strong>
            </Alert>
          )}

          {allProducts.map((cat) => (
            <ProductList
              key={cat.categoryName}
              category={cat}
              onProductClick={(id: string) =>
                productClick(shortlistedProducts, allProducts, id, updateShortlistedProducts)
              }
            />
          ))}
        </Col>
        <Col lg={4} className="order-sidebar">
          <Order
            list={shortlistedProducts}
            onChangeProductQuantity={(id: string, quantity: number) =>
              changeProductQuantity(shortlistedProducts, updateShortlistedProducts, id, quantity)
            }
            onGetTransaction={() => getTransaction(isTerminalPaired, onErrorMsg, setTransactionAction)}
            onRefund={() => refundAction(isTerminalPaired, setTransactionAction, onErrorMsg)}
            onLastTransaction={() => lastTransaction(isTerminalPaired, onErrorMsg, setTransactionAction)}
            onCheckout={() =>
              checkoutAction(isTerminalPaired, shortlistedProducts, setTransactionAction, setCheckout, onErrorMsg)
            }
            handleApplySurcharge={setSurchargeAmount}
            posRefId={posRefId}
            setPosRefId={setPosRefId}
            surchargeAmount={surchargeAmount}
            errorMsg={errorMsg}
            onErrorMsg={onErrorMsg}
          />
          {checkout && (
            <Checkout
              visible={checkout}
              list={shortlistedProducts}
              onClose={() => checkoutClosed(setCheckout, setTransactionAction, cleanTransactionAction)}
              onNoThanks={() =>
                noThanksAction(
                  setCheckout,
                  setTransactionAction,
                  spi,
                  updateShortlistedProducts,
                  setTransactionStatus,
                  cleanTransactionAction
                )
              }
              posRefId={posRefId}
              spi={spi}
              surchargeAmount={surchargeAmount}
              setSurchargeAmount={setSurchargeAmount}
              setTransactionStatus={setTransactionStatus}
              transactionStatus={transactionStatus}
              transactionAction={transactionAction}
              showUnknownModal={showUnknownModal}
              setShowUnknownModal={setShowUnknownModal}
              handleOverrideTransaction={() => overrideTransaction(spi, setShowUnknownModal)}
              openPricing={openPricing}
              setOpenPricing={setOpenPricing}
              onErrorMsg={onErrorMsg}
              status={status}
              currentTerminalId={currentTerminalId}
            />
          )}
        </Col>
      </Row>
    </>
  );
}

export default Products;
