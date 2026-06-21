import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { ContactGroup } from "xero-node";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getContactGroups(
  contactGroupId?: string,
): Promise<ContactGroup[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  if (contactGroupId) {
    const response = await activeClient.accountingApi.getContactGroup(
      activeClient.tenantId,
      contactGroupId,
      getClientHeaders(),
    );
    return response.body.contactGroups ?? [];
  }

  const response = await activeClient.accountingApi.getContactGroups(
    activeClient.tenantId,
    undefined, // where
    undefined, // order
    getClientHeaders(),
  );
  return response.body.contactGroups ?? [];
}

/**
 * List all contact groups from Xero. If a contactGroupId is provided, it will return only that contact group.
 */
export async function listXeroContactGroups(
  contactGroupId?: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<ContactGroup[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const contactGroups = await getContactGroups(contactGroupId);

      return {
        result: contactGroups,
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
