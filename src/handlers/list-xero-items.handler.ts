import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Item } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getItems(page: number): Promise<Item[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const items = await activeClient.accountingApi.getItems(
    getActiveXeroTenantId(),
    undefined, // ifModifiedSince
    undefined, // where
    undefined, // order
    page, // page
    getClientHeaders(),
  );
  return items.body.items ?? [];
}

/**
 * List all items from Xero
 */
export async function listXeroItems(
  page: number = 1,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Item[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const items = await getItems(page);

      return {
        result: items,
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
