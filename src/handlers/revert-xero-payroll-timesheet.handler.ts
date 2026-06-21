import { Timesheet } from "xero-node/dist/gen/model/payroll-nz/timesheet.js";

import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";

async function revertTimesheet(timesheetID: string): Promise<Timesheet | null> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the revertTimesheet endpoint from the PayrollNZApi
  const revertedTimesheet = await activeClient.payrollNZApi.revertTimesheet(
    getActiveXeroTenantId(),
    timesheetID,
  );

  return revertedTimesheet.body.timesheet ?? null;
}

/**
 * Revert a payroll timesheet to draft in Xero
 */
export async function revertXeroPayrollTimesheet(
  timesheetID: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Timesheet | null>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const revertedTimesheet = await revertTimesheet(timesheetID);

      return {
        result: revertedTimesheet,
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
