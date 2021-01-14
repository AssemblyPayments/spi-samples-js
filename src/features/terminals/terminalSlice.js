import { createSlice } from '@reduxjs/toolkit';
import { TransactionType, SpiStatus } from '@mx51/spi-client-js';
import SPI from '../../pages/Burger/spi';

const terminalsSlice = createSlice({
  name: 'terminals',
  initialState: {},
  reducers: {
    addTerminal(state, action) {
      const { id, payload } = action.payload;
      const data = state[id];
      return {
        ...state,
        activeTerminal: { id, page: 'view' },
        [id]: {
          id,
          pairingFlow: {
            Finished: true,
          },
          ...data,
          ...payload,
          terminalStatus: { status: 'IDLE' },
          terminalConfig: payload ? payload.terminalConfig : {},
        },
      };
    },
    updateTerminalConfig(state, action) {
      const { payload } = action;
      const { id: instanceId } = payload;

      return {
        ...state,
        [instanceId]: {
          terminalConfig: payload.terminalConfig,
        },
      };
    },
    updateTerminalSerialNumber(state, action) {
      const { payload } = action;
      const { id: instanceId, serialNumber } = payload;
      const data = state[instanceId];
      data.terminalConfig = {
        ...state[instanceId].terminalConfig,
        serialNumber,
      };

      return state;
    },
    updatePairingStatus(state, action) {
      const { payload } = action;
      const { id: instanceId, status } = payload;
      const data = state[instanceId];
      data.status = status;
      return state;
    },
    updateTerminalStatus(state, action) {
      const { id: instanceId, payload } = action.payload;
      const data = state[instanceId];
      data.terminalStatus = payload;
      return state;
    },
    updatePairingFlow(state, action) {
      const { id, payload } = action.payload;
      const data = state[id];
      data.pairingFlow = { ...payload };
      if (payload.Finished && !payload.Successful) {
        data.status = SpiStatus.Unpaired;
      }
      return state;
    },
    removeTerminal(state, action) {
      const { id } = action.payload;
      const { [id]: terminal, ...data } = state;
      return data;
    },
    updateActiveTerminal(state, action) {
      const { id, page } = action.payload;
      const data = state;
      data.activeTerminal = { id, page };
      return data;
    },
    updateTxFlow(state, action) {
      const { id, payload } = action.payload;

      const txFlow = payload || {};
      const { Type } = payload;
      const isSettlement = [TransactionType.Settle, TransactionType.SettlementEnquiry].includes(Type);

      return {
        ...state,
        [id]: {
          ...state[id],
          txFlow,
          lastSettlement: isSettlement ? txFlow : state[id].lastSettlement,
        },
      };
    },
    updateTxMessage(state, action) {
      const { id, payload } = action.payload;
      const data = state[id];
      data.txMessage = payload.payload.Data;
      return state;
    },
    clearTransaction(state, action) {
      const { id } = action.payload;
      const data = state[id];
      if (!data) {
        return state;
      }
      if (data.txMessage) {
        delete data.txMessage;
      }
      if (data.txFlow) {
        delete data.txFlow;
      }
      if (data.lastSettlement) {
        delete data.lastSettlement;
      }
      return state;
    },
    updateSetting(state, action) {
      const { id, payload } = action.payload;
      const data = state[id];
      data.setting = { ...payload };
      return state;
    },
    updateTerminalSecret(state, action) {
      const { id, payload } = action.payload;
      const data = state[id];
      data.secret = payload;
      return state;
    },
    updateDeviceAddress(state, action) {
      const { id, payload } = action.payload;
      const data = state[id];
      data.terminalConfig.eftpos = payload;
      return state;
    },
  },
});

export const addTerminal = () => terminalsSlice.actions.addTerminal(SPI.spiAddTerminal());
export const pairTerminal = (id, config) => terminalsSlice.actions.addTerminal(SPI.spiPairTerminal(id, config));
export const unpairTerminal = (id) => terminalsSlice.actions.updatePairingFlow(SPI.spiUnpairTerminal(id));
export const removeTerminal = (id) => terminalsSlice.actions.removeTerminal(SPI.spiRemoveTerminal(id));
export const cancelTerminalPairing = (id) => terminalsSlice.actions.updatePairingFlow(SPI.spiCancelPairingTerminal(id));
export const updateSetting = (id, config) => terminalsSlice.actions.updateSetting(SPI.spiUpdateSetting(id, config));
export const saveTerminalConfig = (id, config) =>
  terminalsSlice.actions.addTerminal(SPI.spiSaveTerminalConfig(id, config));

export const {
  updateTerminalStatus,
  updatePairingStatus,
  updateTerminalSerialNumber,
  updateActiveTerminal,
  updatePairingFlow,
  updateTxFlow,
  updateTxMessage,
  clearTransaction,
  updateTerminalSecret,
  updateDeviceAddress,
} = terminalsSlice.actions;

export default terminalsSlice.reducer;
