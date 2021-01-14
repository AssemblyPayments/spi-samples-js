import { SpiStatus } from '@mx51/spi-client-js';
import React from 'react';
import { Card, Button, Table, Badge } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';

import {
  addTerminal as addTerminalAction,
  unpairTerminal as unpairTerminalAction,
  removeTerminal as removeTerminalAction,
  updateActiveTerminal as updateActiveTerminalAction,
} from '../../../features/terminals/terminalSlice';
import { selectActiveTerminals } from '../../../features/terminals/terminalSelectors';

function TerminalList() {
  const terminals = useSelector(selectActiveTerminals);
  const dispatch = useDispatch();
  const addTerminal = () => dispatch(addTerminalAction());
  const unpairTerminal = (id: string) => dispatch(unpairTerminalAction(id));
  const removeTerminal = (id: string) => dispatch(removeTerminalAction(id));
  const handleViewTerminal = (id: string, page: string) => dispatch(updateActiveTerminalAction({ id, page }));
  const terminalStatusVariant = {
    [SpiStatus.Unpaired]: 'danger',
    [SpiStatus.PairedConnected]: 'success',
    [SpiStatus.PairedConnecting]: 'warning',
  };

  const terminalStatus = {
    [SpiStatus.Unpaired]: 'Unpaired',
    [SpiStatus.PairedConnected]: 'Connected',
    [SpiStatus.PairedConnecting]: 'Connecting...',
  };
  console.log(JSON.stringify(terminals));

  return (
    <div className="mt-3">
      <Card>
        <Card.Header>
          <Button onClick={() => addTerminal()} variant="primary" className="float-right">
            + Pair New Terminal
          </Button>
        </Card.Header>
        <Table>
          <thead>
            <tr>
              <th>POS ID</th>
              <th>Pairing Status</th>
              <th>Connection Status</th>
              <th>EFTPOS IP Address</th>
              <th>Serial Number</th>
              <th> </th>
              <th> </th>
            </tr>
          </thead>
          <tbody>
            {terminals && terminals.length > 0 ? (
              terminals.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.terminalConfig.posId}</td>
                  <td>
                    <Badge pill variant={terminalStatusVariant[t.status]} className="p-2">
                      {terminalStatus[t.status]}
                    </Badge>
                  </td>
                  <td>{t.terminalStatus.status}</td>
                  <td>{t.terminalConfig.eftpos}</td>
                  <td>{t.terminalConfig.serialNumber}</td>
                  <td>
                    <Button size="sm" variant="outline-primary" block onClick={() => handleViewTerminal(t.id, 'view')}>
                      View
                    </Button>
                  </td>
                  {t.status === 'PairedConnected' ? (
                    <td>
                      <Button size="sm" variant="outline-primary" block onClick={() => unpairTerminal(t.id)}>
                        Unpair
                      </Button>
                    </td>
                  ) : (
                    <td>
                      <Button size="sm" variant="outline-primary" block onClick={() => removeTerminal(t.id)}>
                        Remove
                      </Button>
                    </td>
                  )}
                  <td>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      block
                      onClick={() => handleViewTerminal(t.id, 'setting')}
                    >
                      Setting
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="text-center" colSpan={5}>
                  No terminals available.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

export default TerminalList;
