import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ZodRawShapeCompat,
  AnySchema,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";

export interface ToolDefinition<
  Args extends undefined | ZodRawShapeCompat | AnySchema = undefined,
> {
  name: string;
  upstreamName: string;
  hostedName: string;
  description: string;
  schema: Args;
  handler: ToolCallback<Args>;
  operationType: XeroToolOperationType;
  category: XeroToolCategory;
  destructive: boolean;
  irreversible: boolean;
  highRisk: boolean;
}

export type XeroToolOperationType = "read" | "write" | "destructive";

export type XeroToolCategory = "list" | "get" | "create" | "update" | "delete";

export interface XeroToolMetadata {
  upstreamName: string;
  hostedName: string;
  operationType: XeroToolOperationType;
  category: XeroToolCategory;
  destructive: boolean;
  irreversible: boolean;
  highRisk: boolean;
}
