import { AsyncLocalStorage } from "async_hooks";

import {
  clientContext,
  MCPXeroClient,
  tenantContext,
} from "../clients/xero-client.js";

export interface XeroForkLogger {
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

export interface XeroForkContext {
  client: MCPXeroClient;
  tenantId?: string;
  logger?: XeroForkLogger;
  onToolError?: (raw: string) => string;
}

interface ActiveXeroForkContext extends XeroForkContext {
  logger: XeroForkLogger;
}

const noopLogger: XeroForkLogger = {
  warn: () => undefined,
  error: () => undefined,
};

const xeroForkContext = new AsyncLocalStorage<ActiveXeroForkContext>();

export function runWithXeroForkContext<T>(
  context: XeroForkContext,
  callback: () => T,
): T {
  const activeContext: ActiveXeroForkContext = {
    ...context,
    logger: context.logger ?? noopLogger,
  };

  return xeroForkContext.run(activeContext, () => {
    const runWithClient = () => clientContext.run(context.client, callback);

    return context.tenantId
      ? tenantContext.run(context.tenantId, runWithClient)
      : runWithClient();
  });
}

export function getActiveXeroForkLogger(): XeroForkLogger {
  return xeroForkContext.getStore()?.logger ?? noopLogger;
}

export function normalizeXeroToolError(raw: string): string {
  let normalized: string | undefined;
  try {
    normalized = xeroForkContext.getStore()?.onToolError?.(raw);
  } catch {
    normalized = undefined;
  }
  return normalized && normalized.trim() ? normalized : raw;
}
