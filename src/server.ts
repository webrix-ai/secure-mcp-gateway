import dotenv from "dotenv"
dotenv.config()

import express from "express"
import { ExpressAuth } from "@auth/express"
import { authSession } from "./libs/session.js"
import { getAuthProvider } from "./libs/auth.js"
import { findMcpClientByName, getAllMcpClients } from "./services/mcp-client.js"
import type { MCPTool } from "./types/tools.types.js"
import { signTokens, verifyToken } from "./libs/tokens.js"
import { createUser, getByAccessToken, updateUser } from "./services/db.js"
import path from "path"
import mcpRouter from "./routes/mcp.js"
import type { User } from "./types/clients.types.js"

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

// Auth
app.use("/auth", ExpressAuth({ providers: [await getAuthProvider()] }))

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
    createUser({
      client_id: paredToken.userAccessKey!,
      access_token: paredToken.token!,
      user: user as User,
    })
  } else if (query.code) {
    updateUser({
      client_id: query.clientId!,
      code: query.code,
      user: user as User,
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

app.get("/tools", async (_req, res) => {
  const toolMap = new Map<string, MCPTool>()

  await Promise.all(
    getAllMcpClients().map(async ({ name, client }) => {
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
    `${process.env.BASE_URL}/authorized?token=${tokenSignature}`,
  )

  res.json({
    data: {
      url: `${process.env.BASE_URL}/auth/signin?callbackUrl=${callbackUrl}`,
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

  const mcpClient = await findMcpClientByName(integrationSlug)

  if (!mcpClient) {
    res.status(404).send({ error: "Client not found" })
    return
  }

  const toolResponse = await mcpClient.callTool({
    name: toolSlug,
    arguments: req.body,
  })

  res.json(toolResponse)
})

export default app
