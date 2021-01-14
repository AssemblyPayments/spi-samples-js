import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Input } from '../Input';

function handleKeyPress(event: KeyboardEvent) {
  if (event.key < '0' || event.key > '9') {
    event.preventDefault();
    return false;
  }
  return true;
}

function applySurchargeAction(handleApplySurcharge: Function, setSurcharge: Function, surcharge: number) {
  handleApplySurcharge(surcharge / 100);
  setSurcharge(0);
}

function SurchargeModal(props: {
  show: boolean;
  handleClose: Function;
  handleApplySurcharge: Function;
  surcharge: number;
  setSurcharge: Function;
}) {
  const { show, handleClose, handleApplySurcharge, surcharge, setSurcharge } = props;

  return (
    <Modal show={show} onHide={() => handleClose()}>
      <Modal.Header closeButton>
        <Modal.Title>Add Surcharge</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Input
          id="surcharge"
          name="surcharge"
          label="Surcharge Amount"
          type="number"
          min="0"
          onKeyPress={handleKeyPress}
          defaultValue={surcharge === 0 ? '' : surcharge.toString()}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSurcharge(Number.parseInt(e.target.value, 10))}
        />
        <p className="ml-2">Cents</p>
        <Button
          id="btnApplySurcharge"
          variant="primary"
          className="btn-custom primary-button"
          onClick={() => applySurchargeAction(handleApplySurcharge, setSurcharge, surcharge)}
          block
        >
          Apply
        </Button>
      </Modal.Body>
    </Modal>
  );
}

export { SurchargeModal as default, handleKeyPress };
