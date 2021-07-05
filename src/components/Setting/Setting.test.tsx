import { mount } from 'enzyme';
import React, { Component } from 'react';
import { act } from 'react-dom/test-utils';
import Setting from './Setting';

describe('Setting', () => {
  const spi = {
    SetPosId: jest.fn(),
    SetTestMode: jest.fn(),
    SetSerialNumber: jest.fn(),
    SetDeviceApiKey: jest.fn(),
    SetSecureWebSockets: jest.fn(),
    SetAutoAddressResolution: jest.fn(),
    SetEftposAddress: jest.fn(),
  };
  const onErrorMsg = jest.fn();
  const setSuppressMerchantPassword = jest.fn();
  it('test1', () => {
    const component = mount(
      <Setting
        spi={spi}
        status="hello"
        errorMsg="error"
        onErrorMsg={onErrorMsg}
        suppressMerchantPassword
        setSuppressMerchantPassword={setSuppressMerchantPassword}
      />
    );

    const event = {
      detail: {
        Finished: true,
        Success: 'Failed',
        Response: {
          Data: {
            error_reason: 'HOST_DECLINED',
          },
        },
      },
    };
    const customEvent = new CustomEvent('TxFlowStateChanged', event);
    act(() => {
      document.dispatchEvent(customEvent);
    });
  });
});
