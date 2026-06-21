import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { Contact } from "xero-node";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getContacts(
  page?: number,
  searchTerm?: string,
): Promise<Contact[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const contacts = await activeClient.accountingApi.getContacts(
    getActiveXeroTenantId(),
    undefined, // ifModifiedSince
    undefined, // where
    undefined, // order
    undefined, // iDs
    page, // page
    undefined, // includeArchived
    true, // summaryOnly
    searchTerm, // searchTerm
    undefined, // pageSize
    getClientHeaders(),
  );
  return contacts.body.contacts ?? [];
}

/**
 * List all contacts from Xero
 */
export async function listXeroContacts(
  page?: number,
  searchTerm?: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Contact[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const contacts = await getContacts(page, searchTerm);

      return {
        result: contacts,
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
