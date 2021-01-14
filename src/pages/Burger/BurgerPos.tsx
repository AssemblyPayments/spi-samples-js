import React, { useState, useEffect, useCallback } from 'react';
import { Col, Nav, Row, Tab } from 'react-bootstrap';
import { ReactComponent as Logo } from '../../images/mx51.svg';
import Products from '../../components/Products';
import Terminals from '../../components/features/Terminals';

import SpiService from './spiService';
import './BurgerPos.scss';
import Reversal from '../Reversal';

function handlePaymentInProgressCallback(event: any, setInProgressPayment: Function) {
  if (event.detail.Finished !== true) {
    window.localStorage.setItem('payment_progress', true.toString());
    setInProgressPayment(true);
  } else {
    window.localStorage.setItem('payment_progress', false.toString());
    setInProgressPayment(false);
  }
}

const spiService = new SpiService();

function BurgerPos() {
  if (!spiService._spi) spiService.start();

  const [errorMsg, setErrorMsg] = useState('');
  const [showUnknownModal, setShowUnknownModal] = useState(false);
  const [inProgressPayment, setInProgressPayment] = useState(
    window.localStorage.getItem('payment_progress') === 'true'
  );

  const [openPricing, setOpenPricing] = useState(window.localStorage.getItem('open_pricing') === 'true');

  const [statusState, setStatusState] = useState(spiService._spi.CurrentStatus);

  useEffect(() => {
    if (spiService.start && inProgressPayment === true) {
      setShowUnknownModal(true);
    } else {
      window.localStorage.setItem('payment_progress', false.toString());
      setInProgressPayment(false);
    }

    return () => window.location.reload();
  }, [inProgressPayment]);

  const handleStatusChange = useCallback((event: any) => {
    setStatusState(event.detail);
  }, []);
  useEffect(() => {
    document.addEventListener('StatusChanged', handleStatusChange);
    return function cleanup() {
      document.removeEventListener('StatusChanged', handleStatusChange);
    };
  });

  const handlePaymentInProgress = useCallback((event: any) => {
    handlePaymentInProgressCallback(event, setInProgressPayment);
  }, []);
  useEffect(() => {
    document.addEventListener('TxFlowStateChanged', handlePaymentInProgress);

    return function cleanup() {
      document.removeEventListener('TxFlowStateChanged', handlePaymentInProgress);
    };
  });

  return (
    <div>
      <Tab.Container id="pos-tabs" defaultActiveKey="sample" unmountOnExit>
        <Row className="window-fix">
          <Col sm={2} className="menu-sidebar min-vh-100">
            <div className="sticky-top">
              <h1 className="logo">
                <Logo width="100" height="50" title="mx51 Logo" />
              </h1>
              <Nav variant="pills" className="flex-column sidebar-links">
                <Nav.Item>
                  <Nav.Link eventKey="sample">Sample POS</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="terminals">Terminals</Nav.Link>
                </Nav.Item>
                {window.location.search.includes('qamode=true') && (
                  <Nav.Item>
                    <Nav.Link eventKey="reversals">Reversals</Nav.Link>
                  </Nav.Item>
                )}
              </Nav>
            </div>
          </Col>
          <Col sm={10}>
            <Tab.Content>
              <Tab.Pane eventKey="sample">
                <Products
                  status={statusState}
                  showUnknownModal={showUnknownModal}
                  setShowUnknownModal={setShowUnknownModal}
                  errorMsg={errorMsg}
                  onErrorMsg={setErrorMsg}
                  openPricing={openPricing}
                  setOpenPricing={setOpenPricing}
                />
              </Tab.Pane>
              <Tab.Pane eventKey="terminals">
                <Terminals errorMsg={errorMsg} onErrorMsg={setErrorMsg} />
              </Tab.Pane>
              <Tab.Pane eventKey="reversals">
                <Reversal spi={spiService._spi} />
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </div>
  );
}

export default BurgerPos;
