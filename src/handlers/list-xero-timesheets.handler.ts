import { Timesheet } from "xero-node/dist/gen/model/payroll-nz/timesheet.js";

import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";

async function getTimesheets(): Promise<Timesheet[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the Timesheets endpoint from the PayrollNZApi
  const timesheets = await activeClient.payrollNZApi.getTimesheets(
    activeClient.tenantId,
    undefined, // page
    undefined, // filter
  );

  return timesheets.body.timesheets ?? [];
}

/**
 * List all payroll timesheets from Xero
 */
export async function listXeroPayrollTimesheets(
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Timesheet[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const timesheets = await getTimesheets();

      return {
        result: timesheets,
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
