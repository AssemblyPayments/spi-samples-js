import React, { useState, useCallback, useEffect } from 'react';
import { DeviceAddressResponseCode, SpiStatus } from '@mx51/spi-client-js';
import { Button, Modal } from 'react-bootstrap';
import { connect, useDispatch } from 'react-redux';
import { Input } from '../../Input';
import Checkbox from '../../Checkbox';
import eventBus from '../../../pages/Burger/eventBus';
import events from '../../../constants/events';

import {
  pairTerminal as pairTerminalAction,
  unpairTerminal as unpairTerminalAction,
  cancelTerminalPairing as cancelTerminalPairingAction,
  saveTerminalConfig as saveTerminalConfigAction,
  addTerminal as addTerminalAction,
} from '../../../features/terminals/terminalSlice';

const mapDispatchToProps = {
  unpairTerminal: unpairTerminalAction,
  pairTerminal: pairTerminalAction,
  cancelTerminalPairing: cancelTerminalPairingAction,
};

function handleAutoAddressStateChangeCallback(
  event: DeviceAddressChangedEvent,
  setEftpos: Function,
  setErrorMsg: Function
) {
  const deviceAddressStatus = event.detail.payload;
  switch (deviceAddressStatus.DeviceAddressResponseCode) {
    case DeviceAddressResponseCode.SUCCESS:
      setEftpos(deviceAddressStatus.Address);
      setErrorMsg(`Device Address has been updated to ${deviceAddressStatus.Address}`);
      break;
    case DeviceAddressResponseCode.INVALID_SERIAL_NUMBER:
      setEftpos('');
      setErrorMsg(`The serial number is invalid!`);
      break;
    case DeviceAddressResponseCode.SERIAL_NUMBER_NOT_CHANGED:
      break;
    default:
      // eslint-disable-next-line no-console
      console.log('The serial number is invalid!.......');
      break;
  }
}

function Unpair(props: any) {
  const { pairTerminal, unpairTerminal, terminal, cancelTerminalPairing } = props;
  const dispatch = useDispatch();
  const saveTerminalSetting = () => {
    dispatch(
      saveTerminalConfigAction(terminal.id, {
        posId,
        eftpos,
        autoAddress,
        serialNumber,
        testMode,
        secureWebSocket,
        apiKey,
      })
    );
  };

  const defaultConfig = {
    posId: null,
    eftpos: '',
    serialNumber: '',
    autoAddress: false,
    testMode: true,
    secureWebSocket: false,
  };

  const config = {
    ...defaultConfig,
    ...terminal.terminalConfig,
  };

  const [posId, setPosId] = useState(config.posId);
  const [eftpos, setEftpos] = useState(config.eftpos);
  const [serialNumber, setSerialNumber] = useState(config.serialNumber);
  const [autoAddress, setAutoAddress] = useState(config.autoAddress);
  const [testMode, setTestMode] = useState(config.testMode);
  const [secureWebSocket, setSecureWebSocket] = useState(config.secureWebSocket);
  const [apiKey, setApiKey] = useState(config.apiKey || 'BurgerPosDeviceAPIKey');
  const [errorMsg, setErrorMsg] = useState('');

  const isFinishedPairing =
    (terminal.status === SpiStatus.Unpaired && !terminal.pairingFlow) ||
    (terminal && terminal.pairingFlow && terminal.pairingFlow.Finished);
  const disableInput = !isFinishedPairing || terminal.status !== SpiStatus.Unpaired;

  const handleAutoAddressStateChange = useCallback((event: DeviceAddressChangedEvent) => {
    handleAutoAddressStateChangeCallback(event, setEftpos, setErrorMsg);
  }, []);

  useEffect(() => {
    eventBus.addEventListener(events.spiDeviceAddressChanged, handleAutoAddressStateChange);
    return function cleanup() {
      eventBus.removeEventListener(events.spiDeviceAddressChanged, handleAutoAddressStateChange);
    };
  });

  useEffect(() => {
    if (window.location.protocol === 'https:') {
      setSecureWebSocket(true);
      setAutoAddress(true);
      setTestMode(true);
    }
  }, []);

  return (
    <div>
      <h2 className="sub-header">Pairing configuration</h2>
      <div className="ml-2 mr-2">
        <Modal show={errorMsg !== ''} onHide={() => setErrorMsg('')}>
          <Modal.Header closeButton>
            <Modal.Title>Alert</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>{errorMsg}</p>
            <Button variant="primary" className="btn-custom" onClick={() => setErrorMsg('')} block>
              OK
            </Button>
          </Modal.Body>
        </Modal>
        <form
          id="formPairingConfig"
          onSubmit={(e: React.SyntheticEvent) => {
            saveTerminalSetting();
            e.preventDefault();
            return false;
          }}
        >
          <Input
            id="inpPostId"
            name="POS ID"
            label="POS ID"
            placeholder="POS ID"
            pattern="^[a-zA-Z0-9]{1,16}$"
            defaultValue={posId}
            required
            disabled={disableInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPosId(e.target.value);
            }}
            title="POS Id must be alphanumeric and less than 16 characters. Special characters and spaces not allowed"
          />
          <Input
            id="inpAPIkey"
            name="API key"
            label="API key"
            defaultValue={apiKey}
            disabled={disableInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setApiKey(e.target.value);
            }}
          />
          <Input
            id="inpSerial"
            name="serialNumber"
            label="Serial"
            placeholder="000-000-000"
            disabled={disableInput}
            defaultValue={serialNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSerialNumber(e.target.value);
            }}
          />
          <Input
            id="inpEFTPOS"
            name="EFTPOS"
            label="EFTPOS"
            placeholder="000.000.000.000"
            disabled={disableInput || secureWebSocket || !isFinishedPairing}
            required={!secureWebSocket}
            value={eftpos}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEftpos(e.target.value);
            }}
          />
          <div>
            <Checkbox
              id="ckbTestMode"
              label="Test Mode"
              checked={testMode}
              disabled={disableInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setTestMode(e.target.checked);
              }}
            />
            <Checkbox
              id="ckbAutoAddress"
              label="Auto Address"
              checked={autoAddress}
              disabled={window.location.protocol !== 'http:' || disableInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setAutoAddress(e.target.checked);
              }}
            />
            <Checkbox
              id="ckbSecureWebSocket"
              label="Secure Web Socket"
              checked={secureWebSocket}
              disabled={window.location.protocol !== 'http:' || disableInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSecureWebSocket(e.target.checked);
              }}
            />
            <Button variant="outline-primary" block className="mb-2" type="submit">
              Save Settings
            </Button>
            {terminal && terminal.status === SpiStatus.PairedConnected && (
              <Button variant="primary" block className="mb-2" onClick={() => unpairTerminal(terminal.id)}>
                Unpair
              </Button>
            )}
            {!isFinishedPairing && (
              <Button variant="primary" block className="mb-2" onClick={() => cancelTerminalPairing(terminal.id)}>
                Cancel Pairing
              </Button>
            )}
            {isFinishedPairing && terminal && terminal.status === SpiStatus.Unpaired && (
              <Button
                id="btnSaveSetting"
                type="submit"
                variant="primary"
                block
                className="mb-2"
                onClick={() =>
                  pairTerminal(terminal.id, {
                    posId,
                    eftpos,
                    autoAddress,
                    serialNumber,
                    testMode,
                    secureWebSocket,
                    apiKey,
                  })
                }
              >
                Pair
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default connect(null, mapDispatchToProps)(Unpair);
