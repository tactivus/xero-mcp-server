import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { BankTransaction } from "xero-node";

interface BankTransactionLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode: string;
  taxType: string;
}

type BankTransactionType = "RECEIVE" | "SPEND";

async function getBankTransaction(
  bankTransactionId: string,
): Promise<BankTransaction | undefined> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const response = await activeClient.accountingApi.getBankTransaction(
    activeClient.tenantId, // xeroTenantId
    bankTransactionId, // bankTransactionID
    undefined, // unitdp
    getClientHeaders(), // options
  );

  return response.body.bankTransactions?.[0];
}

async function updateBankTransaction(
  bankTransactionId: string,
  existingBankTransaction: BankTransaction,
  type?: BankTransactionType,
  contactId?: string,
  lineItems?: BankTransactionLineItem[],
  reference?: string,
  date?: string,
): Promise<BankTransaction | undefined> {
  const activeClient = getActiveXeroClient();
  const bankTransaction: BankTransaction = {
    ...existingBankTransaction,
    bankTransactionID: bankTransactionId,
    type: type ? BankTransaction.TypeEnum[type] : existingBankTransaction.type,
    contact: contactId
      ? { contactID: contactId }
      : existingBankTransaction.contact,
    lineItems: lineItems ? lineItems : existingBankTransaction.lineItems,
    reference: reference ? reference : existingBankTransaction.reference,
    date: date ? date : existingBankTransaction.date,
  };

  const response = await activeClient.accountingApi.updateBankTransaction(
    activeClient.tenantId, // xeroTenantId
    bankTransactionId, // bankTransactionID
    { bankTransactions: [bankTransaction] }, // bankTransactions
    undefined, // unitdp
    undefined, // idempotencyKey
    getClientHeaders(), // options
  );

  return response.body.bankTransactions?.[0];
}

export async function updateXeroBankTransaction(
  bankTransactionId: string,
  type?: BankTransactionType,
  contactId?: string,
  lineItems?: BankTransactionLineItem[],
  reference?: string,
  date?: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<BankTransaction>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const existingBankTransaction =
        await getBankTransaction(bankTransactionId);

      if (!existingBankTransaction) {
        throw new Error(`Could not find bank transaction`);
      }

      const updatedBankTransaction = await updateBankTransaction(
        bankTransactionId,
        existingBankTransaction,
        type,
        contactId,
        lineItems,
        reference,
        date,
      );

      if (!updatedBankTransaction) {
        throw new Error(`Failed to update bank transaction`);
      }

      return {
        result: updatedBankTransaction,
        isError: false,
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        isError: true,
        error: formatError(error),
      };
    }
  });
}
