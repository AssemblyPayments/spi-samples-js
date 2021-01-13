import { configureStore } from '@reduxjs/toolkit';
import SPI from '../../pages/Burger/spi';

import rootReducer from '../reducers/index';

const data = window.localStorage.getItem('reduxPosState');
const persistedState = JSON.parse(data || '{}');
SPI.initalizeInstances(persistedState);

const store = configureStore({
  reducer: rootReducer,
  preloadedState: persistedState,
});

store.subscribe(() => {
  const state = store.getState();

  const terminals = Object.entries(state.terminals).reduce((acc: any, val: any) => {
    console.log(acc, val);
    if (val[0] === 'activeTerminal') return acc;
    acc[val[0]] = {
      id: val[1].id,
      terminalStatus: val[1].terminalStatus,
      terminalConfig: val[1].terminalConfig,
    };
    return acc;
  }, {});

  // console.log('store save', terminals);
  const persistState = {
    terminals,
  };

  window.localStorage.setItem('reduxPosState', JSON.stringify(persistState));
});

export default store;
