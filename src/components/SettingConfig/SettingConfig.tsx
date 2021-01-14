import { Button } from 'react-bootstrap';
import React, { useState } from 'react';
import Checkbox from '../Checkbox';
import { Textarea } from '../Input';

function SettingConfig(props: { handleSaveSetting: Function; terminal: any }) {
  const { handleSaveSetting, terminal } = props;
  const [sigFlow, setSigFlow] = useState(terminal?.setting?.sigFlow);
  const [eftposReceipt, setEftposReceipt] = useState(terminal?.setting?.eftposReceipt);
  const [printMerchantCopy, setPrintMerchantCopy] = useState(terminal?.setting?.printMerchantCopy);
  const [receiptHeader, setReceiptHeader] = useState(terminal?.setting?.receiptHeader || '');
  const [receiptFooter, setReceiptFooter] = useState(terminal?.setting?.receiptFooter || '');
  const [suppressMerchantPassword, setSuppressMerchantPassword] = useState(terminal?.setting?.suppressMerchantPassword);

  return (
    <div>
      <h2 className="sub-header">Setting</h2>
      <div className="mr-3 ml-3">
        <Checkbox
          id="check-receipt-eftpos"
          label="Receipt from EFTPOS"
          checked={eftposReceipt}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setEftposReceipt(e.target.checked);
          }}
        />
        <Checkbox
          id="check-sig-eftpos"
          label="Sig from EFTPOS"
          checked={sigFlow}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSigFlow(e.target.checked);
          }}
        />
        <Checkbox
          id="print-merchant-copy"
          label="Print Merchant Copy"
          checked={printMerchantCopy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setPrintMerchantCopy(e.target.checked);
          }}
        />
        <Checkbox
          id="suppress-merchant-password"
          label="Suppress Merchant Password"
          checked={suppressMerchantPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSuppressMerchantPassword(e.target.checked);
          }}
        />
        <Textarea
          id="receipt-header"
          name="Receipt-header"
          label="Receipt header"
          value={receiptHeader}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setReceiptHeader(e.target.value);
          }}
        />
        <Textarea
          id="receipt-footer"
          name="Receipt-footer"
          label="Receipt footer"
          value={receiptFooter}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setReceiptFooter(e.target.value);
          }}
        />
        <Button
          block
          variant="primary"
          type="button"
          id="btnApply"
          onClick={() => {
            handleSaveSetting(
              eftposReceipt,
              sigFlow,
              printMerchantCopy,
              receiptHeader,
              receiptFooter,
              suppressMerchantPassword
            );
          }}
        >
          Save &amp; Apply
        </Button>
        <br />
      </div>
    </div>
  );
}

export default SettingConfig;
