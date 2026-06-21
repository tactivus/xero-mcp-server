import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";

import { MCPXeroClient, getDefaultXeroClient } from "../clients/xero-client.js";
import {
  bindXeroToolDefinition,
  getXeroToolDefinitions,
} from "./tool-catalog.js";
import { ToolDefinition } from "../types/tool-definition.js";

function registerTool<Args extends ZodRawShapeCompat>(
  server: McpServer,
  client: MCPXeroClient,
  tool: ToolDefinition<Args>,
) {
  const handler = bindXeroToolDefinition(tool, { client })
    .handler as unknown as typeof tool.handler;
  server.tool(tool.name, tool.description, tool.schema, handler);
}

export function ToolFactory(
  server: McpServer,
  client: MCPXeroClient = getDefaultXeroClient(),
) {
  getXeroToolDefinitions().forEach((tool) =>
    registerTool(server, client, tool),
  );
}
