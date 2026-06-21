import { TimesheetLine } from "xero-node/dist/gen/model/payroll-nz/timesheetLine.js";

import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";

async function addTimesheetLine(
  timesheetID: string,
  timesheetLine: TimesheetLine,
): Promise<TimesheetLine | null> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the createTimesheetLine endpoint from the PayrollNZApi
  const createdLine = await activeClient.payrollNZApi.createTimesheetLine(
    getActiveXeroTenantId(),
    timesheetID,
    timesheetLine,
  );

  return createdLine.body.timesheetLine ?? null;
}

/**
 * Add a timesheet line to an existing payroll timesheet in Xero
 */
export async function updateXeroPayrollTimesheetAddLine(
  timesheetID: string,
  timesheetLine: TimesheetLine,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<TimesheetLine | null>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const newLine = await addTimesheetLine(timesheetID, timesheetLine);

      return {
        result: newLine,
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
