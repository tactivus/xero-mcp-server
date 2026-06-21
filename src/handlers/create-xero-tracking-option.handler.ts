import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { TrackingOption } from "xero-node";

async function createTrackingOption(
  trackingCategoryId: string,
  name: string,
): Promise<TrackingOption | undefined> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const response = await activeClient.accountingApi.createTrackingOptions(
    activeClient.tenantId,
    trackingCategoryId,
    {
      name: name,
    },
    undefined, // idempotencyKey
    getClientHeaders(),
  );

  const createdTrackingOption = response.body.options?.[0];

  return createdTrackingOption;
}

export async function createXeroTrackingOptions(
  trackingCategoryId: string,
  optionNames: string[],
  client?: MCPXeroClient,
): Promise<XeroClientResponse<TrackingOption[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const createdOptions = await Promise.all(
        optionNames.map(
          async (optionName) =>
            await createTrackingOption(trackingCategoryId, optionName),
        ),
      );

      return {
        result: createdOptions
          .filter(Boolean)
          .map((option) => option as TrackingOption),
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
