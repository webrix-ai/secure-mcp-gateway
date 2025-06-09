import { Client } from "@modelcontextprotocol/sdk/client/index"
import { Transport } from "@modelcontextprotocol/sdk/shared/transport"
import { McpServers } from "../types/mcpServers.types"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp"
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio"

const mcpClients: Record<string, Client> = {}

export const getMcpClient = async (transport: Transport) => {
  const client = new Client({
    name: "mcp-s client",
    version: "1.0.0",
  })

  await client.connect(transport)

  return client
}

export const findClientByName = async (name: string) => {
  return mcpClients[name]
}

export const getAllClients = async () => {
  return Object.entries(mcpClients).map(([name, client]) => ({
    name,
    client,
  }))
}

export const loadMcpServers = async (mcpServers: McpServers) => {
  Object.entries(mcpServers.mcpServers).map(async ([name, server]) => {
    let transport: Transport
    if (server.url) {
      if (server.type === "sse") {
        transport = new SSEClientTransport(new URL(server.url))
      } else {
        transport = new StreamableHTTPClientTransport(new URL(server.url))
      }
    } else {
      transport = new StdioClientTransport({
        command: server.command,
        args: server.args,
        env: {
          ...getDefaultEnvironment(),
          ...(server.env || {}),
        },
      })
    }
    mcpClients[name] = await getMcpClient(transport)
  })
}
