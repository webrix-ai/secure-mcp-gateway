import type { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js"

export type ServerParameters = {
  url: string
  env?: Record<string, string>
}

type McpServer = StdioServerParameters &
  ServerParameters & { type: "stdio" | "sse" | "http" }

export type McpServers = {
  mcpServers: Record<string, McpServer>
}
