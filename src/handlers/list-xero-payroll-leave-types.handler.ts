import {
  MCPXeroClient,
  getActiveXeroClient,
  getActiveXeroTenantId,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { LeaveType } from "../types/payroll-nz-types.js";

/**
 * Internal function to fetch leave types from Xero
 */
async function fetchLeaveTypes(): Promise<LeaveType[] | null> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  const response = await activeClient.payrollNZApi.getLeaveTypes(
    getActiveXeroTenantId(),
    undefined, // page
    undefined, // pageSize
    getClientHeaders(),
  );

  return response.body.leaveTypes ?? null;
}

/**
 * List all leave types from Xero Payroll
 */
export async function listXeroPayrollLeaveTypes(
  client?: MCPXeroClient,
): Promise<XeroClientResponse<LeaveType[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const leaveTypes = await fetchLeaveTypes();

      if (!leaveTypes) {
        return {
          result: [],
          isError: false,
          error: null,
        };
      }

      return {
        result: leaveTypes,
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
