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
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import dotenv from "dotenv"
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js"
import crypto from "node:crypto"
import { TOKEN_EXPIRATION_TIME } from "../libs/tokens.ts"
import {
  updateOAuthTokensByCode,
  updateOAuthTokensByRefreshToken,
  getUserByAccessToken,
} from "../services/db.ts"
import { findClientByToolName, getAllClients } from "../services/mcp-client.ts"
dotenv.config()

const mcpRouter = Router()
mcpRouter.use(express.json())
mcpRouter.use(express.urlencoded())

const clients = new Map<string, OAuthClientInformationFull>()

// Helper to store PKCE codes and challenges
const pkceStore = new Map<string, { codeChallenge: string; clientId: string }>()

function isPermitted(req: Request) {
  const authorization = req.headers["authorization"]
  if (!authorization || typeof authorization !== "string") {
    return false
  }
  // Expecting format: Bearer <token>
  const match = authorization.match(/^Bearer (.+)$/)
  if (!match) {
    return false
  }
  const accessToken = match[1]
  const user = getUserByAccessToken(accessToken)
  if (!user) {
    return false
  }
  if (
    !user.access_token_expired_at ||
    Number(user.access_token_expired_at) < Date.now()
  ) {
    return false
  }
  return true
}

function saveAuthorizationCode({
  code,
  codeChallenge,
  clientId,
}: {
  code: string
  codeChallenge: string
  clientId: string
}) {
  pkceStore.set(code, { codeChallenge, clientId })
}

mcpRouter.use(
  mcpAuthRouter({
    provider: {
      clientsStore: {
        getClient: async (client_id) => {
          console.log("getClient called with", { client_id })
          return clients.get(client_id)
        },
        registerClient: async (client) => {
          console.log("registerClient called with", { client })
          clients.set(client.client_id, client)
          return client
        },
      },
      verifyAccessToken: async (token) => {
        console.log("verifyAccessToken called with", { token })
        return {
          token,
          clientId: "123",
          scopes: ["openid", "email", "profile"],
        }
      },
      authorize: async (
        client: OAuthClientInformationFull,
        params: any,
        res: Response,
      ) => {
        console.log("authorize called with", { client, params })
        // Redirect with code and state on success
        const code = crypto.randomBytes(32).toString("hex")
        // Save the code and PKCE challenge
        if (params.codeChallenge) {
          saveAuthorizationCode({
            code,
            codeChallenge: params.codeChallenge,
            clientId: client.client_id,
          })
        }
        const redirectUrl = new URL(params.redirectUri)
        redirectUrl.searchParams.set("code", code)
        if (params.state) {
          redirectUrl.searchParams.set("state", params.state)
        }
        const callbackUrl = `${process.env.BASE_URL}/authorized?code=${code}&clientId=${client.client_id}&callbackUrl=${encodeURIComponent(
          redirectUrl.toString(),
        )}`
        res.redirect(
          `${process.env.BASE_URL}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        )
      },
      challengeForAuthorizationCode: async (
        client: OAuthClientInformationFull,
        authorizationCode: string,
      ) => {
        console.log("challengeForAuthorizationCode called with", {
          client,
          authorizationCode,
        })
        const entry = pkceStore.get(authorizationCode)
        return entry?.codeChallenge || ""
      },
      exchangeAuthorizationCode: async (
        client: OAuthClientInformationFull,
        authorizationCode: string,
        codeVerifier?: string,
        redirectUri?: string,
      ) => {
        console.log("exchangeAuthorizationCode called with", {
          client,
          authorizationCode,
          codeVerifier,
          redirectUri,
        })

        const refreshToken = crypto.randomBytes(32).toString("hex")
        const accessToken = crypto.randomBytes(32).toString("hex")
        const accessTokenExpiredAt = Date.now() + TOKEN_EXPIRATION_TIME
        updateOAuthTokensByCode({
          user_access_key: client.client_id,
          token: authorizationCode,
          access_token: accessToken,
          access_token_expired_at: accessTokenExpiredAt,
          refresh_token: refreshToken,
        })

        return {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: TOKEN_EXPIRATION_TIME,
          scope: "openid email profile",
          refresh_token: refreshToken,
        }
      },
      skipLocalPkceValidation: true,
      exchangeRefreshToken: async (
        client: OAuthClientInformationFull,
        refreshToken: string,
        scopes?: string[],
      ) => {
        console.log("exchangeRefreshToken called with", {
          client,
          refreshToken,
          scopes,
        })
        const accessToken = crypto.randomBytes(32).toString("hex")
        const accessTokenExpiredAt = Date.now() + TOKEN_EXPIRATION_TIME
        updateOAuthTokensByRefreshToken({
          user_access_key: client.client_id,
          access_token: accessToken,
          access_token_expired_at: accessTokenExpiredAt,
          refresh_token: refreshToken,
        })
        return {
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: TOKEN_EXPIRATION_TIME,
          scope: scopes?.join(" ") || "openid email profile",
          refresh_token: refreshToken,
        }
      },
    },
    issuerUrl: new URL(process.env.BASE_URL || "http://localhost:3000"),
    baseUrl: new URL(process.env.BASE_URL || "http://localhost:3000"),
  }),
)

// Map to store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {}

// Handle POST requests for client-to-server communication
mcpRouter.post("/mcp", async (req, res) => {
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
        console.log(
          "ListToolsRequestSchema called with",
          { request, authInfo },
          req.headers["authorization"],
        )
        if (!isPermitted(req)) {
          return {
            error: {
              code: -32000,
              message: "Unauthorized",
            },
          }
        }
        const toolMap = new Map<string, any>()

        await Promise.all(
          getAllClients().map(async ({ client }) => {
            const { tools } = await client.listTools()
            tools.forEach((tool) => {
              toolMap.set(tool.name, {
                // TODO use name
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
        console.log(
          "CallToolRequestSchema called with",
          { request, authInfo },
          req.headers["authorization"],
        )

        if (!isPermitted(req)) {
          return {
            error: {
              code: -32000,
              message: "Unauthorized",
            },
          }
        }
        const client = findClientByToolName(request.params.name)
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

  if (!req.headers["authorization"]) {
    res.status(401).send("unauthorized")
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
  if (!req.headers["authorization"]) {
    res.status(401).send("unauthorized")
    return
  }

  const transport = transports[sessionId]

  await transport.handleRequest(req, res)
}

// Handle GET requests for server-to-client notifications via SSE
mcpRouter.get("/mcp", handleSessionRequest)

// Handle DELETE requests for session termination
mcpRouter.delete("/mcp", handleSessionRequest)

export default mcpRouter
