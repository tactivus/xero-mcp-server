import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";

async function deleteTimesheet(timesheetID: string): Promise<boolean> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the deleteTimesheet endpoint from the PayrollNZApi
  await activeClient.payrollNZApi.deleteTimesheet(
    getActiveXeroTenantId(),
    timesheetID,
  );

  return true;
}

/**
 * Delete an existing payroll timesheet in Xero
 */
export async function deleteXeroPayrollTimesheet(
  timesheetID: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<boolean>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      await deleteTimesheet(timesheetID);

      return {
        result: true,
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
