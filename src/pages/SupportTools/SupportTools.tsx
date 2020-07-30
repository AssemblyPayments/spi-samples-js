import React from 'react';
import './SupportTools.scss';
import { Col, Nav, Row, Tab } from 'react-bootstrap';
import { ReactComponent as Logo } from '../../images/mx51.svg';
import AutoAddressCheck from './AutoAddressCheck/AutoAddressCheck';

function SupportTools() {
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
                  <Nav.Link eventKey="sample">Auto Address check</Nav.Link>
                </Nav.Item>
              </Nav>
            </div>
          </Col>
          <Col sm={10}>
            <Tab.Content>
              <Tab.Pane eventKey="sample">
                <AutoAddressCheck />
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </div>
  );
}

export default SupportTools;
