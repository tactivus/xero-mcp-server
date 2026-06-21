import { TrackingCategory } from "xero-node";
import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { XeroClientResponse } from "../types/tool-response.js";

type TrackingCategoryStatus = "ACTIVE" | "ARCHIVED";

async function getTrackingCategory(
  trackingCategoryId: string,
): Promise<TrackingCategory | undefined> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const response = await activeClient.accountingApi.getTrackingCategory(
    activeClient.tenantId,
    trackingCategoryId,
    getClientHeaders(),
  );

  return response.body.trackingCategories?.[0];
}

async function updateTrackingCategory(
  trackingCategoryId: string,
  existingTrackingCategory: TrackingCategory,
  name?: string,
  status?: TrackingCategoryStatus,
): Promise<TrackingCategory | undefined> {
  const activeClient = getActiveXeroClient();
  const trackingCategory: TrackingCategory = {
    trackingCategoryID: trackingCategoryId,
    name: name ? name : existingTrackingCategory.name,
    status: status
      ? TrackingCategory.StatusEnum[status]
      : existingTrackingCategory.status,
  };

  await activeClient.accountingApi.updateTrackingCategory(
    activeClient.tenantId,
    trackingCategoryId,
    trackingCategory,
    undefined, // idempotencyKey
    getClientHeaders(),
  );

  return trackingCategory;
}

export async function updateXeroTrackingCategory(
  trackingCategoryId: string,
  name?: string,
  status?: TrackingCategoryStatus,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<TrackingCategory>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const existingTrackingCategory =
        await getTrackingCategory(trackingCategoryId);

      if (!existingTrackingCategory) {
        throw new Error("Could not find tracking category.");
      }

      const updatedTrackingCategory = await updateTrackingCategory(
        trackingCategoryId,
        existingTrackingCategory,
        name,
        status,
      );

      if (!updatedTrackingCategory) {
        throw new Error("Failed to update tracking category.");
      }

      return {
        result: updatedTrackingCategory,
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
