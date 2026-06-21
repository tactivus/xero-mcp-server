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

async function updateTimesheetLine(
  timesheetID: string,
  timesheetLineID: string,
  timesheetLine: TimesheetLine,
): Promise<TimesheetLine | null> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the updateTimesheetLine endpoint from the PayrollNZApi
  const updatedLine = await activeClient.payrollNZApi.updateTimesheetLine(
    getActiveXeroTenantId(),
    timesheetID,
    timesheetLineID,
    timesheetLine,
  );

  return updatedLine.body.timesheetLine ?? null;
}

/**
 * Update an existing timesheet line in a payroll timesheet in Xero
 */
export async function updateXeroPayrollTimesheetUpdateLine(
  timesheetID: string,
  timesheetLineID: string,
  timesheetLine: TimesheetLine,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<TimesheetLine | null>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const updatedLine = await updateTimesheetLine(
        timesheetID,
        timesheetLineID,
        timesheetLine,
      );

      return {
        result: updatedLine,
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
