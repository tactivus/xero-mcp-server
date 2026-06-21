import {
  MCPXeroClient,
  getActiveXeroClient,
  clientContext,
  resolveXeroClient,
} from "../clients/xero-client.js";
import { XeroClientResponse } from "../types/tool-response.js";
import { formatError } from "../helpers/format-error.js";
import { getClientHeaders } from "../helpers/get-client-headers.js";
import { Employee } from "../types/payroll-nz-types.js";

async function getPayrollEmployees(): Promise<Employee[]> {
  const activeClient = getActiveXeroClient();
  await activeClient.authenticate();

  // Call the Employees endpoint from the PayrollNZApi
  const employees = await activeClient.payrollNZApi.getEmployees(
    activeClient.tenantId,
    undefined, // page
    undefined, // pageSize
    getClientHeaders(),
  );

  return employees.body.employees ?? [];
}

/**
 * List all payroll employees from Xero
 */
export async function listXeroPayrollEmployees(
  client?: MCPXeroClient,
): Promise<XeroClientResponse<Employee[]>> {
  return clientContext.run(resolveXeroClient(client), async () => {
    try {
      const employees = await getPayrollEmployees();

      return {
        result: employees,
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
