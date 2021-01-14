import React from 'react';
import { Button } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { updateActiveTerminal } from '../../../features/terminals/terminalSlice';
import Setting from '../../Setting';
import SPI from '../../../pages/Burger/spi';

function TerminalSetting(props: any) {
  const dispatch = useDispatch();
  const handleaBackToTerminals = () => dispatch(updateActiveTerminal({}));
  const { terminal, errorMsg, onErrorMsg } = props;
  const { spi } = terminal && terminal.id ? SPI.getInstance(terminal.id) : { spi: {} };

  return (
    <div>
      <Button variant="link" block onClick={handleaBackToTerminals} className="text-left pt-0 mt-2">
        &#60; Back to Terminals
      </Button>
      <Setting spi={spi} status={terminal.status} errorMsg={errorMsg} onErrorMsg={onErrorMsg} terminal={terminal} />
    </div>
  );
}

export default TerminalSetting;
