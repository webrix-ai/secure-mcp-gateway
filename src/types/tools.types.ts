import type { JSONSchema7 } from "json-schema"

export interface MCPTool {
  name: string
  slug: string
  description?: string
  integrationSlug: string
  inputSchema: JSONSchema7 & { type: "object" }
}
