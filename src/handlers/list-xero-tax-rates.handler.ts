import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { TaxRate } from "xero-node";
import { getClientHeaders } from "../helpers/get-client-headers.js";

async function getTaxRates(): Promise<TaxRate[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const taxRates = await activeClient.accountingApi.getTaxRates(
    getActiveXeroTenantId(),
    undefined, // where
    undefined, // order
    getClientHeaders(),
  );
  return taxRates.body.taxRates ?? [];
}

/**
 * List all tax rates from Xero
 */
export async function listXeroTaxRates(
  client?: MCPXeroClient,
): Promise<XeroClientResponse<TaxRate[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const taxRates = await getTaxRates();

      return {
        result: taxRates,
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
