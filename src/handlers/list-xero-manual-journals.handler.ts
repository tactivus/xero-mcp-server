import { ManualJournal } from "xero-node";
import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getManualJournals(
  page: number,
  manualJournalId?: string,
  modifiedAfter?: string,
): Promise<ManualJournal[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  if (manualJournalId) {
    const response = await activeClient.accountingApi.getManualJournal(
      getActiveXeroTenantId(),
      manualJournalId,
      getClientHeaders(),
    );

    return response.body.manualJournals ?? [];
  }

  const response = await activeClient.accountingApi.getManualJournals(
    getActiveXeroTenantId(),
    modifiedAfter ? new Date(modifiedAfter) : undefined,
    undefined,
    "UpdatedDateUTC DESC",
    page,
    10, // pageSize
    getClientHeaders(),
  );

  return response.body.manualJournals ?? [];
}

/**
 * List all manual journals from Xero.
 */
export async function listXeroManualJournals(
  page: number = 1,
  manualJournalId?: string,
  modifiedAfter?: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<ManualJournal[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const manualJournals = await getManualJournals(
        page,
        manualJournalId,
        modifiedAfter,
      );

      return {
        result: manualJournals,
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
