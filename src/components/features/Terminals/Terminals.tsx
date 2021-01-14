import React from 'react';
import { useSelector } from 'react-redux';
import TerminalList from './TerminalList';
import TerminalDetails from './TerminalDetails';
import { selectActiveTerminal } from '../../../features/terminals/terminalSelectors';
import TerminalSetting from './TerminalSetting';

function Terminals(props: any) {
  const { errorMsg, onErrorMsg } = props;
  const activeTerminal = useSelector(selectActiveTerminal);

  return (
    <>
      {(!activeTerminal || !activeTerminal.terminal) && <TerminalList />}
      {activeTerminal && activeTerminal.page === 'view' && <TerminalDetails terminal={activeTerminal.terminal} />}
      {activeTerminal && activeTerminal.page === 'setting' && (
        <TerminalSetting terminal={activeTerminal.terminal} errorMsg={errorMsg} onErrorMsg={onErrorMsg} />
      )}
    </>
  );
}

export default Terminals;
