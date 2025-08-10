import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import type { McpServers } from "../types/mcp-servers.types.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js"

// Store MCP clients per access token: accessToken -> serverName -> Client
const mcpClientsByToken: Record<string, Record<string, Client>> = {}
// Store global MCP servers configuration
let globalMcpServers: McpServers | null = null

export const getMcpClient = async (transport: Transport) => {
  const client = new Client({
    name: "mcp-s client",
    version: "1.0.0",
  })

  await client.connect(transport)

  return client
}

export const findMcpClientByName = async (name: string, accessToken?: string) => {
  if (!accessToken) {
    // Fallback to global clients for backward compatibility
    const tokenEntries = Object.values(mcpClientsByToken)
    if (tokenEntries.length > 0) {
      return tokenEntries[0][name] || null
    }
    return null
  }

  // Ensure clients are loaded for this access token
  await ensureMcpClientsForToken(accessToken)
  
  return mcpClientsByToken[accessToken]?.[name] || null
}

export const findMcpClientByToolName = async (toolName: string, accessToken?: string) => {
  const clients = await getAllMcpClients(accessToken)
  
  for (const { client } of clients) {
    try {
      const { tools } = await client.listTools()
      if (tools.some((tool) => tool.name === toolName)) {
        return client
      }
    } catch (error) {
      console.error(`Error listing tools for client:`, error)
    }
  }
  
  return null
}

export const getAllMcpClients = async (accessToken?: string) => {
  if (!accessToken) {
    // Fallback to global clients for backward compatibility
    const tokenEntries = Object.values(mcpClientsByToken)
    if (tokenEntries.length > 0) {
      const firstTokenClients = tokenEntries[0]
      return Object.entries(firstTokenClients).map(([name, client]) => ({
        name,
        client,
      }))
    }
    return []
  }

  // Ensure clients are loaded for this access token
  await ensureMcpClientsForToken(accessToken)
  
  const clients = mcpClientsByToken[accessToken] || {}
  return Object.entries(clients).map(([name, client]) => ({
    name,
    client,
  }))
}

// Helper function to ensure MCP clients are loaded for a specific access token
const ensureMcpClientsForToken = async (accessToken: string) => {
  if (!globalMcpServers) {
    console.warn("No MCP servers configuration available")
    return
  }

  // Check if clients already exist for this token
  if (mcpClientsByToken[accessToken]) {
    return
  }

  // Initialize clients for this token
  mcpClientsByToken[accessToken] = {}

  const loadPromises = Object.entries(globalMcpServers.mcpServers).map(async ([name, server]) => {
    try {
      let transport: Transport
      if (server.url) {
        const headers: Record<string, string> = {}
        if (accessToken && accessToken !== '__default__') {
          headers['Authorization'] = `Bearer ${accessToken}`
        }

        if (server.type === "sse") {
          transport = new SSEClientTransport(new URL(server.url), {
            requestInit: { headers }
          })
        } else {
          transport = new StreamableHTTPClientTransport(new URL(server.url), {
            requestInit: { headers }
          })
        }
      } else {
        // For stdio clients, pass access token as environment variable
        const envVars: Record<string, string> = {
          ...getDefaultEnvironment(),
          ...(server.env || {}),
        }
        
        if (accessToken && accessToken !== '__default__') {
          envVars.Authorization = `Bearer ${accessToken}`
        }
        transport = new StdioClientTransport({
          command: server.command,
          args: server.args,
          env: envVars,
        })
      }
      mcpClientsByToken[accessToken][name] = await getMcpClient(transport)
    } catch (error) {
      console.error(`Failed to create MCP client for ${name} with token:`, error)
    }
  })

  await Promise.all(loadPromises)
}

export const loadMcpServers = async (mcpServers: McpServers) => {
  // Store the global configuration
  globalMcpServers = mcpServers
  
  // For backward compatibility, create a default instance without access token
  // This will be used when no access token is provided
  await ensureMcpClientsForToken('__default__')
}

export const shutdownAllMcpServers = async () => {
  const shutdownPromises: Promise<void>[] = []
  
  // Shutdown all clients for all tokens
  for (const tokenClients of Object.values(mcpClientsByToken)) {
    for (const client of Object.values(tokenClients)) {
      shutdownPromises.push(
        (async () => {
          try {
            client.transport?.close?.()
            await client.close?.()
          } catch (error) {
            console.error("Error shutting down MCP client:", error)
          }
        })()
      )
    }
  }
  
  await Promise.all(shutdownPromises)
  
  // Clear all clients
  Object.keys(mcpClientsByToken).forEach(token => {
    delete mcpClientsByToken[token]
  })
}
