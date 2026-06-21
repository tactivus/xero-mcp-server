import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolDefinition } from "../types/tool-definition.js";
import { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { getXeroToolMetadata } from "../tools/tool-metadata.js";

export const CreateXeroTool =
  <Args extends ZodRawShapeCompat>(
    name: string,
    description: string,
    schema: Args,
    handler: ToolCallback<Args>,
  ): (() => ToolDefinition<ZodRawShapeCompat>) =>
  () => {
    const metadata = getXeroToolMetadata(name);

    return {
      name: name,
      ...metadata,
      description: description,
      schema: schema,
      handler: handler,
    };
  };
