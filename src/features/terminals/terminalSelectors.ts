import { createSelector } from '@reduxjs/toolkit';
import { SpiStatus } from '@mx51/spi-client-js';

export const selectTerminals = (state: any) => state.terminals;

export const selectActiveTerminal = createSelector(selectTerminals, (terminals) =>
  terminals.activeTerminal
    ? { terminal: terminals[terminals.activeTerminal.id], page: terminals.activeTerminal.page }
    : null
);

export const selectActiveTerminals = createSelector(selectTerminals, (terminals) =>
  Object.entries(terminals)
    .filter((e) => e[0] !== 'activeTerminal')
    .map((e) => e[1])
);

export const selectIsPairedTerminalStatus = createSelector(
  selectActiveTerminals,
  (terminals) => terminals.filter((t: any) => t.status === SpiStatus.PairedConnected).length > 0
);

export const selectPairedTerminals = createSelector(selectActiveTerminals, (terminals) =>
  terminals.filter((t: any) => t.status === SpiStatus.PairedConnected)
);

export const selectCurrentPairedTerminals = createSelector(selectPairedTerminals, (terminals) =>
  terminals && terminals.length > 0 ? terminals[0] : {}
);

export const selectCurrentPairedTerminal = createSelector(selectTerminals, (terminals) =>
  terminals && terminals.currentPairedTerminalId ? terminals[terminals.currentPairedTerminalId] : undefined
);
