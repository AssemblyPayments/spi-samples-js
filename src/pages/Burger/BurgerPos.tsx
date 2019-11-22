import React from 'react';
import { Col, Nav, Row, Tab } from 'react-bootstrap';
// import { getSpiVersion } from '../../services/_common/uiHelpers';
import Products from '../../components/products';
import './BurgerPos.css';

function BurgerPos() {
  return (
    <div>
      {/* <h1 className="bpos-heading h3">Welcome to BurgerPOS (v{getSpiVersion()})</h1> */}

      <Tab.Container id="pos-tabs" defaultActiveKey="sample">
        <Row>
          <Col sm={2} className="menu-sidebar">
            <Nav variant="pills" className="flex-column">
              <Nav.Item>
                <Nav.Link eventKey="sample">Sample POS</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="settings">Pairing Settings</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
          <Col sm={10}>
            <Tab.Content>
              <Tab.Pane eventKey="sample">
                <Products />
              </Tab.Pane>
              <Tab.Pane eventKey="settings">Pairing Settings</Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </div>
  );
}

export default BurgerPos;
