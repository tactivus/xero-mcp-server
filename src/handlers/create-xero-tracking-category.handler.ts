import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { TrackingCategory } from "xero-node";

async function createTrackingCategory(
  name: string,
): Promise<TrackingCategory | undefined> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const trackingCategory: TrackingCategory = {
    name: name,
  };

  const response = await activeClient.accountingApi.createTrackingCategory(
    activeClient.tenantId, // xeroTenantId
    trackingCategory,
    undefined, // idempotencyKey
    getClientHeaders(), // options
  );

  const createdTrackingCategory = response.body.trackingCategories?.[0];

  return createdTrackingCategory;
}

export async function createXeroTrackingCategory(
  name: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<TrackingCategory>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const createdTrackingCategory = await createTrackingCategory(name);

      if (!createdTrackingCategory) {
        throw new Error("Tracking Category creation failed.");
      }

      return {
        result: createdTrackingCategory,
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
