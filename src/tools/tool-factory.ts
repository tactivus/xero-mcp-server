import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";

import {
  MCPXeroClient,
  clientContext,
  getDefaultXeroClient,
} from "../clients/xero-client.js";
import { CreateTools } from "./create/index.js";
import { DeleteTools } from "./delete/index.js";
import { GetTools } from "./get/index.js";
import { ListTools } from "./list/index.js";
import { UpdateTools } from "./update/index.js";
import { ToolDefinition } from "../types/tool-definition.js";

function registerTool<Args extends ZodRawShapeCompat>(
  server: McpServer,
  client: MCPXeroClient,
  tool: ToolDefinition<Args>,
) {
  const originalHandler = tool.handler as unknown as (
    args: unknown,
    extra: unknown,
  ) => unknown;
  const handler = ((args: unknown, extra: unknown) =>
    clientContext.run(client, () =>
      originalHandler(args, extra),
    )) as unknown as typeof tool.handler;
  server.tool(tool.name, tool.description, tool.schema, handler);
}

export function ToolFactory(
  server: McpServer,
  client: MCPXeroClient = getDefaultXeroClient(),
) {
  DeleteTools.map((tool) => tool()).forEach((tool) =>
    registerTool(server, client, tool),
  );
  GetTools.map((tool) => tool()).forEach((tool) =>
    registerTool(server, client, tool),
  );
  CreateTools.map((tool) => tool()).forEach((tool) =>
    registerTool(server, client, tool),
  );
  ListTools.map((tool) => tool()).forEach((tool) =>
    registerTool(server, client, tool),
  );
  UpdateTools.map((tool) => tool()).forEach((tool) =>
    registerTool(server, client, tool),
  );
}
