import { Timesheet } from "xero-node/dist/gen/model/payroll-nz/timesheet.js";

import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { formatError } from "../helpers/format-error.js";
import { XeroClientResponse } from "../types/tool-response.js";

async function getTimesheet(timesheetID: string): Promise<Timesheet | null> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the Timesheet endpoint from the PayrollNZApi
  const timesheet = await activeClient.payrollNZApi.getTimesheet(
    activeClient.tenantId,
    timesheetID,
  );

  return timesheet.body.timesheet ?? null;
}

/**
 * Get a single payroll timesheet from Xero
 */
export async function getXeroPayrollTimesheet(
  timesheetID: string,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Timesheet | null>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const timesheet = await getTimesheet(timesheetID);

      return {
        result: timesheet,
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
