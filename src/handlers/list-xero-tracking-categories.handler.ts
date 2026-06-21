import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { TrackingCategory } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";

async function getTrackingCategories(
  includeArchived?: boolean,
): Promise<TrackingCategory[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const response = await activeClient.accountingApi.getTrackingCategories(
    getActiveXeroTenantId(), // xeroTenantId
    undefined, // where
    undefined, // order
    includeArchived, // includeArchived
    getClientHeaders(),
  );

  return response.body.trackingCategories ?? [];
}

export async function listXeroTrackingCategories(
  includeArchived?: boolean,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<TrackingCategory[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const trackingCategories = await getTrackingCategories(includeArchived);

      return {
        result: trackingCategories,
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
