import { envVars } from "./libs/config.js"
import express from "express"
import { ExpressAuth } from "@auth/express"
import { authSession } from "./libs/session.js"
import { getAuthConfig } from "./libs/auth.js"
import { findMcpClientByName, getAllMcpClients } from "./services/mcp-client.js"
import type { MCPTool } from "./types/tools.types.js"
import { signTokens, verifyToken } from "./libs/tokens.js"
import { createUser, getByAccessToken, updateUser, getOAuthAccessTokenByMcpToken } from "./services/db.js"
import path from "path"
import mcpRouter from "./routes/mcp.js"
import type { User } from "./types/clients.types.js"
import "./types/auth.types.js"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

// Auth
app.use("/auth", ExpressAuth(await getAuthConfig()))

app.use(authSession)

app.get("/authorized", (req, res) => {
  const { session } = res.locals
  const user: User | undefined = session?.user
  if (!user) {
    res.status(401).send({ error: "Unauthorized" })
  }
  const { query } = req as {
    query: {
      token?: string
      clientId?: string
      code?: string
      callbackUrl?: string
    }
  }
  if (query.token) {
    const paredToken = verifyToken(query.token)
    if (!paredToken.token) {
      res.status(401).send({ error: "Unauthorized" })
    }
    
    // Get OAuth access token from session (e.g., GitHub token)
    const oauthAccessToken = session?.accessToken as string
    
    createUser({
      client_id: paredToken.userAccessKey!,
      access_token: paredToken.token!,
      user: { ...user, oauthAccessToken } as User,
    })
  } else if (query.code) {
    // Get OAuth access token from session (e.g., GitHub token)
    const oauthAccessToken = session?.accessToken as string
    
    updateUser({
      client_id: query.clientId!,
      code: query.code,
      user: { ...user, oauthAccessToken } as User,
    })

    if (query.callbackUrl) {
      res.redirect(query.callbackUrl)
      return
    }
  }

  res.sendFile(path.join(process.cwd(), "src", "pages", "authorized.html"))
})

// MCP Streamable Http
app.use(mcpRouter)

app.get("/", (_req, res) => {
  const { session } = res.locals
  res.send({
    message: "Hello from MCP-S",
    session,
  })
})

app.get("/tools", async (req, res) => {
  const toolMap = new Map<string, MCPTool>()

  // Get OAuth access token from authenticated user
  const auth = req.headers["authorization"]
  let oauthAccessToken: string | null = null
  
  if (auth) {
    const [, mcpToken] = auth.split(":")
    oauthAccessToken = getOAuthAccessTokenByMcpToken(mcpToken)
  }

  const mcpClients = await getAllMcpClients(oauthAccessToken || undefined)
  
  await Promise.all(
    mcpClients.map(async ({ name, client }) => {
      try {
        const { tools } = await client.listTools()
        tools.forEach((tool) => {
          toolMap.set(`${name}:${tool.name}`, {
            name: tool.name,
            slug: tool.name,
            description: tool.description,
            inputSchema: (tool.inputSchema as MCPTool["inputSchema"]) || {
              type: "object",
            },
            integrationSlug: name,
          })
        })
      } catch (error) {
        console.error(`Error listing tools for ${name}:`, error)
      }
    }),
  )

  res.send({
    data: Array.from(toolMap.values()),
  })
})

app.post("/generate-auth-url", async (req, res) => {
  const auth = req.headers["authorization"]!
  const [userAccessKey, token] = auth.split(":")

  const tokenSignature = signTokens({
    userAccessKey,
    token,
  })

  const callbackUrl = encodeURIComponent(
    `${envVars.BASE_URL}/authorized?token=${tokenSignature}`,
  )

  res.json({
    data: {
      url: `${envVars.BASE_URL}/auth/signin?callbackUrl=${callbackUrl}`,
    },
  })
})

app.post("/call/:integrationSlug/:toolSlug", async (req, res) => {
  const { integrationSlug, toolSlug } = req.params
  const auth = req.headers["authorization"]!
  const [, token] = auth.split(":")

  const client = getByAccessToken(token)
  if (!client || client.credentials!.access_token_expired_at < Date.now()) {
    res.status(401).send({ error: "Unauthorized - invalid-mcp-s-token" })
    return
  }

  // Get OAuth access token from database
  const oauthAccessToken = getOAuthAccessTokenByMcpToken(token)

  const mcpClient = await findMcpClientByName(integrationSlug, oauthAccessToken || undefined)

  if (!mcpClient) {
    res.status(404).send({ error: "Client not found" })
    return
  }

  try {
    const toolResponse = await mcpClient.callTool({
      name: toolSlug,
      arguments: req.body,
    })

    res.json(toolResponse)
  } catch (error) {
    console.error(`Error calling tool ${toolSlug}:`, error)
    res.status(500).send({ error: "Tool call failed" })
  }
})

export default app
