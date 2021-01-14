import { DeviceAddressResponseCode } from '@mx51/spi-client-js';
import {
  updateDeviceAddress,
  updateTxMessage,
  updateTxFlow,
  updateTerminalSerialNumber,
  updatePairingStatus,
  updatePairingFlow,
  updateTerminalStatus,
  updateTerminalSecret,
} from './terminalSlice';
import eventBus from '../../pages/Burger/eventBus';
import events from '../../constants/events';

export default function watchTerminalEvents() {
  return (dispatch) => {
    eventBus.addEventListener(events.spiTerminalConfigChanged, (e) => {
      const { id: instanceId, payload } = e.detail;
      const event = {
        id: instanceId,
        serialNumber: payload.serial_number,
      };

      dispatch(updateTerminalSerialNumber(event));
    });

    eventBus.addEventListener(events.spiStatusChanged, (e) => {
      const { id: instanceId, payload } = e.detail;
      const event = {
        id: instanceId,
        status: payload,
      };

      dispatch(updatePairingStatus(event));
    });

    eventBus.addEventListener(events.spiPairingFlowStateChanged, (e) => {
      const { detail } = e;
      const event = {
        id: detail.id,
        payload: { ...detail.payload },
      };

      dispatch(updatePairingFlow(event));
    });

    eventBus.addEventListener(events.spiSecretsChanged, (e) => {
      const { detail } = e;
      const event = {
        id: detail.id,
        payload: { ...detail.payload },
      };

      dispatch(updateTerminalSecret(event));
    });

    eventBus.addEventListener(events.spiDeviceAddressChanged, (e) => {
      const { id, payload } = e.detail;

      if (payload.DeviceAddressResponseCode === DeviceAddressResponseCode.SUCCESS) {
        const event = {
          id,
          payload: payload.Address,
        };

        dispatch(updateDeviceAddress(event));
      }
    });

    eventBus.addEventListener(events.spiTerminalStatusChanged, (e) => {
      const { detail } = e;
      const event = {
        id: detail.id,
        payload: { ...detail.payload },
      };

      dispatch(updateTerminalStatus(event));
    });

    eventBus.addEventListener(events.spiTxFlowStateChanged, (e) => {
      const { detail } = e;
      const event = {
        id: detail.id,
        payload: JSON.parse(JSON.stringify(detail.payload)),
      };
      dispatch(updateTxFlow(event));
    });

    eventBus.addEventListener(events.spiTxUpdateMessage, (e) => {
      const { detail } = e;
      const event = {
        id: detail.id,
        payload: JSON.parse(JSON.stringify(detail)),
      };
      dispatch(updateTxMessage(event));
    });
  };
}
