import express, { Router } from "express"
import type { Request, Response } from "express"
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js"
import { randomUUID } from "node:crypto"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import {
  CallToolRequestSchema,
  isInitializeRequest,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import dotenv from "dotenv"
import {
  findMcpClientByName,
  findMcpClientByToolName,
  getAllMcpClients,
} from "../services/mcp-client.ts"
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js"
import { mcpAuthProvider } from "../services/mcp-auth-provider.ts"
dotenv.config()

const mcpRouter = Router()
mcpRouter.use(express.json())
mcpRouter.use(express.urlencoded())

mcpRouter.use(
  mcpAuthRouter({
    provider: mcpAuthProvider,
    issuerUrl: new URL(process.env.BASE_URL || "http://localhost:3000"),
    baseUrl: new URL(process.env.BASE_URL || "http://localhost:3000"),
  }),
)

// Map to store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {}

// Handle POST requests for client-to-server communication
mcpRouter.post("/mcp", requireBearerAuth({ verifier: mcpAuthProvider }), async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers["mcp-session-id"] as string | undefined
  let transport: StreamableHTTPServerTransport

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId]
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        console.log("onsessioninitialized called with", { sessionId })
        // Store the transport by session ID
        transports[sessionId] = transport
      },
    })

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId]
      }
    }
    const server = new Server(
      {
        name: "mcp-s",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    server.setRequestHandler(
      ListToolsRequestSchema,
      async (request, { authInfo }) => {
        console.log("ListToolsRequestSchema called with", { request, authInfo })
        const toolMap = new Map<string, Tool>()
        const clientName = req.query.client as string | undefined
        const clients = clientName
          ? [
              {
                name: clientName,
                client: await findMcpClientByName(clientName),
              },
            ]
          : getAllMcpClients()

        await Promise.all(
          clients.map(async ({ name, client }) => {
            const { tools } = await client.listTools()
            tools.forEach((tool) => {
              toolMap.set(`${name}:${tool.name}`, {
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema || {
                  type: "object",
                },
              })
            })
          }),
        )
        return {
          tools: Array.from(toolMap.values()),
        }
      },
    )

    server.setRequestHandler(
      CallToolRequestSchema,
      async (request, { authInfo }) => {
        console.log("CallToolRequestSchema called with", { request, authInfo })

        const client = findMcpClientByToolName(request.params.name)
        if (!client) {
          return {
            error: {
              code: -32000,
              message: "Tool not found",
            },
          }
        }
        const toolResponse = await client.callTool({
          name: request.params.name,
          arguments: request.params.arguments,
        })

        return toolResponse
      },
    )

    // Connect to the MCP server
    await server.connect(transport)
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    })
    return
  }
  // Handle the request
  await transport.handleRequest(req, res, req.body)
})

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined

  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID")
    return
  }

  const transport = transports[sessionId]

  await transport.handleRequest(req, res)
}

// Handle GET requests for server-to-client notifications via SSE
mcpRouter.get("/mcp", requireBearerAuth({ verifier: mcpAuthProvider }), handleSessionRequest)

// Handle DELETE requests for session termination
mcpRouter.delete("/mcp", requireBearerAuth({ verifier: mcpAuthProvider }), handleSessionRequest)

export default mcpRouter
