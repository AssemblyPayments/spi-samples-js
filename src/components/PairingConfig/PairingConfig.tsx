import React, { useState, SyntheticEvent, useCallback, useEffect } from 'react';
import { DeviceAddressResponseCode, SpiFlow, SpiStatus } from '@mx51/spi-client-js';
import { Modal, Button } from 'react-bootstrap';
import { Input } from '../Input';
import Checkbox from '../Checkbox';

function handleAutoAddressStateChangeCallback(
  event: DeviceAddressChangedEvent,
  setEftpos: Function,
  setErrorMsg: Function
) {
  const deviceAddressStatus = event.detail;
  switch (deviceAddressStatus.DeviceAddressResponseCode) {
    case DeviceAddressResponseCode.SUCCESS:
      setEftpos(deviceAddressStatus.Address);
      window.localStorage.setItem('eftpos_address', deviceAddressStatus.Address);
      setErrorMsg(`Device Address has been updated to ${deviceAddressStatus.Address}`);
      break;
    case DeviceAddressResponseCode.INVALID_SERIAL_NUMBER:
      setEftpos('');
      window.localStorage.setItem('eftpos_address', '');
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
function pairingSaveSetting(
  e: React.SyntheticEvent,
  spi: Spi,
  posId: string,
  testMode: boolean,
  serial: string,
  apiKey: string,
  secureWebSocket: boolean,
  autoAddress: boolean,
  eftpos: string
) {
  e.preventDefault();
  spi.SetPosId(posId);
  spi.SetTestMode(testMode);
  spi.SetSerialNumber(serial);
  spi.SetDeviceApiKey(apiKey);
  spi.SetSecureWebSockets(secureWebSocket);
  spi.SetAutoAddressResolution(autoAddress);
  spi.SetEftposAddress(eftpos);
  window.localStorage.setItem('api_key', apiKey);
  window.localStorage.setItem('eftpos_address', eftpos);
  window.localStorage.setItem('posID', posId);
  window.localStorage.setItem('serial', serial);
  window.localStorage.setItem('test_mode', testMode.toString());
  window.localStorage.setItem('auto_address', autoAddress.toString());
  window.localStorage.setItem('use_secure_web_sockets', secureWebSocket.toString());
}

type Props = {
  spi: Spi;
  status: string;
  setPairButton: Function;
};

function PairingConfig({ spi, status, setPairButton }: Props) {
  const [posId, setPosId] = useState(window.localStorage.getItem('posID') || '');
  const [serial, setSerial] = useState(window.localStorage.getItem('serial') || '');
  const [eftpos, setEftpos] = useState(window.localStorage.getItem('eftpos_address') || '');
  const [apiKey, setApiKey] = useState(window.localStorage.getItem('') || 'RamenPosDeviceIpApiKey');
  const [testMode, setTestMode] = useState(window.localStorage.getItem('test_mode') === 'true');
  const [autoAddress, setAutoAddress] = useState(window.localStorage.getItem('auto_address') === 'true');
  const [secureWebSocket, setSecureWebSocket] = useState(
    window.localStorage.getItem('use_secure_web_sockets') === 'true'
  );
  const [isFormSaved, setIsFormSaved] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  // The form must not have unsaved data, posId is required always and either eftposAddress or serial number is required
  setPairButton(isFormSaved && posId && ((!secureWebSocket && eftpos) || (secureWebSocket && serial)));

  useEffect(() => {
    if (window.location.protocol === 'https:') {
      setSecureWebSocket(true);
      setAutoAddress(true);
      setTestMode(true);
    }
  }, []);

  const handleAutoAddressStateChange = useCallback((event: DeviceAddressChangedEvent) => {
    handleAutoAddressStateChangeCallback(event, setEftpos, setErrorMsg);
  }, []);
  useEffect(() => {
    document.addEventListener('DeviceAddressChanged', handleAutoAddressStateChange);
    return function cleanup() {
      document.removeEventListener('DeviceAddressChanged', handleAutoAddressStateChange);
    };
  });

  const isDisabled = spi.CurrentFlow === SpiFlow.Pairing;

  return (
    <div>
      <h2 className="sub-header">Pairing configuration</h2>
      <div className="ml-4 mr-4">
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
            pairingSaveSetting(e, spi, posId, testMode, serial, apiKey, secureWebSocket, autoAddress, eftpos);
            setIsFormSaved(true);
          }}
        >
          <Input
            id="inpPostId"
            name="POS ID"
            label="POS ID"
            placeholder="POS ID"
            pattern="\w+"
            required
            title="POS Id must be alphanumeric. Special characters and spaces not allowed"
            disabled={isDisabled || status !== SpiStatus.Unpaired}
            defaultValue={posId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsFormSaved(false);
              setPosId(e.target.value);
            }}
          />
          <Input
            id="inpAPIkey"
            name="API key"
            disabled={isDisabled}
            label="API key"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsFormSaved(false);
              setApiKey(e.target.value);
            }}
            defaultValue="RamenPosDeviceIpApiKey"
          />
          <Input
            id="inpSerial"
            name="serial"
            label="Serial"
            defaultValue={serial}
            placeholder="000-000-000"
            required={secureWebSocket}
            disabled={isDisabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsFormSaved(false);
              setSerial(e.target.value);
            }}
          />
          <Input
            id="inpEFTPOS"
            name="EFTPOS"
            label="EFTPOS"
            placeholder="000.000.000.000"
            disabled={secureWebSocket || isDisabled}
            required={!secureWebSocket}
            defaultValue={eftpos}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsFormSaved(false);
              setEftpos(e.target.value);
            }}
          />
          <div>
            <Checkbox
              type="checkbox"
              id="ckbTestMode"
              label="Test Mode"
              disabled={isDisabled}
              checked={testMode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const { checked } = e.target;
                setIsFormSaved(false);
                setTestMode(checked);
                if (checked) setAutoAddress(checked);
              }}
            />
            <Checkbox
              type="checkbox"
              id="ckbSecureWebSockets"
              label="Secure WebSockets"
              disabled={window.location.protocol !== 'http:' || isDisabled}
              checked={secureWebSocket}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const { checked } = e.target;
                setIsFormSaved(false);
                setSecureWebSocket(checked);
                if (checked) setAutoAddress(checked);
              }}
            />
            <Checkbox
              type="checkbox"
              id="ckbAutoAddress"
              label="Auto Address"
              disabled={window.location.protocol !== 'http:' || isDisabled}
              checked={autoAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setIsFormSaved(false);
                setAutoAddress(e.target.checked);
              }}
            />
            <button id="btnSaveSetting" type="submit" className="primary-button" disabled={isFormSaved || isDisabled}>
              Save Setting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PairingConfig;
