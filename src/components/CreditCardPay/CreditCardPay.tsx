import React, { useState } from 'react';
import { Input } from '../Input';
import Checkbox from '../Checkbox';

function handleKeyPress(event: KeyboardEvent, setPromptCashout: Function) {
  if (event.key < '0' || event.key > '9') {
    // alert('invalid input');
    event.preventDefault();
    return false;
  }
  setPromptCashout(false);
  return true;
}

function CreditCard(props: {
  promptCashout: boolean;
  setPromptCashout: Function;
  openPricing: boolean;
  setOpenPricing: Function;
  transactionStatus: boolean;
  payActionType: Function;
}) {
  const { payActionType, promptCashout, setPromptCashout, openPricing, setOpenPricing, transactionStatus } = props;
  const [tipAmount, setTipAmount] = useState(0);
  const [cashoutAmount, setCashoutAmount] = useState(0);
  const [manualAmount, setManualAmount] = useState<number>(0);

  return (
    <>
      <div className="ml-4 mr-4">
        <Input
          id="inpTipAmount"
          name="Tip"
          label="Tip Amount"
          disabled={cashoutAmount > 0 || transactionStatus}
          min="0"
          type="number"
          onKeyPress={(e: KeyboardEvent) => handleKeyPress(e, setPromptCashout)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTipAmount(parseInt(e.target.value, 10))}
        />
        <p className="ml-2">Cents</p>
        <Input
          id="inpCashoutAmount"
          name="Cashout amount"
          label="Cashout Amount"
          disabled={tipAmount > 0 || transactionStatus}
          min="0"
          onKeyPress={(e: KeyboardEvent) => handleKeyPress(e, setPromptCashout)}
          type="number"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCashoutAmount(parseInt(e.target.value, 10))}
        />
        <p className="ml-2">Cents</p>
        <Checkbox
          id="prompt_cashout"
          disabled={tipAmount > 0 || transactionStatus}
          checked={promptCashout}
          label="Prompt for Cashout"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPromptCashout(e.currentTarget.checked)}
        />
        <hr />
        <hr />
        <Input
          id="inpOpenPrice"
          name="Open Price"
          label="Order Amount"
          disabled={openPricing === false || transactionStatus}
          min="0"
          onKeyPress={(e: KeyboardEvent) => handleKeyPress(e, setPromptCashout)}
          defaultValue={manualAmount === 0 ? '' : manualAmount.toString()}
          type="number"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualAmount(parseInt(e.target.value, 10))}
        />
        <p className="ml-2">Cents</p>
        <Checkbox
          id="open-pricing"
          label="Override Order Total"
          disabled={transactionStatus}
          checked={openPricing}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setOpenPricing(e.target.checked);
          }}
        />
      </div>
      <button
        id="creditCardPay"
        className="primary-button checkout-button mb-0 pull-left"
        type="button"
        disabled={transactionStatus}
        onClick={() => {
          payActionType(tipAmount, cashoutAmount, manualAmount);
          window.localStorage.setItem('open_pricing', openPricing.toString());
        }}
      >
        Pay
      </button>
    </>
  );
}
export default CreditCard;
