import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import { AsyncLocalStorage } from "async_hooks";
import {
  IXeroClientConfig,
  Organisation,
  TokenSet,
  XeroClient,
} from "xero-node";

import { ensureError } from "../helpers/ensure-error.js";

export const clientContext = new AsyncLocalStorage<MCPXeroClient>();
export const tenantContext = new AsyncLocalStorage<string>();

export function getActiveXeroClient(): MCPXeroClient {
  const client = clientContext.getStore();
  if (!client) {
    throw new Error(
      "No active Xero client context. Pass a client or run inside clientContext.run().",
    );
  }
  return client;
}

export function resolveXeroClient(client?: MCPXeroClient): MCPXeroClient {
  return client ?? getActiveXeroClient();
}

export function getActiveXeroTenantId(): string {
  return tenantContext.getStore() ?? getActiveXeroClient().tenantId;
}

export abstract class MCPXeroClient extends XeroClient {
  public tenantId: string;
  private shortCodesByTenantId: Map<string, string>;

  protected constructor(config?: IXeroClientConfig) {
    super(config);
    this.tenantId = "";
    this.shortCodesByTenantId = new Map();
  }

  public abstract authenticate(): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override async updateTenants(fullOrgDetails?: boolean): Promise<any[]> {
    await super.updateTenants(fullOrgDetails);
    if (this.tenants && this.tenants.length > 0) {
      this.tenantId = this.tenants[0].tenantId;
    }
    return this.tenants;
  }

  private async getOrganisation(): Promise<Organisation> {
    await this.authenticate();

    const tenantId = tenantContext.getStore() ?? this.tenantId;
    const organisationResponse = await this.accountingApi.getOrganisations(
      tenantId || "",
    );

    const organisation = organisationResponse.body.organisations?.[0];

    if (!organisation) {
      throw new Error("Failed to retrieve organisation");
    }

    return organisation;
  }

  public async getShortCode(): Promise<string | undefined> {
    const tenantId = tenantContext.getStore() ?? this.tenantId;
    const cachedShortCode = this.shortCodesByTenantId.get(tenantId);

    if (cachedShortCode === undefined) {
      try {
        const organisation = await this.getOrganisation();
        this.shortCodesByTenantId.set(tenantId, organisation.shortCode ?? "");
      } catch (error: unknown) {
        const err = ensureError(error);

        throw new Error(
          `Failed to get Organisation short code: ${err.message}`,
        );
      }
    }
    return this.shortCodesByTenantId.get(tenantId);
  }
}

export class CustomConnectionsXeroClient extends MCPXeroClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes?: string;

  // Legacy scopes (deprecated but still supported for existing apps)
  private readonly XERO_DEFAULT_AUTH_SCOPES_V1 = [
    "accounting.transactions",
    "accounting.contacts",
    "accounting.settings",
    "accounting.reports.read",
    "payroll.settings",
    "payroll.employees",
    "payroll.timesheets",
  ].join(" ");

  // Granular scopes (required for new apps)
  private readonly XERO_DEFAULT_AUTH_SCOPES_V2 = [
    "accounting.invoices",
    "accounting.payments",
    "accounting.banktransactions",
    "accounting.manualjournals",
    "accounting.reports.aged.read",
    "accounting.reports.balancesheet.read",
    "accounting.reports.profitandloss.read",
    "accounting.reports.trialbalance.read",
    "accounting.contacts",
    "accounting.settings",
    "payroll.settings",
    "payroll.employees",
    "payroll.timesheets",
  ].join(" ");

  constructor(config: {
    clientId: string;
    clientSecret: string;
    grantType: string;
    scopes?: string;
  }) {
    super({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      grantType: config.grantType,
    });
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.scopes = config.scopes;
  }

  private formatTokenError(error: unknown, context: string): Error {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const statusText = axiosError.response?.statusText;
    const suffix = status
      ? `: identity service returned ${status}${statusText ? ` ${statusText}` : ""}`
      : `: network error${axiosError.code ? ` (${axiosError.code})` : ""}`;

    return new Error(`Failed to get Xero token${context}${suffix}`);
  }

  public async getClientCredentialsToken(): Promise<TokenSet> {
    // If explicit scopes are configured, use them.
    if (this.scopes) {
      try {
        return await this.requestToken(this.scopes);
      } catch (envError) {
        throw this.formatTokenError(envError, " with configured scopes");
      }
    }

    // Else if XERO_SCOPES is not set, try V1 scopes first (for existing apps), fallback to V2 scopes (for new apps) only on invalid_scope error
    try {
      return await this.requestToken(this.XERO_DEFAULT_AUTH_SCOPES_V1);
    } catch (error) {
      const axiosError = error as AxiosError;
      const isInvalidScope =
        axiosError.response?.status === 400 &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (axiosError.response?.data as any)?.error === "invalid_scope";

      if (!isInvalidScope) {
        throw this.formatTokenError(error, " with V1 scopes");
      }

      try {
        return await this.requestToken(this.XERO_DEFAULT_AUTH_SCOPES_V2);
      } catch (v2Error) {
        throw this.formatTokenError(v2Error, " with V2 scopes");
      }
    }
  }

  private async requestToken(scope: string): Promise<TokenSet> {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString("base64");

    const response = await axios.post(
      "https://identity.xero.com/connect/token",
      `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
      },
    );

    // Get the tenant ID from the connections endpoint
    const token = response.data.access_token;
    const connectionsResponse = await axios.get(
      "https://api.xero.com/connections",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    if (connectionsResponse.data && connectionsResponse.data.length > 0) {
      this.tenantId = connectionsResponse.data[0].tenantId;
    }

    return response.data;
  }

  public async authenticate() {
    const tokenResponse = await this.getClientCredentialsToken();

    this.setTokenSet({
      access_token: tokenResponse.access_token,
      expires_in: tokenResponse.expires_in,
      token_type: tokenResponse.token_type,
    });
  }
}

export class BearerTokenXeroClient extends MCPXeroClient {
  private readonly bearerToken: string;

  constructor(config: { bearerToken: string }) {
    super();
    this.bearerToken = config.bearerToken;
  }

  async authenticate(): Promise<void> {
    this.setTokenSet({
      access_token: this.bearerToken,
    });

    await this.updateTenants();
  }
}

export function createXeroClient(config: {
  clientId?: string;
  clientSecret?: string;
  bearerToken?: string;
  grantType?: string;
  scopes?: string;
}): MCPXeroClient {
  if (config.bearerToken) {
    return new BearerTokenXeroClient({
      bearerToken: config.bearerToken,
    });
  }
  if (config.clientId && config.clientSecret) {
    return new CustomConnectionsXeroClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      grantType: config.grantType || "client_credentials",
      scopes: config.scopes,
    });
  }
  throw new Error(
    "Invalid Xero client configuration. Either bearerToken or clientId/clientSecret must be provided.",
  );
}

let defaultXeroClient: MCPXeroClient | null = null;

export function getDefaultXeroClient(): MCPXeroClient {
  if (defaultXeroClient) {
    return defaultXeroClient;
  }

  dotenv.config();

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  const bearerToken = process.env.XERO_CLIENT_BEARER_TOKEN;
  const scopes = process.env.XERO_SCOPES;
  const grantType = "client_credentials";

  if (!bearerToken && (!clientId || !clientSecret)) {
    throw new Error(
      "Environment Variables not set - please check your .env file",
    );
  }

  defaultXeroClient = bearerToken
    ? new BearerTokenXeroClient({
        bearerToken,
      })
    : new CustomConnectionsXeroClient({
        clientId: clientId!,
        clientSecret: clientSecret!,
        grantType,
        scopes,
      });

  return defaultXeroClient;
}

export function resetDefaultXeroClient(): void {
  defaultXeroClient = null;
}
