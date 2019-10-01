import {
    Spi, 
    Logger, 
    Secrets, 
    OpenTablesEntry,
    BillStatusResponse,
    BillPaymentFlowEndedResponse,
    TransactionType,
    PrintingResponse,
    RefundResponse,
    GetOpenTablesResponse,
    TerminalStatusResponse,
    TerminalBattery,
    PurchaseResponse,
    Settlement,
    SuccessState,
    RequestIdHelper,
    BillRetrievalResult,
    SpiFlow,
    SpiStatus} from '@assemblypayments/spi-client-js/dist/spi-client-js';

// <summary>
// NOTE: THIS PROJECT USES THE 2.6.x of the SPI Client Library
//  
// This is your POS. To integrate with SPI, you need to instantiate a Spi object
// and interact with it.
// 
// Primarily you need to implement 3 things.
// 1. Settings Screen
// 2. Pairing Flow Screen
// 3. Transaction Flow screen
// 
// To see logs from spi, check the console
// </summary>
class TablePos
{
    constructor(log, receipt, flow_msg) 
    {
        this._spi = null;
        this._posId = "TABLEPOS1";
        this._eftposAddress = "192.168.1.1";
        this._spiSecrets = null;
        this._version = '2.6.3';
        this._serialNumber = "";
        this._rcpt_from_eftpos = false;
        this._sig_flow_from_eftpos = false;
        this._print_merchant_copy = false;

        // My Bills Store.
        // Key = BillId
        // Value = Bill 
        this.billsStore = {};

        // Lookup dictionary of table -> current order
        // Key = TableId
        // Value = BillId
        this.tableToBillMapping = {};

        // Assembly Payments Integration asks us to persist some data on their behalf
        // So that the eftpos terminal can recover state.
        // Key = BillId
        // Value = Assembly Payments Bill Data
        this.assemblyBillDataStore = {};

        this._pat = null;

        this._log = log;
        this._receipt = receipt;
        this._flow_msg = flow_msg;
        this._isActionFlow = false;
    }

    Start()
    {
        this._log.info("Starting TablePos...");
        this.LoadPersistedState();

        // region Spi Setup
        // This is how you instantiate Spi.
        this._spi = new Spi(this._posId, this._serialNumber, this._eftposAddress, this._spiSecrets); // It is ok to not have the secrets yet to start with.
        this._spi.Config.PromptForCustomerCopyOnEftpos = this._rcpt_from_eftpos;
        this._spi.Config.SignatureFlowOnEftpos = this._sig_flow_from_eftpos;
        this._spi.Config.PrintMerchantCopy = this._print_merchant_copy;

        this._spi.SetPosInfo("assembly", this._version);

        document.addEventListener('StatusChanged', (e) => this.OnSpiStatusChanged(e.detail)); 
        document.addEventListener('PairingFlowStateChanged', (e) => this.OnPairingFlowStateChanged(e.detail)); 
        document.addEventListener('SecretsChanged', (e) => this.OnSecretsChanged(e.detail)); 
        document.addEventListener('TxFlowStateChanged', (e) => this.OnTxFlowStateChanged(e.detail)); 

        this._spi.PrintingResponse = this.HandlePrintingResponse.bind(this);
        this._spi.TerminalStatusResponse = this.HandleTerminalStatusResponse.bind(this);
        this._spi.BatteryLevelChanged = this.HandleBatteryLevelChanged.bind(this);

        this._pat = this._spi.EnablePayAtTable();
        this.EnablePayAtTableConfigs();
        this._pat.GetBillStatus = this.PayAtTableGetBillDetails.bind(this);
        this._pat.BillPaymentReceived = this.PayAtTableBillPaymentReceived.bind(this);
        this._pat.BillPaymentFlowEnded = this.PayAtTableBillPaymentFlowEnded.bind(this);
        this._pat.GetOpenTables = this.PayAtTableGetOpenTables.bind(this);
        this._spi.Start();

        // And Now we just accept user input and display to the user what is happening.

        this._flow_msg.Clear();
        this._flow_msg.Info("# Welcome to TablePos !");
        
        this.PrintStatusAndActions();
    }

    EnablePayAtTableConfigs()
    {
        if(localStorage.getItem('pat_config')) 
        {
            var savedPatConfig = JSON.parse(localStorage.getItem('pat_config'));
            this._pat.Config.PayAtTableEnabled      = savedPatConfig.PayAtTableEnabled;
            this._pat.Config.OperatorIdEnabled      = savedPatConfig.OperatorIdEnabled;
            this._pat.Config.EqualSplitEnabled      = savedPatConfig.EqualSplitEnabled;
            this._pat.Config.SplitByAmountEnabled   = savedPatConfig.SplitByAmountEnabled;
            this._pat.Config.TippingEnabled         = savedPatConfig.TippingEnabled;
            this._pat.Config.SummaryReportEnabled   = savedPatConfig.SummaryReportEnabled;
            this._pat.Config.AllowedOperatorIds     = savedPatConfig.AllowedOperatorIds;
            this._pat.Config.LabelOperatorId        = savedPatConfig.LabelOperatorId;
            this._pat.Config.LabelTableId           = savedPatConfig.LabelTableId;
            this._pat.Config.LabelPayButton         = savedPatConfig.LabelPayButton;
            this._pat.Config.TableRetrievalEnabled  = savedPatConfig.TableRetrievalEnabled;
        }

        document.getElementById('pat_enabled').checked              = this._pat.Config.PayAtTableEnabled;
        document.getElementById('operatorid_enabled').checked       = this._pat.Config.OperatorIdEnabled;
        document.getElementById('equal_split').checked              = this._pat.Config.EqualSplitEnabled;
        document.getElementById('split_by_amount').checked          = this._pat.Config.SplitByAmountEnabled;
        document.getElementById('tipping').checked                  = this._pat.Config.TippingEnabled;
        document.getElementById('summary_report').checked           = this._pat.Config.SummaryReportEnabled;
        document.getElementById('set_allowed_operatorid').value     = this._pat.Config.AllowedOperatorIds.join(',');
        document.getElementById('set_label_operatorid').value       = this._pat.Config.LabelOperatorId;
        document.getElementById('set_label_tableid').value          = this._pat.Config.LabelTableId;
        document.getElementById('set_label_paybutton').value        = this._pat.Config.LabelPayButton;
        document.getElementById('table_retrieval_enabled').checked  = this._pat.Config.TableRetrievalEnabled;
    }

    OnTxFlowStateChanged(txState)
    {
        this._flow_msg.Clear();
        this.PrintStatusAndActions();
        this._flow_msg.Info("> ");
    }

    OnPairingFlowStateChanged(pairingFlowState)
    {
        this._flow_msg.Clear();
        this.PrintStatusAndActions();
        this._flow_msg.Info("> ");
    }

    OnSecretsChanged(secrets)
    {
        this._spiSecrets = secrets;
        if (secrets != null)
        {
            this._log.info(`# I Have Secrets: ${secrets.EncKey}${secrets.HmacKey}. Persist them Securely.`);
            localStorage.setItem('EncKey', secrets.EncKey);
            localStorage.setItem('HmacKey', secrets.HmacKey);
        }
        else
        {
            this._log.info(`# I Have Lost the Secrets, i.e. Unpaired. Destroy the persisted secrets.`);
            localStorage.removeItem('EncKey');
            localStorage.removeItem('HmacKey');
        }
    }

    // <summary>
    // Called when we received a Status Update i.e. Unpaired/PairedConnecting/PairedConnected
    // </summary>
    // <param name="sender"></param>
    // <param name="spiStatus"></param>
    OnSpiStatusChanged(spiStatus)
    {
        this._log.clear();
        this._log.info(`# --> SPI Status Changed: ${spiStatus}`);
        this.PrintStatusAndActions();
    }

    HandlePrintingResponse(message)
    {
        this._flow_msg.Clear();
        var printingResponse = new PrintingResponse(message);

        if (printingResponse.isSuccess())
        {
            this._flow_msg.Info("# --> Printing Response: Printing Receipt successful");
        }
        else
        {
            this._flow_msg.Info("# --> Printing Response:  Printing Receipt failed: reason = " + printingResponse.getErrorReason() + ", detail = " + printingResponse.getErrorDetail());
        }

        this._spi.AckFlowEndedAndBackToIdle();
        this.PrintStatusAndActions();
    }

    HandleTerminalStatusResponse(message)
    {
        this._flow_msg.Clear();
        var terminalStatusResponse = new TerminalStatusResponse(message);
        this._flow_msg.Info("# Terminal Status Response #");
        this._flow_msg.Info("# Status: " + terminalStatusResponse.GetStatus());
        this._flow_msg.Info("# Battery Level: " + terminalStatusResponse.GetBatteryLevel() + "%");
        this._flow_msg.Info("# Charging: " + terminalStatusResponse.IsCharging());
        this._spi.AckFlowEndedAndBackToIdle();
        this.PrintStatusAndActions();
    }

    HandleBatteryLevelChanged(message)
    {
        this._log.clear();
        var terminalBattery = new TerminalBattery(message);
        this._flow_msg.Info("# Battery Level Changed #");
        this._flow_msg.Info("# Battery Level: " + terminalBattery.BatteryLevel + "%");
        this._spi.AckFlowEndedAndBackToIdle();
        this.PrintStatusAndActions();
    }

    // region PayAtTable Delegates

    // <param name="billId"></param>
    // <param name="tableId"></param>
    // <param name="operatorId"></param>
    // <returns></returns>
    PayAtTableGetBillDetails(billId, tableId, operatorId, paymentFlowStarted)
    {
        if (!billId)
        {
            // We were not given a billId, just a tableId.
            // This means that we are being asked for the bill by its table number.

            // Let's see if we have it.
            if (!this.tableToBillMapping[tableId])
            {
                // We didn't find a bill for this table.
                // We just tell the Eftpos that.
                return Object.assign(new BillStatusResponse(), { Result: BillRetrievalResult.INVALID_TABLE_ID });
            }

            // We have a billId for this Table.
            // Let's set it so we can retrieve it.
            billId = this.tableToBillMapping[tableId];
        }

        if (!this.billsStore[billId])
        {
            // We could not find the billId that was asked for.
            // We just tell the Eftpos that.
            return Object.assign(new BillStatusResponse(), { Result: BillRetrievalResult.INVALID_BILL_ID });
        }

        var myBill = this.billsStore[billId];

        if (this.billsStore[billId].Locked && paymentFlowStarted)
        {
            this._log.info(`Table is Locked.`);
            return Object.assign(new BillStatusResponse(), { Result: BillRetrievalResult.INVALID_TABLE_ID });
        }

        this.billsStore[billId].Locked = paymentFlowStarted;

        var response = Object.assign(new BillStatusResponse(),
        {
            Result: BillRetrievalResult.SUCCESS,
            BillId: billId,
            TableId: tableId,
            OperatorId: operatorId,
            TotalAmount: myBill.TotalAmount,
            OutstandingAmount: myBill.OutstandingAmount
        });

        let billData = this.assemblyBillDataStore[billId];

        response.BillData = billData;
        return response;
    }

    // <param name="billPayment"></param>
    // <param name="updatedBillData"></param>
    PayAtTableBillPaymentReceived(billPayment, updatedBillData)
    {
        if (!this.billsStore[billPayment.BillId])
        {
            // We cannot find this bill.
            return Object.assign(new BillStatusResponse(), { Result: BillRetrievalResult.INVALID_BILL_ID });
        }

        this._flow_msg.Info(`# Got a ${billPayment.PaymentType} Payment against bill ${billPayment.BillId} for table ${billPayment.TableId}`);
        var bill = this.billsStore[billPayment.BillId];
        bill.OutstandingAmount -= billPayment.PurchaseAmount;
        bill.tippedAmount += billPayment.TipAmount;
        bill.SurchargeAmount += billPayment.SurchargeAmount;
        bill.Locked = bill.OutstandingAmount == 0 ? false : true;

        this._flow_msg.Info(`Updated Bill: ${JSON.stringify(bill)}`);

        // Here you can access other data that you might want to store from this payment, for example the merchant receipt.
        // billPayment.PurchaseResponse.GetMerchantReceipt();

        // It is important that we persist this data on behalf of assembly.
        this.assemblyBillDataStore[billPayment.BillId] = updatedBillData;

        this.SaveBillState();

        return Object.assign(new BillStatusResponse(),
        {
            Result: BillRetrievalResult.SUCCESS,
            OutstandingAmount: bill.OutstandingAmount,
            TotalAmount: bill.TotalAmount
        });
    }

    PayAtTableBillPaymentFlowEnded(message)
    {
        var billPaymentFlowEndedResponse = new BillPaymentFlowEndedResponse(message);

        if (!this.billsStore[billPaymentFlowEndedResponse.BillId])
        {
            // We cannot find this bill.
            this._flow_msg.Info(`Incorrect Bill Id!`);
            return;
        }

        var myBill = this.billsStore[billPaymentFlowEndedResponse.BillId];
        myBill.Locked = false;

        this._flow_msg.Info(`
            Bill Id                : ${billPaymentFlowEndedResponse.BillId}
            Table                  : ${billPaymentFlowEndedResponse.TableId}
            Operator Id            : ${billPaymentFlowEndedResponse.OperatorId}
            Bill OutStanding Amount: ${(billPaymentFlowEndedResponse.BillOutstandingAmount / 100.0).toFixed(2)}
            Bill Total Amount      : ${(billPaymentFlowEndedResponse.BillTotalAmount / 100.0).toFixed(2)}
            Card Total Count       : ${billPaymentFlowEndedResponse.CardTotalCount}
            Card Total Amount      : ${billPaymentFlowEndedResponse.CardTotalAmount}
            Cash Total Count       : ${billPaymentFlowEndedResponse.CashTotalCount}
            Cash Total Amount      : ${billPaymentFlowEndedResponse.CashTotalAmount}
            Locked                 : ${myBill.Locked}`);
    }

    PayAtTableGetOpenTables(operatorId)
    {
        var openTableList = [];
        var isOpenTables = false;

        if (Object.keys(this.tableToBillMapping).length > 0)
        {
            for(var tableId in this.tableToBillMapping)
            {
                var item = this.tableToBillMapping[tableId];

                if (this.billsStore[item].OperatorId == operatorId && this.billsStore[item].OutstandingAmount > 0)
                {
                    if (!isOpenTables)
                    {
                        this._flow_msg.Info(`#    Open Tables: `);
                        isOpenTables = true;
                    }

                    var openTablesItem = Object.assign(new OpenTablesEntry(),
                    {
                        TableId: tableId,
                        Label: this.billsStore[item].Label,
                        BillOutstandingAmount: this.billsStore[item].OutstandingAmount
                    });

                    this._flow_msg.Info(`Table Id : ${tableId}, Bill Id: ${this.billsStore[item].BillId}, Outstanding Amount: $${(this.billsStore[item].OutstandingAmount / 100).toFixed(2)}`);
                    openTableList.push(openTablesItem);
                }
            }
        }

        if (!isOpenTables)
        {
            this._flow_msg.Info(`# No Open Tables.`);
        }

        var openTableListJson = JSON.stringify(openTableList);

        return Object.assign(new GetOpenTablesResponse(), 
        {
            TableData: openTableListJson
        });
    }

    // endregion

    PrintStatusAndActions()
    {
        this.PrintFlowInfo();

        this.PrintActions();

        this.PrintPairingStatus();
    }

    PrintFlowInfo()
    {
        switch (this._spi.CurrentFlow)
        {
            case SpiFlow.Pairing:
                var pairingState = this._spi.CurrentPairingFlowState;
                this._flow_msg.Info("### PAIRING PROCESS UPDATE ###");
                this._flow_msg.Info(`# ${pairingState.Message}`);
                this._flow_msg.Info(`# Finished? ${pairingState.Finished}`);
                this._flow_msg.Info(`# Successful? ${pairingState.Successful}`);
                this._flow_msg.Info(`# Confirmation Code: ${pairingState.ConfirmationCode}`);
                this._flow_msg.Info(`# Waiting Confirm from Eftpos? ${pairingState.AwaitingCheckFromEftpos}`);
                this._flow_msg.Info(`# Waiting Confirm from POS? ${pairingState.AwaitingCheckFromPos}`);
                break;

            case SpiFlow.Transaction:
                var txState = this._spi.CurrentTxFlowState;
                this._flow_msg.Info("### TX PROCESS UPDATE ###");
                this._flow_msg.Info(`# ${txState.DisplayMessage}`);
                this._flow_msg.Info(`# PosRefId: ${txState.PosRefId}`);
                this._flow_msg.Info(`# Type: ${txState.Type}`);
                this._flow_msg.Info(`# Request Amount: $${(txState.AmountCents / 100.0).toFixed(2)}`);
                this._flow_msg.Info(`# Waiting For Signature: ${txState.AwaitingSignatureCheck}`);
                this._flow_msg.Info(`# Attempting to Cancel : ${txState.AttemptingToCancel}`);
                this._flow_msg.Info(`# Finished: ${txState.Finished}`);
                this._flow_msg.Info(`# Success: ${txState.Success}`);

                if (txState.Finished)
                {
                   switch(txState.Success) 
                   {
                        case SuccessState.Success:
                            switch (txState.Type)
                            {
                                case TransactionType.Purchase:
                                    this._flow_msg.Info(`# WOOHOO - WE GOT PAID!`);
                                    let purchaseResponse = new PurchaseResponse(txState.Response);
                                    this._flow_msg.Info(`# Response: ${purchaseResponse.GetResponseText()}`);
                                    this._flow_msg.Info(`# RRN: ${purchaseResponse.GetRRN()}`);
                                    this._flow_msg.Info(`# Scheme: ${purchaseResponse.SchemeName}`);
                                    this._flow_msg.Info(`# Customer Receipt:`);
                                    this._receipt.Info(!purchaseResponse.WasCustomerReceiptPrinted() ? purchaseResponse.GetCustomerReceipt().trim() : `# PRINTED FROM EFTPOS`);
                                    this._flow_msg.Info(`# PURCHASE: ${purchaseResponse.GetPurchaseAmount()}`);
                                    this._flow_msg.Info(`# TIP: ${purchaseResponse.GetTipAmount()}`);
                                    this._flow_msg.Info(`# CASHOUT: ${purchaseResponse.GetCashoutAmount()}`);
                                    this._flow_msg.Info(`# BANKED NON-CASH AMOUNT: ${purchaseResponse.GetBankNonCashAmount()}`);
                                    this._flow_msg.Info(`# BANKED CASH AMOUNT: ${purchaseResponse.GetBankCashAmount()}`);
                                    break;
                                case TransactionType.Refund:
                                    this._flow_msg.Info(`# REFUND GIVEN- OH WELL!`);
                                    let refundResponse = new RefundResponse(txState.Response);
                                    this._flow_msg.Info(`# Response: ${refundResponse.GetResponseText()}`);
                                    this._flow_msg.Info(`# RRN: ${refundResponse.GetRRN()}`);
                                    this._flow_msg.Info(`# Scheme: ${refundResponse.SchemeName}`);
                                    this._flow_msg.Info(`# Customer Receipt:`);
                                    this._receipt.Info(!refundResponse.WasCustomerReceiptPrinted() ? refundResponse.GetCustomerReceipt().trim() : "# PRINTED FROM EFTPOS");
                                    this._flow_msg.Info(`# REFUNDED AMOUNT: ${refundResponse.GetRefundAmount()}`);
                                    break;
                                case TransactionType.Settle:
                                    this._flow_msg.Info("# SETTLEMENT SUCCESSFUL!");
                                    if (txState.Response != null)
                                    {
                                        let settleResponse = new Settlement(txState.Response);
                                        this._flow_msg.Info(`# Response: ${settleResponse.GetResponseText()}`);
                                        this._flow_msg.Info("# Merchant Receipt:");
                                        this._receipt.Info(settleResponse.GetReceipt().trim());
                                    }
                                    break;
                            }
                        break;
                        case SuccessState.Failed:
                            switch (txState.Type)
                            {
                                case TransactionType.Purchase:
                                    this._flow_msg.Info(`# WE DID NOT GET PAID :(`);
                                    if (txState.Response != null)
                                    {
                                        let purchaseResponse = new PurchaseResponse(txState.Response);
                                        this._flow_msg.Info(`# Error: ${txState.Response.GetError()}`);
                                        this._flow_msg.Info(`# Response: ${purchaseResponse.GetResponseText()}`);
                                        this._flow_msg.Info(`# RRN: ${purchaseResponse.GetRRN()}`);
                                        this._flow_msg.Info(`# Scheme: ${purchaseResponse.SchemeName}`);
                                        this._flow_msg.Info(`# Customer Receipt:`);
                                        this._receipt.Info(!purchaseResponse.WasCustomerReceiptPrinted()
                                            ? purchaseResponse.GetCustomerReceipt().trim()
                                            : `# PRINTED FROM EFTPOS`);
                                    }
                                    break;
                                case TransactionType.Refund:
                                    this._flow_msg.Info(`# REFUND FAILED!`);
                                    if (txState.Response != null)
                                    {
                                        let refundResponse = new RefundResponse(txState.Response);
                                        this._flow_msg.Info(`# Response: ${refundResponse.GetResponseText()}`);
                                        this._flow_msg.Info(`# RRN: ${refundResponse.GetRRN()}`);
                                        this._flow_msg.Info(`# Scheme: ${refundResponse.SchemeName}`);
                                        this._flow_msg.Info(`# Customer Receipt:`);
                                        this._receipt.Info(!refundResponse.WasCustomerReceiptPrinted() ? refundResponse.GetCustomerReceipt().trim() : "# PRINTED FROM EFTPOS");
                                    }
                                    break;
                                case TransactionType.Settle:
                                    this._flow_msg.Info("# SETTLEMENT FAILED!");
                                    if (txState.Response != null)
                                    {
                                        let settleResponse = new Settlement(txState.Response);
                                        this._flow_msg.Info(`# Response: ${settleResponse.GetResponseText()}`);
                                        this._flow_msg.Info(`# Error: ${txState.Response.GetError()}`);
                                        this._flow_msg.Info("# Merchant Receipt:");
                                        this._receipt.Info(settleResponse.GetReceipt());
                                    }
                                    break;
                                default:
                                    this._flow_msg.Info("# MOTEL POS DOESN'T KNOW WHAT TO DO WITH THIS TX TYPE WHEN IT FAILS");
                                    break;
                            }
                            break;
                        case SuccessState.Unknown:
                            switch (txState.Type)
                            {
                                case TransactionType.Purchase:
                                    this._flow_msg.Info("# WE'RE NOT QUITE SURE WHETHER WE GOT PAID OR NOT :/");
                                    this._flow_msg.Info("# CHECK THE LAST TRANSACTION ON THE EFTPOS ITSELF FROM THE APPROPRIATE MENU ITEM.");
                                    this._flow_msg.Info("# IF YOU CONFIRM THAT THE CUSTOMER PAID, CLOSE THE ORDER.");
                                    this._flow_msg.Info("# OTHERWISE, RETRY THE PAYMENT FROM SCRATCH.");
                                    break;
                                case TransactionType.Refund:
                                    this._flow_msg.Info("# WE'RE NOT QUITE SURE WHETHER THE REFUND WENT THROUGH OR NOT :/");
                                    this._flow_msg.Info("# CHECK THE LAST TRANSACTION ON THE EFTPOS ITSELF FROM THE APPROPRIATE MENU ITEM.");
                                    this._flow_msg.Info("# YOU CAN THE TAKE THE APPROPRIATE ACTION.");
                                    break;
                            }
                            break;
                    }
                }
                break;
        }
    }

    PrintActions()
    {
        // List of input controls which are enabled / shown for the current application state
        let inputsEnabled   = [];
        let statusEl        = document.getElementById('status_indicator');
        let primaryStatusEl = document.getElementById('primary_status');
        let flowStatusEl    = document.getElementById('flow_status');
        let flowStatusHeading = document.getElementById('flow_status_heading');
        let actionForm      = document.getElementById('action-form');
        let pairingForm     = document.getElementById('pairing-form');
        let actionSubmitButton = document.getElementById('submit_action');
        let cancelActionButton = document.getElementById('cancel_action');
        let actionInputGroups = document.querySelectorAll('#action-inputs .input-field-group');
        let currentActionHeading = document.getElementById('current-action-heading');

        statusEl.dataset['status']  = this._spi.CurrentStatus;
        statusEl.dataset['flow']    = this._spi.CurrentFlow;
        primaryStatusEl.innerText   = this._spi.CurrentStatus;
        flowStatusEl.innerText      = this._spi.CurrentFlow;
        flowStatusHeading.innerText = this._spi.CurrentFlow;

        let isUnpaired          = this._spi.CurrentStatus === SpiStatus.Unpaired;
        let isPairedConnecting  = this._spi.CurrentStatus === SpiStatus.PairedConnecting;
        let isPairedConnected   = this._spi.CurrentStatus === SpiStatus.PairedConnected;

        let isIdleFlow          = this._spi.CurrentFlow === SpiFlow.Idle;
        let isTransactionFlow   = this._spi.CurrentFlow === SpiFlow.Transaction;
        let isPairingFlow       = this._spi.CurrentFlow === SpiFlow.Pairing;

        // Configure buttons and related inputs
        let buttons = [
            {
                id: 'save_settings',
                enabled: (isUnpaired && isIdleFlow) || isPairedConnecting || (isPairedConnected && isIdleFlow),
                onClick: () => {
                    if(isUnpaired && isIdleFlow) 
                    {
                        this._posId         = document.getElementById('pos_id').value;
                        this._eftposAddress = document.getElementById('eftpos_address').value;
        
                        this._spi.SetPosId(this._posId);
                        this._spi.SetEftposAddress(this._eftposAddress);
        
                        localStorage.setItem('pos_id', this._posId);
                        localStorage.setItem('eftpos_address', this._eftposAddress);
                    }
        
                    if(isIdleFlow) 
                    {
                        // Print config
                        this._spi.Config.PrintMerchantCopy              = document.getElementById('print_merchant_copy').checked;
                        this._spi.Config.PromptForCustomerCopyOnEftpos  = document.getElementById('rcpt_from_eftpos').checked;
                        this._spi.Config.SignatureFlowOnEftpos          = document.getElementById('sig_flow_from_eftpos').checked;
                        
                        localStorage.setItem('print_merchant_copy', this._spi.Config.PrintMerchantCopy);
                        localStorage.setItem('rcpt_from_eftpos', this._spi.Config.PromptForCustomerCopyOnEftpos);
                        localStorage.setItem('sig_flow_from_eftpos', this._spi.Config.SignatureFlowOnEftpos);

                        // PAT config
                        this._pat.Config.PayAtTableEnabled      = document.getElementById('pat_enabled').checked;
                        this._pat.Config.OperatorIdEnabled      = document.getElementById('operatorid_enabled').checked;
                        this._pat.Config.EqualSplitEnabled      = document.getElementById('equal_split').checked;
                        this._pat.Config.SplitByAmountEnabled   = document.getElementById('split_by_amount').checked;
                        this._pat.Config.TippingEnabled         = document.getElementById('tipping').checked;
                        this._pat.Config.SummaryReportEnabled   = document.getElementById('summary_report').checked;
                        this._pat.Config.AllowedOperatorIds     = document.getElementById('set_allowed_operatorid').value.split(',');
                        this._pat.Config.LabelOperatorId        = document.getElementById('set_label_operatorid').value;
                        this._pat.Config.LabelTableId           = document.getElementById('set_label_tableid').value;
                        this._pat.Config.LabelPayButton         = document.getElementById('set_label_paybutton').value;
                        this._pat.Config.TableRetrievalEnabled  = document.getElementById('table_retrieval_enabled').checked;
                        
                        if(isPairedConnected)
                        {
                            this._pat.PushPayAtTableConfig();
                        }

                        localStorage.setItem('pat_config', JSON.stringify(this._pat.Config));
                    }

                    this._log.info(`Saved settings ${this._posId}:${this._eftposAddress}`);
        
                    this.PrintPairingStatus();
                },
                inputs: []
            },
            {
                id: 'pat_all_enable',
                enabled: isIdleFlow,
                onClick: () => {
                    const payAtTableConfig = {
                        PayAtTableEnabled: true,
                        OperatorIdEnabled: true,
                        AllowedOperatorIds: [ 1 ],
                        EqualSplitEnabled: true,
                        SplitByAmountEnabled: true,
                        SummaryReportEnabled: true,
                        TippingEnabled: true,
                        LabelOperatorId: "Operator ID",
                        LabelPayButton: "Pay at Table",
                        LabelTableId: "Table Number",
                        TableRetrievalEnabled: true,
                    }

                    localStorage.setItem('pat_config', JSON.stringify(payAtTableConfig));
                    this.EnablePayAtTableConfigs();
                    this._pat.PushPayAtTableConfig();
                },
                inputs: []
            },
            {
                id: 'pair',
                enabled: isUnpaired && isIdleFlow,
                onClick: () => {
                    this._spi.Pair();
                },
                inputs: []
            },
            {
                id: 'unpair',
                enabled: !isUnpaired && isIdleFlow,
                onClick: () => {
                    this._spi.Unpair();
                },
                inputs: []
            },
            {
                id: 'pair_cancel',
                enabled: isPairingFlow,
                onClick: () => {
                    this._spi.PairingCancel();
                },
                inputs: []
            },
            {
                id: 'pair_confirm',
                enabled: isPairingFlow && this._spi.CurrentPairingFlowState.AwaitingCheckFromEftpos,
                onClick: () => {
                    this._spi.PairingConfirmCode();
                },
                inputs: []
            },
            {
                id: 'ok',
                enabled: (isPairingFlow && this._spi.CurrentPairingFlowState.Finished) || (isTransactionFlow && this._spi.CurrentTxFlowState.Finished),
                onClick: () => {
                    this._spi.AckFlowEndedAndBackToIdle();
                    this._flow_msg.Clear();
                    this._flow_msg.innerHTML = "Select from the options below";
                    this.PrintStatusAndActions();
                },
                inputs: []
            },
            {
                // start a new bill for table
                id: 'open',
                enabled: isPairedConnected && isIdleFlow,
                onSubmit: () => {
                    let tableId     = document.getElementById('table_number').value;
                    let operatorId  = document.getElementById('operator_id').value;
                    let label       = document.getElementById('label').value;
                    let isLocked    = document.getElementById('locked').checked;

                    this.OpenTable(tableId, operatorId, label, isLocked);
                },
                inputs: ['table_number', 'operator_id', 'label', 'locked']
            },
            {
                // add $amount to the bill of table #
                id: 'add',
                enabled: isPairedConnected && isIdleFlow,
                onSubmit: () => {
                    let tableId     = document.getElementById('table_number').value;
                    let amountCents = parseInt(document.getElementById('amount').value, 10);

                    this.AddToTable(tableId, amountCents);
                },
                inputs: ['table_number', 'amount']
            },
            {
                // close table
                id: 'close',
                enabled: isPairedConnected && isIdleFlow,
                onSubmit: () => {
                    let tableId = document.getElementById('table_number').value;

                    this.CloseTable(tableId);
                },
                inputs: ['table_number']
            },
            {
                // Lock/Unlock table
                id: 'lock',
                enabled: isPairedConnected && isIdleFlow,
                onSubmit: () => {
                    let tableId     = document.getElementById('table_number').value;
                    let isLocked    = document.getElementById('locked').checked;

                    this.LockTable(tableId, isLocked);
                },
                inputs: ['table_number', 'locked']
            },
            {
                // list open tables
                id: 'tables',
                enabled: isPairedConnected && isIdleFlow,
                onClick: () => {
                    this.PrintTables();
                },
                inputs: []
            },
            {
                // print current bill for table
                id: 'table',
                enabled: isPairedConnected && isIdleFlow,
                onSubmit: () => {
                    let tableId = document.getElementById('table_number').value;

                    this.PrintTable(tableId);
                },
                inputs: ['table_number']
            },
            {
                // print bill with ID
                id: 'bill',
                enabled: isPairedConnected && isIdleFlow,
                onSubmit: () => {
                    let billId = document.getElementById('bill_id').value;

                    this.PrintBill(billId);
                },
                inputs: ['bill_id']
            },
            {
                id: 'purchase',
                enabled: (isPairedConnected && isIdleFlow),
                onSubmit: () => {
                    let posRefId        = `purchase-${new Date().toISOString()}`; 
                    let purchaseAmount  = parseInt(document.getElementById('amount').value,10);
                    let tipAmount       = 0;
                    let cashoutAmount   = 0;
                    let promptForCashout = false;
                    let res             = this._spi.InitiatePurchaseTxV2(posRefId, purchaseAmount, tipAmount, cashoutAmount, promptForCashout);
                    if (!res.Initiated)
                    {
                        this._flow_msg.Info(`# Could not initiate purchase: ${res.Message}. Please Retry.`);
                    }
                },
                inputs: ['amount']
            },
            {
                id: 'refund',
                enabled: (isPairedConnected && isIdleFlow),
                onSubmit: () => {
                    let amount      = parseInt(document.getElementById('amount').value,10);
                    let posRefId    = `refund-${new Date().toISOString()}`; 
                    let res         = this._spi.InitiateRefundTx(posRefId, amount);
                    this._flow_msg.Info(res.Initiated ? "# Refund Initiated. Will be updated with Progress." : `# Could not initiate refund: ${res.Message}. Please Retry.`);
                },
                inputs: ['amount']
            },
            {
                id: 'settle',
                enabled: (isPairedConnected && isIdleFlow),
                onClick: () => {
                    let res = this._spi.InitiateSettleTx(RequestIdHelper.Id("settle"));
                    this._flow_msg.Info(res.Initiated ? "# Settle Initiated. Will be updated with Progress." : `# Could not initiate settle: ${res.Message}. Please Retry.`);
                },
                inputs: []
            },
            {
                id: 'tx_sign_accept',
                enabled: (isTransactionFlow && this._spi.CurrentTxFlowState.AwaitingSignatureCheck),
                onClick: () => {
                    this._spi.AcceptSignature(true);
                },
                inputs: []
            },
            {
                id: 'tx_sign_decline',
                enabled: (isTransactionFlow && this._spi.CurrentTxFlowState.AwaitingSignatureCheck),
                onClick: () => {
                    this._spi.AcceptSignature(false);
                },
                inputs: []
            },
            {
                id: 'tx_cancel',
                enabled: (isTransactionFlow && (this._spi.CurrentTxFlowState.Finished && this._spi.CurrentTxFlowState.AttemptingToCancel)),
                onClick: () => {
                    this._spi.CancelTransaction();
                },
                inputs: []
            }
        ];

        let inputs = [
            {
                id: 'pos_id',
                enabled: (isUnpaired && isIdleFlow),
                validate: () => {
                    let posId = document.getElementById('pos_id');

                    return posId.checkValidity();
                }
            },
            {
                id: 'eftpos_address',
                enabled: (isUnpaired || isPairedConnecting),
                validate: () => {
                    let eftposAddress = document.getElementById('eftpos_address');

                    return eftposAddress.checkValidity();
                }
            },
            {
                id: 'print_merchant_copy',
                enabled: isIdleFlow,
                validate: () => {
                    return true;
                }
            },
            {
                id: 'rcpt_from_eftpos',
                enabled: isIdleFlow,
                validate: () => {
                    return true;
                }
            },
            {
                id: 'sig_flow_from_eftpos',
                enabled: isIdleFlow,
                validate: () => {
                    return true;
                }
            }
        ];

        // Hide action inputs
        for(var inputGroup of actionInputGroups) {
            inputGroup.classList.add('hidden');
        }

        buttons.forEach((button) => {
            let buttonElement       = document.getElementById(button.id);

            buttonElement.disabled  = !button.enabled;

            // If this button requires additional input
            if(button.inputs && button.inputs.length) 
            {
                buttonElement.onclick   = () => {

                    // Show relevant inputs for this action
                    button.inputs.forEach((input) => {
                        let inputElement        = document.getElementById(input);
                        let inputGroupElement   = document.querySelector(`#action-inputs [data-id="${input}"]`);
        
                        inputGroupElement.classList.remove('hidden');
                        inputElement.required = true;
                    });

                    this._isActionFlow = true;
                    actionSubmitButton.onclick = () => {
                        button.onSubmit();
                        this._isActionFlow = false;

                        for(var inputGroup of actionInputGroups) {
                            inputGroup.classList.add('hidden');
                        }
            
                        actionSubmitButton.classList.add('hidden');
                        cancelActionButton.classList.add('hidden');
                        currentActionHeading.innerText = '';
                    }

                    actionSubmitButton.classList.remove('hidden');
                    cancelActionButton.classList.remove('hidden');
                    currentActionHeading.innerText = buttonElement.innerText;
                }
            }
            else
            {
                buttonElement.onclick = button.onClick;
                actionSubmitButton.classList.add('hidden');
            }

        });

        cancelActionButton.onclick = () => {
            this._isActionFlow = false;

            for(var inputGroup of actionInputGroups) {
                inputGroup.classList.add('hidden');
            }

            actionSubmitButton.classList.add('hidden');
            cancelActionButton.classList.add('hidden');
            currentActionHeading.innerText = '';
        }

        this._flow_msg.Info();
    }

    PrintPairingStatus()
    {
        this._flow_msg.Info(`# --------------- STATUS ------------------`);
        this._flow_msg.Info(`# ${this._posId} <-> Eftpos: ${this._eftposAddress} #`);
        this._flow_msg.Info(`# SPI STATUS: ${this._spi.CurrentStatus}     FLOW: ${this._spi.CurrentFlow} #`);
        this._flow_msg.Info(`# SPI CONFIG: ${JSON.stringify(this._spi.Config)}`);
        this._flow_msg.Info("# ----------------TABLES-------------------");
        this._flow_msg.Info(`#    Open Tables: ${Object.keys(this.tableToBillMapping).length}`);
        this._flow_msg.Info(`# Bills in Store: ${Object.keys(this.billsStore).length}`);
        this._flow_msg.Info(`# Assembly Bills: ${Object.keys(this.assemblyBillDataStore).length}`);
        this._flow_msg.Info(`# -----------------------------------------`);
        this._flow_msg.Info(`# POS: v${this._version} Spi: v${Spi.GetVersion()}`);
    }

    //region My Pos Functions

    OpenTable(tableId, operatorId, label, locked = false)
    {
        if (this.tableToBillMapping[tableId])
        {
            this._flow_msg.Info(`Table Already Open: ${JSON.stringify(this.billsStore[this.tableToBillMapping[tableId]])}`);
            return;
        }

        let newBill = Object.assign(new Bill(), { BillId: this.NewBillId(), TableId: tableId, OperatorId: operatorId, Label: label, Locked: locked });
        this.billsStore[newBill.BillId] = newBill;
        this.tableToBillMapping[newBill.TableId] = newBill.BillId;

        
        if(!this._pat.Config.AllowedOperatorIds.includes(operatorId))
        {
            this._pat.Config.AllowedOperatorIds.push(operatorId);
            document.getElementById('set_allowed_operatorid').value = this._pat.Config.AllowedOperatorIds.join(',');
            this._pat.PushPayAtTableConfig();
            localStorage.setItem('pat_config', JSON.stringify(this._pat.Config));
        }


        this.SaveBillState();
        this._flow_msg.Info(`Opened: ${JSON.stringify(newBill)}`);
    }

    AddToTable(tableId, amountCents)
    {
        if (!this.tableToBillMapping[tableId])
        {
            this._flow_msg.Info("Table not Open.");
            return;
        }

        var bill = this.billsStore[this.tableToBillMapping[tableId]];
        if (bill.Locked)
        {
            this._flow_msg.Info("Table is Locked.");
            return;
        }

        bill.TotalAmount += amountCents;
        bill.OutstandingAmount += amountCents;
        this.SaveBillState();
        this._flow_msg.Info(`Updated: ${JSON.stringify(bill)}`);
    }

    CloseTable(tableId)
    {
        if (!this.tableToBillMapping[tableId])
        {
            this._flow_msg.Info("Table not Open.");
            return;
        }
        var bill = this.billsStore[this.tableToBillMapping[tableId]];
        if (bill.Locked)
        {
            this._flow_msg.Info("Table is Locked.");
            return;
        }

        if (bill.OutstandingAmount > 0)
        {
            this._flow_msg.Info(`Bill not Paid Yet: ${JSON.stringify(bill)}`);
            return;
        }
        
        delete this.billsStore[this.tableToBillMapping[tableId]];
        delete this.tableToBillMapping[tableId];
        delete this.assemblyBillDataStore[bill.BillId];
        this.SaveBillState();
        this._flow_msg.Info(`Closed: ${JSON.stringify(bill)}`);
    }

    LockTable(tableId, locked)
    {
        if (!this.tableToBillMapping[tableId])
        {
            this._flow_msg.Info("Table not Open.");
            return;
        }
        var bill = this.billsStore[this.tableToBillMapping[tableId]];
        bill.Locked = locked;
        this.SaveBillState();

        if (locked)
        {
            this._flow_msg.Info(`Locked: ${JSON.stringify(bill)}`);
        }
        else
        {
            this._flow_msg.Info(`UnLocked: ${JSON.stringify(bill)}`);
        }
    }

    PrintTable(tableId)
    {
        if (!this.tableToBillMapping[tableId])
        {
            this._flow_msg.Info("Table not Open.");
            return;
        }
        this.PrintBill(this.tableToBillMapping[tableId]);
    }

    PrintTables()
    {
        if (Object.keys(this.tableToBillMapping).length > 0) 
        { 
            this._flow_msg.Info("# Open Tables: "); 
            for(let table in this.tableToBillMapping)
            {
                this._flow_msg.Info(`# Table #${table}, Bill #${this.tableToBillMapping[table]}`);
            }
        } 
        else 
        {  
            this._flow_msg.Info("# No Open Tables."); 
        }

        if (Object.keys(this.billsStore).length > 0) 
        {
            this._flow_msg.Info("# My Bills Store: ");

            for(let bill in this.billsStore)
            {
                this._flow_msg.Info("# " + this.billsStore[bill].toString());
            }
        }

        if (Object.keys(this.assemblyBillDataStore).length > 0) 
        {
            this._flow_msg.Info("# Assembly Bills Data: " + JSON.stringify(this.assemblyBillDataStore));
        }
    }

    PrintBill(billId)
    {
        if (!this.billsStore[billId])
        {
            this._flow_msg.Info("Bill Not Found.");
            return;
        }
        this._flow_msg.Info(`Bill: ${this.billsStore[billId].toString()}`);
    }

    NewBillId()
    {
        return ((Date.now() * 1000) + new Date().getMilliseconds()).toString();
    }

    // endregion


    SaveBillState() 
    {
        localStorage.setItem('tableToBillMapping', JSON.stringify(this.tableToBillMapping));
        localStorage.setItem('billsStore', JSON.stringify(this.billsStore));
        localStorage.setItem('assemblyBillDataStore', JSON.stringify(this.assemblyBillDataStore));
    }

    LoadPersistedState()
    {
        if(localStorage.getItem('pos_id')) 
        {
            this._posId = localStorage.getItem('pos_id');
            document.getElementById('pos_id').value = this._posId;
        } 
        else 
        {
            this._posId = document.getElementById('pos_id').value;
        }

        if(localStorage.getItem('eftpos_address')) 
        {
            this._eftposAddress = localStorage.getItem('eftpos_address');
            document.getElementById('eftpos_address').value = this._eftposAddress;
        } 
        else 
        {
            this._eftposAddress = document.getElementById('eftpos_address').value;
        }

        this._print_merchant_copy = document.getElementById('print_merchant_copy').checked = localStorage.getItem('print_merchant_copy') === 'true' || false;
        this._rcpt_from_eftpos = document.getElementById('rcpt_from_eftpos').checked = localStorage.getItem('rcpt_from_eftpos') === 'true' || false;
        this._sig_flow_from_eftpos = document.getElementById('sig_flow_from_eftpos').checked = localStorage.getItem('sig_flow_from_eftpos') === 'true' || false;

        if(localStorage.getItem('EncKey') && localStorage.getItem('HmacKey')) 
        {
            this._spiSecrets = new Secrets(localStorage.getItem('EncKey'), localStorage.getItem('HmacKey'));
        }

        this.tableToBillMapping     = JSON.parse(localStorage.getItem('tableToBillMapping') || '{}');
        this.assemblyBillDataStore  = JSON.parse(localStorage.getItem('assemblyBillDataStore') || '{}');
        let savedBillData           = JSON.parse(localStorage.getItem('billsStore') || '{}');

        for(let bill in savedBillData)
        {
            this.billsStore[bill] = Object.assign(new Bill(), savedBillData[bill]);
        }
    }
}


class Bill
{
    constructor() 
    {
        this.BillId = null;
        this.TableId = null;
        this.OperatorId = null;
        this.Label = null;
        this.TotalAmount = 0;
        this.OutstandingAmount = 0;
        this.tippedAmount = 0;
        this.SurchargeAmount = 0;
        this.Locked = false;
    }
}
Bill.prototype.toString = function() 
{
    return `${this.BillId} - /
        Table:${this.TableId} 
        Operator Id:${this.OperatorId} 
        Label:${this.Label} 
        Total:$${(this.TotalAmount / 100).toFixed(2)} 
        Outstanding:$${(this.OutstandingAmount / 100).toFixed(2)} 
        Tips:$${(this.tippedAmount / 100).toFixed(2)}
        Surcharge:$${(this.SurchargeAmount / 100).toFixed(2)}  
        Locked:${this.Locked}`;
}

/**
 * Start the POS
 */
document.addEventListener('DOMContentLoaded', () => 
{
    try 
    {
        let log         = console;
        let receipt     = new Logger(document.getElementById('receipt_output'),`\n\n \\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/ \n\n`);
        let flow_msg    = new Logger(document.getElementById('flow_msg'));
        let pos         = new TablePos(log, receipt, flow_msg);
        pos.Start();
    } 
    catch(err) 
    {
        console.error(err);
    }
});

