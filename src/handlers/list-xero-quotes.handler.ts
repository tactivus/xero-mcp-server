import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Quote } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getQuotes(
  contactId: string | undefined,
  page: number,
  quoteNumber: string | undefined,
): Promise<Quote[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const quotes = await activeClient.accountingApi.getQuotes(
    getActiveXeroTenantId(),
    undefined, // ifModifiedSince
    undefined, // dateFrom
    undefined, // dateTo
    undefined, // expiryDateFrom
    undefined, // expiryDateTo
    contactId, // contactID
    undefined, // status
    page,
    undefined, // order
    quoteNumber, // quoteNumber
    getClientHeaders(),
  );
  return quotes.body.quotes ?? [];
}

/**
 * List all quotes from Xero
 */
export async function listXeroQuotes(
  page: number = 1,
  contactId?: string,
  quoteNumber?: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Quote[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const quotes = await getQuotes(contactId, page, quoteNumber);

      return {
        result: quotes,
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
