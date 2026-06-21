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

async function createTimesheet(
  timesheet: Timesheet,
): Promise<Timesheet | null> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the createTimesheet endpoint from the PayrollNZApi
  const createdTimesheet = await activeClient.payrollNZApi.createTimesheet(
    getActiveXeroTenantId(),
    timesheet,
  );

  return createdTimesheet.body.timesheet ?? null;
}

/**
 * Create a payroll timesheet in Xero
 */
export async function createXeroPayrollTimesheet(
  timesheet: Timesheet,
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Timesheet | null>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const newTimesheet = await createTimesheet(timesheet);

      return {
        result: newTimesheet,
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
