import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { Organisation } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getOrganisationDetails(): Promise<Organisation> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const response = await activeClient.accountingApi.getOrganisations(
    activeClient.tenantId,
    getClientHeaders(),
  );

  const organisation = response.body.organisations?.[0];

  if (!organisation) {
    throw new Error("Failed to retrieve organisation details");
  }

  return organisation;
}

/**
 * List organisation details from Xero
 */
export async function listXeroOrganisationDetails(
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Organisation>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const organisation = await getOrganisationDetails();

      return {
        result: organisation,
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
