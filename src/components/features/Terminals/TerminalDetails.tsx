import React from 'react';
import { Col, Row, Button } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import Unpair from './Unpair';
import Inprogress from './Inprogress';
import { updateActiveTerminal } from '../../../features/terminals/terminalSlice';
import Flow from '../../Flow';

function TerminalDetails(props: any) {
  const dispatch = useDispatch();
  const handleaBackToTerminals = () => dispatch(updateActiveTerminal({}));
  const { terminal } = props;

  return (
    <div>
      <Button variant="link" block onClick={handleaBackToTerminals} className="text-left pt-0 mt-2">
        &#60; Back to Terminals
      </Button>

      <Row>
        <Col lg={4} className="sub-column">
          <div className="flex-fill d-flex flex-column">
            <Unpair terminal={terminal} />
          </div>
          <div className="flex-fill">
            <Inprogress terminal={terminal} />
          </div>
        </Col>
        <Col lg={8} className="sub-column d-flex flex-column">
          <div className="flex-fill text-break">
            <Flow terminal={terminal} />
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default TerminalDetails;
