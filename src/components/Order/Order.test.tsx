import { mount } from 'enzyme';
import React from 'react';
import { Provider } from 'react-redux';
import store from '../../redux/store';

import Order from './Order';

describe('Order', () => {
  const setPosRefId = jest.fn();
  const posRefId = '';
  let component: any;
  let onRefund = jest.fn();
  let onGetTransaction = jest.fn();
  let onLastTransaction = jest.fn();
  let handleApplySurcharge = jest.fn();
  let onChangeProductQuantity = jest.fn();

  beforeEach(() => {
    const list = [{ id: '101', name: 'Burger', quantity: 1, price: '14', image: '' }];
    const onCheckout = jest.fn();
    onRefund = jest.fn();
    onGetTransaction = jest.fn();
    onLastTransaction = jest.fn();
    onChangeProductQuantity = jest.fn();
    handleApplySurcharge = jest.fn();
    const surchargeAmount = 100;
    const onErrorMsg = jest.fn();
    component = mount(
      <Provider store={store}>
        <Order
          list={list}
          onChangeProductQuantity={onChangeProductQuantity}
          onRefund={onRefund}
          onGetTransaction={onGetTransaction}
          onLastTransaction={onLastTransaction}
          onCheckout={onCheckout}
          handleApplySurcharge={handleApplySurcharge}
          posRefId={posRefId}
          setPosRefId={setPosRefId}
          surchargeAmount={surchargeAmount}
          status="Unpaired"
          errorMsg=""
          onErrorMsg={onErrorMsg}
        />
      </Provider>
    );
  });

  it('should call onRefund with default values', () => {
    component.find('button#refundButton').simulate('click');
    expect(onRefund.mock.calls.length).toBe(1);
  });

  it('should call handleApplySurcharge with default values', () => {
    component.find('button#surchargeButton').simulate('click');
    component.find('button#btnApplySurcharge').simulate('click');

    expect(handleApplySurcharge.mock.calls.length).toBe(1);
  });

  it('should call handleApplySurcharge with $1 when 100 cents applied as surcharge', () => {
    component.find('button#surchargeButton').simulate('click');
    component.find('input#surcharge').simulate('change', { target: { value: 100 } });
    component.find('button#btnApplySurcharge').simulate('click');

    expect(handleApplySurcharge.mock.calls[0][0]).toBe(100);
  });

  it('should open a modal on click of the getTransaction button', () => {
    component.find('button#getTransactionButton').simulate('click');
    expect(component.find('.modal').exists()).toBeTruthy();
  });

  it('should show default quantity of items', () => {
    const quantity = component.find('#itemQuantity101').text();
    expect(quantity).toBe('1');
  });

  it('should change quantity when incremented', () => {
    component.find('button#btnItemInc101').simulate('click');

    expect(onChangeProductQuantity.mock.calls[0][0]).toBe('101');
    expect(onChangeProductQuantity.mock.calls[0][1]).toBe(1);
  });

  it('should change quantity and reset surcharge when item with 1 qty decremented', () => {
    component.find('button#btnItemDec101').simulate('click');

    expect(handleApplySurcharge.mock.calls[0][0]).toBe(0);
    expect(onChangeProductQuantity.mock.calls[0][0]).toBe('101');
    expect(onChangeProductQuantity.mock.calls[0][1]).toBe(-1);
  });

  it('should change quantity and not reset surcharge when num of items are more than 1', () => {
    const list = [
      { id: '101', name: 'Burger', quantity: 1, price: '14', image: '' },
      { id: '201', name: 'Pizza', quantity: 1, price: '15', image: '' },
    ];
    const onCheckout = jest.fn();
    onRefund = jest.fn();
    onLastTransaction = jest.fn();
    onChangeProductQuantity = jest.fn();
    handleApplySurcharge = jest.fn();
    const surchargeAmount = 100;
    const onErrorMsg = jest.fn();
    component = mount(
      <Provider store={store}>
        <Order
          list={list}
          onChangeProductQuantity={onChangeProductQuantity}
          onRefund={onRefund}
          onGetTransaction={onGetTransaction}
          onLastTransaction={onLastTransaction}
          onCheckout={onCheckout}
          handleApplySurcharge={handleApplySurcharge}
          posRefId={posRefId}
          setPosRefId={setPosRefId}
          surchargeAmount={surchargeAmount}
          status="Unpaired"
          errorMsg=""
          onErrorMsg={onErrorMsg}
        />
      </Provider>
    );

    component.find('button#btnItemDec101').simulate('click');

    expect(handleApplySurcharge.mock.calls.length).toBe(0);
    expect(onChangeProductQuantity.mock.calls[0][0]).toBe('101');
    expect(onChangeProductQuantity.mock.calls[0][1]).toBe(-1);
  });

  it('should change quantity and not reset surcharge when item more than 1 qty decremented', () => {
    const list = [{ id: '101', name: 'Burger', quantity: 2, price: '14', image: '' }];
    const onCheckout = jest.fn();
    onRefund = jest.fn();
    onLastTransaction = jest.fn();
    onChangeProductQuantity = jest.fn();
    handleApplySurcharge = jest.fn();
    const surchargeAmount = 100;
    const onErrorMsg = jest.fn();
    component = mount(
      <Provider store={store}>
        {' '}
        <Order
          list={list}
          onChangeProductQuantity={onChangeProductQuantity}
          onRefund={onRefund}
          onGetTransaction={onGetTransaction}
          onLastTransaction={onLastTransaction}
          onCheckout={onCheckout}
          handleApplySurcharge={handleApplySurcharge}
          posRefId={posRefId}
          setPosRefId={setPosRefId}
          surchargeAmount={surchargeAmount}
          status="Unpaired"
          errorMsg=""
          onErrorMsg={onErrorMsg}
        />
      </Provider>
    );

    component.find('button#btnItemDec101').simulate('click');

    expect(handleApplySurcharge.mock.calls.length).toBe(0);
    expect(onChangeProductQuantity.mock.calls[0][0]).toBe('101');
    expect(onChangeProductQuantity.mock.calls[0][1]).toBe(-1);
  });
});
