#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { XeroMcpServer } from "./server/xero-mcp-server.js";
import { ToolFactory } from "./tools/tool-factory.js";
import { getDefaultXeroClient } from "./clients/xero-client.js";

const main = async () => {
  const client = getDefaultXeroClient();

  // Create an MCP server
  const server = XeroMcpServer.GetServer();

  ToolFactory(server, client);

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
