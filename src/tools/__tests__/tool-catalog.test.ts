/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { MCPXeroClient } from "../../clients/xero-client.js";
import { runWithXeroForkContext } from "../../runtime/xero-fork-context.js";
import {
  bindXeroToolDefinition,
  createXeroToolDefinitions,
  getXeroToolDefinitions,
  XeroToolFactories,
} from "../tool-catalog.js";
import { ToolFactory } from "../tool-factory.js";

class FakeXeroClient extends MCPXeroClient {
  constructor() {
    super();
  }

  async authenticate(): Promise<void> {
    return;
  }
}

describe("Xero tool catalog", () => {
  it("exports all tool definitions with hosted metadata", () => {
    const definitions = getXeroToolDefinitions();

    expect(definitions).toHaveLength(XeroToolFactories.length);
    expect(new Set(definitions.map((tool) => tool.name)).size).toBe(
      definitions.length,
    );

    const listAccounts = definitions.find(
      (tool) => tool.name === "list-accounts",
    );
    expect(listAccounts).toMatchObject({
      upstreamName: "list-accounts",
      hostedName: "xero_list_accounts",
      operationType: "read",
      category: "list",
      destructive: false,
      irreversible: false,
      highRisk: false,
    });

    const approveTimesheet = definitions.find(
      (tool) => tool.name === "approve-timesheet",
    );
    expect(approveTimesheet).toMatchObject({
      hostedName: "xero_approve_timesheet",
      operationType: "write",
      category: "update",
      destructive: true,
      irreversible: true,
      highRisk: true,
    });

    const deleteTimesheet = definitions.find(
      (tool) => tool.name === "delete-timesheet",
    );
    expect(deleteTimesheet).toMatchObject({
      hostedName: "xero_delete_timesheet",
      operationType: "destructive",
      category: "delete",
      destructive: true,
      irreversible: true,
      highRisk: true,
    });
  });

  it("registers the stdio server from exported definitions", () => {
    const client = new FakeXeroClient();
    const registered: string[] = [];
    const server = {
      tool: vi.fn((name: string) => {
        registered.push(name);
      }),
    } as unknown as McpServer;

    ToolFactory(server, client);

    expect(registered).toEqual(
      getXeroToolDefinitions().map((tool) => tool.name),
    );
  });

  it("binds exported handlers to an injected client context", async () => {
    const client = new FakeXeroClient();
    Object.defineProperty(client, "accountingApi", {
      value: {
        getAccounts: vi.fn().mockResolvedValue({
          body: {
            accounts: [
              {
                accountID: "account-1",
                code: "200",
                name: "Sales",
                status: "ACTIVE",
                type: "REVENUE",
              },
            ],
          },
        }),
      },
    });

    const tool = createXeroToolDefinitions({
      client,
      tenantId: "tenant-1",
    }).find((tool) => tool.name === "list-accounts");

    const result = await (tool!.handler as any)({}, {});

    expect(client.tenantId).toBe("");
    expect(client.accountingApi.getAccounts).toHaveBeenCalledWith(
      "tenant-1",
      undefined,
      undefined,
      undefined,
      expect.any(Object),
    );
    expect(result.content[0].text).toBe("Found 1 accounts:");
  });

  it("keeps concurrent tenant ids isolated for a shared client instance", async () => {
    const client = new FakeXeroClient();
    Object.defineProperty(client, "accountingApi", {
      value: {
        getAccounts: vi.fn(async (tenantId: string) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return {
            body: {
              accounts: [
                {
                  accountID: `account-${tenantId}`,
                  code: tenantId,
                  name: tenantId,
                },
              ],
            },
          };
        }),
      },
    });

    const toolA = createXeroToolDefinitions({
      client,
      tenantId: "tenant-a",
    }).find((tool) => tool.name === "list-accounts");
    const toolB = createXeroToolDefinitions({
      client,
      tenantId: "tenant-b",
    }).find((tool) => tool.name === "list-accounts");

    await Promise.all([
      (toolA!.handler as any)({}, {}),
      (toolB!.handler as any)({}, {}),
    ]);

    expect(client.tenantId).toBe("");
    expect(
      (client.accountingApi.getAccounts as any).mock.calls
        .map((call: unknown[]) => call.at(0))
        .sort(),
    ).toEqual(["tenant-a", "tenant-b"]);
  });

  it("uses tenant context for per-tenant organisation short-code lookup", async () => {
    const client = new FakeXeroClient();
    Object.defineProperty(client, "accountingApi", {
      value: {
        getOrganisations: vi.fn(async (tenantId: string) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return {
            body: {
              organisations: [{ shortCode: `short-${tenantId}` }],
            },
          };
        }),
      },
    });

    const shortCodes = await Promise.all([
      runWithXeroForkContext({ client, tenantId: "tenant-a" }, () =>
        client.getShortCode(),
      ),
      runWithXeroForkContext({ client, tenantId: "tenant-b" }, () =>
        client.getShortCode(),
      ),
    ]);

    expect(shortCodes.sort()).toEqual(["short-tenant-a", "short-tenant-b"]);
    expect(
      (client.accountingApi.getOrganisations as any).mock.calls
        .map((call: unknown[]) => call.at(0))
        .sort(),
    ).toEqual(["tenant-a", "tenant-b"]);
  });

  it("normalizes tool error text through the hosted error hook", async () => {
    const client = new FakeXeroClient();
    Object.defineProperty(client, "accountingApi", {
      value: {
        getAccounts: vi.fn().mockRejectedValue(new Error("raw secret")),
      },
    });

    const tool = createXeroToolDefinitions({
      client,
      tenantId: "tenant-1",
      onToolError: () => "sanitized error",
    }).find((tool) => tool.name === "list-accounts");

    const result = await (tool!.handler as any)({}, {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("sanitized error");
  });

  it("normalizes all current Xero tool error prefixes", async () => {
    const client = new FakeXeroClient();
    const tool = bindXeroToolDefinition(
      {
        name: "list-organisation-details",
        upstreamName: "list-organisation-details",
        hostedName: "xero_list_organisation_details",
        description: "test",
        schema: {},
        operationType: "read",
        category: "list",
        destructive: false,
        irreversible: false,
        highRisk: false,
        handler: async () => ({
          content: [
            {
              type: "text" as const,
              text: "Error fetching organisation details: raw secret",
            },
          ],
        }),
      },
      {
        client,
        onToolError: () => "sanitized error",
      },
    );

    const result = await (tool.handler as any)({}, {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("sanitized error");
  });

  it("does not normalize non-error success text that starts with Error", async () => {
    const client = new FakeXeroClient();
    const tool = bindXeroToolDefinition(
      {
        name: "list-accounts",
        upstreamName: "list-accounts",
        hostedName: "xero_list_accounts",
        description: "test",
        schema: {},
        operationType: "read",
        category: "list",
        destructive: false,
        irreversible: false,
        highRisk: false,
        handler: async () => ({
          content: [{ type: "text" as const, text: "Error budget remaining" }],
        }),
      },
      {
        client,
        onToolError: () => "should not be used",
      },
    );

    const result = await (tool.handler as any)({}, {});

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe("Error budget remaining");
  });

  it("keeps original error text when the hosted error hook returns empty text", async () => {
    const client = new FakeXeroClient();
    Object.defineProperty(client, "accountingApi", {
      value: {
        getAccounts: vi.fn().mockRejectedValue(new Error("raw secret")),
      },
    });

    const tool = createXeroToolDefinitions({
      client,
      tenantId: "tenant-1",
      onToolError: () => "",
    }).find((tool) => tool.name === "list-accounts");

    const result = await (tool!.handler as any)({}, {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error listing accounts: raw secret");
  });

  it("keeps original error text when the hosted error hook throws", async () => {
    const client = new FakeXeroClient();
    Object.defineProperty(client, "accountingApi", {
      value: {
        getAccounts: vi.fn().mockRejectedValue(new Error("raw secret")),
      },
    });

    const tool = createXeroToolDefinitions({
      client,
      tenantId: "tenant-1",
      onToolError: () => {
        throw new Error("hook failed");
      },
    }).find((tool) => tool.name === "list-accounts");

    const result = await (tool!.handler as any)({}, {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error listing accounts: raw secret");
  });
});
