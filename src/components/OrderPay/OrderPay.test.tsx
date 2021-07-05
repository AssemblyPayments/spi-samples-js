import { shallow, mount } from 'enzyme';
import React from 'react';
import OrderPay from './OrderPay';

describe('OrderPay', () => {
  let component: any;
  let handleCreditCardPay = jest.fn();
  let handleMotoPay = jest.fn();
  let onErrorMsg = jest.fn();

  beforeEach(() => {
    handleCreditCardPay = jest.fn();
    handleMotoPay = jest.fn();
    const totalAmount = 4;
    const promptCashout = false;
    const setPromptCashout = jest.fn();
    const openPricing = false;
    const setOpenPricing = jest.fn();
    const transactionStatus = false;
    const status = 'PairedConnected';
    onErrorMsg = jest.fn();
    component = mount(
      <OrderPay
        handleCreditCardPay={handleCreditCardPay}
        handleMotoPay={handleMotoPay}
        totalAmount={totalAmount}
        promptCashout={promptCashout}
        setPromptCashout={setPromptCashout}
        openPricing={openPricing}
        setOpenPricing={setOpenPricing}
        transactionStatus={transactionStatus}
        status={status}
        onErrorMsg={onErrorMsg}
      />
    );
  });

  it('should call handleCreditCardPay with default values', () => {
    component.find('button#creditCardPay').simulate('click');
    expect(handleCreditCardPay.mock.calls[0][0]).toBe(0);
    expect(handleCreditCardPay.mock.calls[0][1]).toBe(0);
    expect(handleCreditCardPay.mock.calls[0][2]).toBe(0);
  });

  it('should call handleMotoPay with default values', () => {
    component.find('button#moto').simulate('click');
    component.find('button#motoPay').simulate('click');
    expect(handleMotoPay.mock.calls.length).toBe(1);
  });

  it('should display total amount', () => {
    const totalAmount = component.find('h2#totalAmount').text();
    expect(totalAmount).toBe('Order total $4');
  });

  it('should call creditCardPay with tipAmount entered', () => {
    component.find('input#inpTipAmount').simulate('change', { target: { value: 100 } });
    component.find('button#creditCardPay').simulate('click');

    expect(handleCreditCardPay.mock.calls[0][0]).toBe(100);
    expect(handleCreditCardPay.mock.calls[0][1]).toBe(0);
    expect(handleCreditCardPay.mock.calls[0][2]).toBe(0);
  });

  it('should call creditCardPay when openPrice entered', () => {
    component.find('input#inpOpenPrice').simulate('change', { target: { value: 1000 } });
    component.find('button#creditCardPay').simulate('click');

    expect(handleCreditCardPay.mock.calls[0][0]).toBe(0);
    expect(handleCreditCardPay.mock.calls[0][1]).toBe(0);
    expect(handleCreditCardPay.mock.calls[0][2]).toBe(1000);
  });
});
