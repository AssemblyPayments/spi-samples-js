import React, { useState, SyntheticEvent, useCallback, useEffect } from 'react';
import { DeviceAddressResponseCode, SpiStatus } from '@mx51/spi-client-js';
import { Modal, Button } from 'react-bootstrap';
import { Input } from '../Input';
import Checkbox from '../Checkbox';
import Radio from '../Radio';

import { ReactComponent as IconError } from '../../images/error.svg';
import { ReactComponent as IconSuccess } from '../../images/success.svg';

import './PairingConfig.scss';

function handleAutoAddressStateChangeCallback(
  event: DeviceAddressChangedEvent,
  setEftpos: Function,
  setErrorMsg: Function
) {
  const deviceAddressStatus = event.detail;
  switch (deviceAddressStatus.DeviceAddressResponseCode) {
    case DeviceAddressResponseCode.SUCCESS: {
      const newEftposAddress = deviceAddressStatus.ip || deviceAddressStatus.fqdn;
      setEftpos(newEftposAddress);
      window.localStorage.setItem('eftpos_address', newEftposAddress);
      setErrorMsg(`Device Address has been updated to ${newEftposAddress}`);
      break;
    }
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
  spi.SetSerialNumber(serial);
  spi.SetDeviceApiKey(apiKey);
  spi.SetEftposAddress(eftpos);
  spi.SetTestMode(testMode);
  spi.SetSecureWebSockets(secureWebSocket);
  spi.SetAutoAddressResolution(autoAddress);
  window.localStorage.setItem('api_key', apiKey);
  window.localStorage.setItem('eftpos_address', eftpos);
  window.localStorage.setItem('posID', posId);
  window.localStorage.setItem('serial', serial);
  window.localStorage.setItem('test_mode', testMode.toString());
  window.localStorage.setItem('auto_address', autoAddress.toString());
  window.localStorage.setItem('use_secure_web_sockets', secureWebSocket.toString());
}

type Props = {
  isFinishedPairing: boolean;
  spi: Spi;
  status: string;
  setPairButton: Function;
};

function PairingConfig({ isFinishedPairing, spi, status, setPairButton }: Props) {
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

  const tenantList = JSON.parse(window.localStorage.getItem('tenants') || '[]');
  const [tenantCode, setTenantCode] = useState(window.localStorage.getItem('tenant_code') || '');
  const [selectedTenantCode, setSelectedTenant] = useState(tenantCode);
  const [otherTenantValue, setOtherTenantValue] = useState(
    !tenantList.find((tenant: Tenant) => tenant.code === tenantCode) ? tenantCode : ''
  );
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);

  // The form must not have unsaved data, posId is required always and either eftposAddress or serial number is required
  const checkPairButtonState = () =>
    setPairButton(isFormSaved && posId && ((!secureWebSocket && eftpos) || (secureWebSocket && serial)) && tenantCode);
  useEffect(checkPairButtonState);

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

  return (
    <div>
      <h2 className="sub-header">Payment provider</h2>
      <div className="ml-4 mr-4 mt-3">
        <Modal centered show={isTenantModalOpen} onHide={() => setIsTenantModalOpen(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Select payment provider</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <form className="mt-2">
              {tenantList.map((tenant: Tenant) => (
                <div key={tenant.code}>
                  <Radio
                    checked={tenant.code === selectedTenantCode}
                    id={`radio-${tenant.code}`}
                    label={tenant.name}
                    name="tenants"
                    onChange={(e: SyntheticEvent<HTMLSelectElement>) => setSelectedTenant(e.currentTarget.value)}
                    value={tenant.code}
                  />
                  <hr className="tenant-divider" />
                </div>
              ))}
              <Radio
                checked={
                  selectedTenantCode === 'other' ||
                  (Boolean(tenantCode) &&
                    tenantList.findIndex((tenant: Tenant) => tenant.code === selectedTenantCode) === -1)
                }
                id="radio-other"
                isLabelVisible={false}
                label="Other"
                name="tenants"
                onChange={(e: SyntheticEvent<HTMLSelectElement>) => setSelectedTenant(e.currentTarget.value)}
                value="other"
              >
                <Input
                  id="otherTenant"
                  label="Other"
                  onChange={(e: SyntheticEvent<HTMLInputElement>) => {
                    setSelectedTenant('other');
                    setOtherTenantValue(e.currentTarget.value);
                  }}
                  name="otherTenant"
                  placeholder="Other"
                  value={otherTenantValue}
                />
              </Radio>

              <hr className="tenant-divider" />

              <Button
                type="submit"
                variant="primary"
                className="btn-custom"
                onClick={(e: SyntheticEvent<HTMLElement, MouseEvent>) => {
                  e.preventDefault();

                  const acquirerCode = selectedTenantCode === 'other' ? otherTenantValue : selectedTenantCode;
                  localStorage.setItem('tenant_code', acquirerCode);
                  spi.SetAcquirerCode(acquirerCode);
                  setTenantCode(acquirerCode);
                  checkPairButtonState();
                  setIsTenantModalOpen(false);
                }}
                block
              >
                Select
              </Button>
            </form>
          </Modal.Body>
        </Modal>
        {!tenantCode && (
          <div className="alert alert-danger tenant-message" role="alert">
            <IconError className="tenant-message-icon" />
            You must select a payment type before proceeding to use this Sample POS
          </div>
        )}
        {tenantCode && (
          <div className="alert alert-success tenant-message" role="alert">
            <IconSuccess className="tenant-message-icon" />
            {tenantList.find((tenant: Tenant) => tenant.code === tenantCode)?.name || `Other: ${tenantCode}`}
          </div>
        )}
        <button
          className="btn btn-primary rounded-0 btn-block btn-lg mb-4"
          disabled={status !== SpiStatus.Unpaired}
          id="btnSetTenant"
          onClick={() => setIsTenantModalOpen(true)}
          type="submit"
        >
          Simple Payments Integration
        </button>
      </div>

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
            pattern="^[a-zA-Z0-9]{1,16}$"
            required
            title="POS Id must be alphanumeric and less than 16 characters. Special characters and spaces not allowed"
            disabled={!isFinishedPairing || status !== SpiStatus.Unpaired}
            value={posId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsFormSaved(false);
              setPosId(e.target.value);
            }}
          />
          <Input
            id="inpAPIkey"
            name="API key"
            disabled={!isFinishedPairing}
            label="API key"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsFormSaved(false);
              setApiKey(e.target.value);
            }}
            value="BurgerPosDeviceAPIKey"
          />
          <Input
            id="inpSerial"
            name="serial"
            label="Serial"
            value={serial}
            placeholder="000-000-000"
            required={secureWebSocket}
            disabled={!isFinishedPairing}
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
            disabled={secureWebSocket || !isFinishedPairing}
            required={!autoAddress}
            value={eftpos}
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
              disabled={!isFinishedPairing}
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
              disabled={window.location.protocol !== 'http:' || !isFinishedPairing}
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
              disabled={window.location.protocol !== 'http:' || !isFinishedPairing}
              checked={autoAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setIsFormSaved(false);
                setAutoAddress(e.target.checked);
              }}
            />
            <button
              id="btnSaveSetting"
              type="submit"
              className="btn btn-primary rounded-0 btn-block btn-lg mb-2"
              disabled={isFormSaved || !isFinishedPairing}
            >
              Save Setting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PairingConfig;
