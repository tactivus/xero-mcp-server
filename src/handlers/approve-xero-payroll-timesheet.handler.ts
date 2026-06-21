import { Timesheet } from "xero-node/dist/gen/model/payroll-nz/timesheet.js";

import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";

async function approveTimesheet(
  timesheetID: string,
): Promise<Timesheet | null> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the approveTimesheet endpoint from the PayrollNZApi
  const approvedTimesheet = await activeClient.payrollNZApi.approveTimesheet(
    activeClient.tenantId,
    timesheetID,
  );

  return approvedTimesheet.body.timesheet ?? null;
}

/**
 * Approve a payroll timesheet in Xero
 */
export async function approveXeroPayrollTimesheet(
  timesheetID: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Timesheet | null>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const approvedTimesheet = await approveTimesheet(timesheetID);

      return {
        result: approvedTimesheet,
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
