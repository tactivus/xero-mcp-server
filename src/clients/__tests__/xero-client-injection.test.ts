/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import {
  getDefaultXeroClient,
  resetDefaultXeroClient,
  MCPXeroClient,
  clientContext,
  getActiveXeroClient,
  resolveXeroClient,
} from "../xero-client.js";
import { createXeroContact } from "../../handlers/create-xero-contact.handler.js";
import { listXeroProfitAndLoss } from "../../handlers/list-xero-profit-and-loss.handler.js";
import { updateXeroTrackingCategory } from "../../handlers/update-xero-tracking-category.handler.js";

describe("Xero Client Injection and Context Isolation", () => {
  it("importing a handler/client module without env does not throw", async () => {
    const oldId = process.env.XERO_CLIENT_ID;
    const oldSecret = process.env.XERO_CLIENT_SECRET;
    const oldToken = process.env.XERO_CLIENT_BEARER_TOKEN;

    delete process.env.XERO_CLIENT_ID;
    delete process.env.XERO_CLIENT_SECRET;
    delete process.env.XERO_CLIENT_BEARER_TOKEN;

    try {
      resetDefaultXeroClient();

      const { createXeroClient: importedCreate } =
        await import("../xero-client.js");
      const { createXeroContact: importedHandler } =
        await import("../../handlers/create-xero-contact.handler.js");

      expect(importedCreate).toBeDefined();
      expect(importedHandler).toBeDefined();
    } finally {
      if (oldId !== undefined) process.env.XERO_CLIENT_ID = oldId;
      if (oldSecret !== undefined) process.env.XERO_CLIENT_SECRET = oldSecret;
      if (oldToken !== undefined)
        process.env.XERO_CLIENT_BEARER_TOKEN = oldToken;
    }
  });

  it("two injected fake clients can be used independently without shared tenant/client state", async () => {
    class FakeXeroClient extends MCPXeroClient {
      constructor(tenantId: string) {
        super();
        this.tenantId = tenantId;
      }

      async authenticate(): Promise<void> {
        return;
      }
    }

    const client1 = new FakeXeroClient("tenant-1");
    const client2 = new FakeXeroClient("tenant-2");

    expect(client1.tenantId).toBe("tenant-1");
    expect(client2.tenantId).toBe("tenant-2");

    const mockContact1 = { contactID: "contact-1", name: "Client 1 Contact" };
    const mockContact2 = { contactID: "contact-2", name: "Client 2 Contact" };

    Object.defineProperty(client1, "accountingApi", {
      value: {
        createContacts: vi.fn().mockResolvedValue({
          body: { contacts: [mockContact1] },
        }),
      },
    });

    Object.defineProperty(client2, "accountingApi", {
      value: {
        createContacts: vi.fn().mockResolvedValue({
          body: { contacts: [mockContact2] },
        }),
      },
    });

    const result1 = await createXeroContact(
      "Client 1 Contact",
      undefined,
      undefined,
      client1,
    );
    const result2 = await createXeroContact(
      "Client 2 Contact",
      undefined,
      undefined,
      client2,
    );

    expect(result1.result?.contactID).toBe("contact-1");
    expect(result2.result?.contactID).toBe("contact-2");

    expect(client1.accountingApi.createContacts).toHaveBeenCalledTimes(1);
    const args1 = (client1.accountingApi.createContacts as any).mock.calls[0];
    expect(args1[0]).toBe("tenant-1");
    expect(args1[1].contacts[0].name).toBe("Client 1 Contact");

    expect(client2.accountingApi.createContacts).toHaveBeenCalledTimes(1);
    const args2 = (client2.accountingApi.createContacts as any).mock.calls[0];
    expect(args2[0]).toBe("tenant-2");
    expect(args2[1].contacts[0].name).toBe("Client 2 Contact");
  });

  it("fails loudly when library code resolves a client without an active context", () => {
    expect(() => getActiveXeroClient()).toThrow(
      "No active Xero client context",
    );
    expect(() => resolveXeroClient()).toThrow("No active Xero client context");
  });

  it("resolves the active client from explicit async context", async () => {
    class FakeXeroClient extends MCPXeroClient {
      constructor() {
        super();
      }

      async authenticate(): Promise<void> {
        return;
      }
    }
    const client = new FakeXeroClient();
    client.tenantId = "tenant-context";

    await expect(
      clientContext.run(client, async () => getActiveXeroClient().tenantId),
    ).resolves.toBe("tenant-context");
  });

  it("uses ambient tool context when handlers are called without an explicit client", async () => {
    class FakeXeroClient extends MCPXeroClient {
      constructor() {
        super();
        this.tenantId = "tenant-ambient";
      }

      async authenticate(): Promise<void> {
        return;
      }
    }
    const client = new FakeXeroClient();

    Object.defineProperty(client, "accountingApi", {
      value: {
        createContacts: vi.fn().mockResolvedValue({
          body: {
            contacts: [{ contactID: "contact-ambient", name: "Ambient" }],
          },
        }),
      },
    });

    const result = await clientContext.run(client, async () =>
      createXeroContact("Ambient"),
    );

    expect(result.result?.contactID).toBe("contact-ambient");
    expect(client.accountingApi.createContacts).toHaveBeenCalledTimes(1);
    const args = (client.accountingApi.createContacts as any).mock.calls[0];
    expect(args[0]).toBe("tenant-ambient");
  });

  it("forwards profit and loss layout flags to the correct Xero API parameters", async () => {
    class FakeXeroClient extends MCPXeroClient {
      constructor() {
        super();
        this.tenantId = "tenant-profit-and-loss";
      }

      async authenticate(): Promise<void> {
        return;
      }
    }
    const client = new FakeXeroClient();

    Object.defineProperty(client, "accountingApi", {
      value: {
        getReportProfitAndLoss: vi.fn().mockResolvedValue({
          body: {
            reports: [{ reportName: "Profit and Loss", rows: [] }],
          },
        }),
      },
    });

    const response = await listXeroProfitAndLoss(
      "2024-01-01",
      "2024-01-31",
      3,
      "MONTH",
      true,
      false,
      client,
    );

    expect(response.isError).toBe(false);
    const args = (client.accountingApi.getReportProfitAndLoss as any).mock
      .calls[0];
    expect(args[9]).toBe(true);
    expect(args[10]).toBe(false);
  });

  it("returns the updated tracking category payload", async () => {
    class FakeXeroClient extends MCPXeroClient {
      constructor() {
        super();
        this.tenantId = "tenant-tracking";
      }

      async authenticate(): Promise<void> {
        return;
      }
    }
    const client = new FakeXeroClient();

    Object.defineProperty(client, "accountingApi", {
      value: {
        getTrackingCategory: vi.fn().mockResolvedValue({
          body: {
            trackingCategories: [
              {
                trackingCategoryID: "tracking-1",
                name: "Old name",
                status: "ACTIVE",
              },
            ],
          },
        }),
        updateTrackingCategory: vi.fn().mockResolvedValue({}),
      },
    });

    const response = await updateXeroTrackingCategory(
      "tracking-1",
      "New name",
      "ARCHIVED",
      client,
    );

    expect(response.result?.name).toBe("New name");
    expect(response.result?.status).toBe("ARCHIVED");
  });

  it("default CLI/env context is explicit", () => {
    const oldId = process.env.XERO_CLIENT_ID;
    const oldSecret = process.env.XERO_CLIENT_SECRET;
    const oldToken = process.env.XERO_CLIENT_BEARER_TOKEN;

    delete process.env.XERO_CLIENT_ID;
    delete process.env.XERO_CLIENT_SECRET;
    delete process.env.XERO_CLIENT_BEARER_TOKEN;

    resetDefaultXeroClient();

    try {
      expect(() => getDefaultXeroClient()).toThrow(
        "Environment Variables not set",
      );
    } finally {
      if (oldId !== undefined) process.env.XERO_CLIENT_ID = oldId;
      if (oldSecret !== undefined) process.env.XERO_CLIENT_SECRET = oldSecret;
      if (oldToken !== undefined)
        process.env.XERO_CLIENT_BEARER_TOKEN = oldToken;
      resetDefaultXeroClient();
    }
  });
});
