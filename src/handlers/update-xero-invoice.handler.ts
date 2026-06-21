import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Invoice, LineItemTracking } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  accountCode: string;
  taxType: string;
  itemCode?: string;
  tracking?: LineItemTracking[];
}

async function getInvoice(invoiceId: string): Promise<Invoice | undefined> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // First, get the current invoice to check its status
  const response = await activeClient.accountingApi.getInvoice(
    getActiveXeroTenantId(),
    invoiceId, // invoiceId
    undefined, // unitdp
    getClientHeaders(), // options
  );

  return response.body.invoices?.[0];
}

async function updateInvoice(
  invoiceId: string,
  lineItems?: InvoiceLineItem[],
  reference?: string,
  dueDate?: string,
  date?: string,
  contactId?: string,
): Promise<Invoice | undefined> {
  const activeClient = getActiveXeroClient();
  const invoice: Invoice = {
    lineItems: lineItems,
    reference: reference,
    dueDate: dueDate,
    date: date,
    contact: contactId ? { contactID: contactId } : undefined,
  };

  const response = await activeClient.accountingApi.updateInvoice(
    getActiveXeroTenantId(),
    invoiceId, // invoiceId
    {
      invoices: [invoice],
    }, // invoices
    undefined, // unitdp
    undefined, // idempotencyKey
    getClientHeaders(), // options
  );

  return response.body.invoices?.[0];
}

/**
 * Update an existing invoice in Xero
 */
export async function updateXeroInvoice(
  invoiceId: string,
  lineItems?: InvoiceLineItem[],
  reference?: string,
  dueDate?: string,
  date?: string,
  contactId?: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Invoice>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const existingInvoice = await getInvoice(invoiceId);

      const invoiceStatus = existingInvoice?.status;

      // Only allow updates to DRAFT invoices
      if (invoiceStatus !== Invoice.StatusEnum.DRAFT) {
        return {
          result: null,
          isError: true,
          error: `Cannot update invoice because it is not a draft. Current status: ${invoiceStatus}`,
        };
      }

      const updatedInvoice = await updateInvoice(
        invoiceId,
        lineItems,
        reference,
        dueDate,
        date,
        contactId,
      );

      if (!updatedInvoice) {
        throw new Error("Invoice update failed.");
      }

      return {
        result: updatedInvoice,
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
