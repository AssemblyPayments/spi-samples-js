import { mount } from 'enzyme';
import React from 'react';
import PairingConfig from './PairingConfig';

describe('PairingConfig', () => {
  let component: any;
  let spi = {
    SetPosId: jest.fn(),
    SetTestMode: jest.fn(),
    SetSerialNumber: jest.fn(),
    SetDeviceApiKey: jest.fn(),
    SetSecureWebSockets: jest.fn(),
    SetAutoAddressResolution: jest.fn(),
    SetEftposAddress: jest.fn(),
  };
  beforeEach(() => {
    spi = {
      SetPosId: jest.fn(),
      SetTestMode: jest.fn(),
      SetSerialNumber: jest.fn(),
      SetDeviceApiKey: jest.fn(),
      SetSecureWebSockets: jest.fn(),
      SetAutoAddressResolution: jest.fn(),
      SetEftposAddress: jest.fn(),
    };
    component = mount(<PairingConfig isFinishedPairing setPairButton={() => {}} spi={spi} status="" />);
  });

  it('should call formParingConfig and save default values', () => {
    component.find('input#inpPostId').simulate('change', { target: { value: 'mx51' } });
    component.find('input#inpAPIkey').simulate('change', { target: { value: 'RamenPosDeviceIpApiKey' } });
    component.find('input#inpSerial').simulate('change', { target: { value: '123-123-123' } });
    component.find('input#inpEFTPOS').simulate('change', { target: { value: '123.12.12.12' } });
    component.find('input#ckbTestMode').simulate('change', { target: { checked: false } });
    component.find('input#ckbSecureWebSockets').simulate('change', { target: { checked: false } });
    component.find('input#ckbAutoAddress').simulate('change', { target: { checked: false } });

    component.find('form#formPairingConfig').simulate('submit');

    expect(spi.SetPosId.mock.calls[0][0]).toBe('mx51');
    expect(spi.SetDeviceApiKey.mock.calls[0][0]).toBe('RamenPosDeviceIpApiKey');
    expect(spi.SetSerialNumber.mock.calls[0][0]).toBe('123-123-123');
    expect(spi.SetEftposAddress.mock.calls[0][0]).toBe('123.12.12.12');
    expect(spi.SetTestMode.mock.calls[0][0]).toBe(false);
    expect(spi.SetSecureWebSockets.mock.calls[0][0]).toBe(false);
    expect(spi.SetAutoAddressResolution.mock.calls[0][0]).toBe(false);
  });
});
