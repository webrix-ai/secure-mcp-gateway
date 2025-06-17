import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import type { McpServers } from "../types/mcp-servers.types.ts"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js"

const mcpClients: Record<string, Client> = {}

export const getMcpClient = async (transport: Transport) => {
  const client = new Client({
    name: "mcp-s client",
    version: "1.0.0",
  })

  await client.connect(transport)

  return client
}

export const findMcpClientByName = (name: string) => {
  return mcpClients[name]
}

export const findMcpClientByToolName = (toolName: string) => {
  return Object.values(mcpClients).find((client) =>
    client
      .listTools()
      .then(({ tools }) => tools.some((tool) => tool.name === toolName)),
  )
}

export const getAllMcpClients = () => {
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

export const shutdownAllMcpServers = async () => {
  await Promise.all(
    getAllMcpClients().map(async ({ client }) => {
      client.transport?.close?.()
      await client.close?.()
    })
  )
}
