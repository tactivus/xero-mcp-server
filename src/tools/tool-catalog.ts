import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";

import { formatError } from "../helpers/format-error.js";
import {
  normalizeXeroToolError,
  runWithXeroForkContext,
  XeroForkContext,
} from "../runtime/xero-fork-context.js";
import { ToolDefinition } from "../types/tool-definition.js";
import { CreateTools } from "./create/index.js";
import { DeleteTools } from "./delete/index.js";
import { GetTools } from "./get/index.js";
import { ListTools } from "./list/index.js";
import { UpdateTools } from "./update/index.js";

export const XeroToolFactories = [
  ...DeleteTools,
  ...GetTools,
  ...CreateTools,
  ...ListTools,
  ...UpdateTools,
] as const;

export function getXeroToolDefinitions(): ToolDefinition<ZodRawShapeCompat>[] {
  return XeroToolFactories.map((createTool) => createTool());
}

export function createXeroToolDefinitions(
  context: XeroForkContext,
): ToolDefinition<ZodRawShapeCompat>[] {
  return getXeroToolDefinitions().map((tool) =>
    bindXeroToolDefinition(tool, context),
  );
}

export function bindXeroToolDefinition<Args extends ZodRawShapeCompat>(
  tool: ToolDefinition<Args>,
  context: XeroForkContext,
): ToolDefinition<Args> {
  const originalHandler = tool.handler as unknown as (
    args: unknown,
    extra: unknown,
  ) => unknown;
  const handler = (async (args: unknown, extra: unknown) =>
    runWithXeroForkContext(context, async () => {
      try {
        return normalizeToolResult(await originalHandler(args, extra));
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error running ${tool.name}: ${normalizeXeroToolError(
                formatError(error),
              )}`,
            },
          ],
          isError: true,
        };
      }
    })) as unknown as ToolCallback<Args>;

  return {
    ...tool,
    handler,
  };
}

function normalizeToolResult(result: unknown): unknown {
  if (!isToolResult(result)) {
    return result;
  }

  let isError = Boolean(result.isError);
  const content = result.content.map((item) => {
    if (
      item &&
      typeof item === "object" &&
      "type" in item &&
      item.type === "text" &&
      "text" in item &&
      typeof item.text === "string" &&
      isXeroErrorText(item.text)
    ) {
      isError = true;
      return {
        ...item,
        text: normalizeXeroToolError(item.text),
      };
    }

    return item;
  });

  return {
    ...result,
    content,
    ...(isError ? { isError: true } : {}),
  };
}

function isXeroErrorText(text: string): boolean {
  return /^Error (adding|approving|creating|deleting|fetching|getting|listing|retrieving|reverting|running|updating|while)\b/i.test(
    text,
  );
}

function isToolResult(
  result: unknown,
): result is { content: unknown[]; isError?: boolean } {
  return (
    result !== null &&
    typeof result === "object" &&
    "content" in result &&
    Array.isArray((result as { content?: unknown }).content)
  );
}
