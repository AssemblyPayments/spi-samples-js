import { mount, shallow } from 'enzyme';
import React, { Component } from 'react';
import { SpiStatus } from '@mx51/spi-client-js';
import Actions from './Actions';
import { settlement as settlementService, settlementEnquiry as settlementEnquiryService } from '../../services';

describe('Actions', () => {
  const spi = {
    SetPosId: jest.fn(),
    SetTestMode: jest.fn(),
    SetSerialNumber: jest.fn(),
    SetDeviceApiKey: jest.fn(),
    SetSecureWebSockets: jest.fn(),
    SetAutoAddressResolution: jest.fn(),
    SetEftposAddress: jest.fn(),
  };
  const getTerminalStatus = jest.fn();
  const setActionType = jest.fn();

  // const ref = jest.spyOn(React, 'useRef').mockReturnValueOnce({ current: document.createElement('div') });
  const ref = {
    current: {
      value: jest.fn(),
    },
  };

  it('test1', () => {
    const onErrorMsg = jest.fn();

    const component = shallow(
      <Actions
        spi={spi}
        setActionType={setActionType}
        flowEl={ref}
        getTerminalStatus={getTerminalStatus}
        receiptEl={ref}
        status={SpiStatus.Unpaired}
        errorMsg="error"
        onErrorMsg={onErrorMsg}
      />
    );

    component.find('button#btnTerminalStatus').simulate('click');
    expect(onErrorMsg.mock.calls.length).toBe(1);
    expect(onErrorMsg.mock.calls[0][0]).toBe('Please pair your POS to the terminal or check your network connection');
  });

  it('test2', () => {
    const onErrorMsg = jest.fn();

    const component = shallow(
      <Actions
        spi={spi}
        setActionType={setActionType}
        flowEl={ref}
        getTerminalStatus={getTerminalStatus}
        receiptEl={ref}
        status={SpiStatus.PairedConnected}
        errorMsg="error"
        onErrorMsg={onErrorMsg}
      />
    );

    component.find('button#btnTerminalStatus').simulate('click');
    expect(onErrorMsg.mock.calls.length).toBe(0);
    expect(getTerminalStatus.mock.calls.length).toBe(1);
  });

  it('test3', () => {
    const onErrorMsg = jest.fn();
    const setActionType = jest.fn();

    const settlementEnquirySpy = jest
      .spyOn(settlementEnquiryService, 'initiateSettlementEnquiry')
      .mockImplementation((flowMsg, spiObject) => {});

    const component = shallow(
      <Actions
        spi={spi}
        setActionType={setActionType}
        flowEl={ref}
        getTerminalStatus={getTerminalStatus}
        receiptEl={ref}
        status={SpiStatus.PairedConnected}
        errorMsg="error"
        onErrorMsg={onErrorMsg}
      />
    );

    component.find('button#btnSettlementEnquiry').simulate('click');
    expect(onErrorMsg.mock.calls.length).toBe(0);
    expect(setActionType.mock.calls[0][0]).toBe('SettlementEnquiry');
    expect(settlementEnquirySpy.mock.calls.length).toBe(1);
  });

  it('test4', () => {
    const onErrorMsg = jest.fn();
    const setActionType = jest.fn();

    const settlementSpy = jest
      .spyOn(settlementService, 'initiateSettlement')
      .mockImplementation((flowMsg, spiObject) => {});

    const component = shallow(
      <Actions
        spi={spi}
        setActionType={setActionType}
        flowEl={ref}
        getTerminalStatus={getTerminalStatus}
        receiptEl={ref}
        status={SpiStatus.PairedConnected}
        errorMsg="error"
        onErrorMsg={onErrorMsg}
      />
    );

    component.find('button#btnSettlement').simulate('click');
    expect(onErrorMsg.mock.calls.length).toBe(0);
    expect(setActionType.mock.calls[0][0]).toBe('Settle');
    expect(settlementSpy.mock.calls.length).toBe(1);
  });
});
