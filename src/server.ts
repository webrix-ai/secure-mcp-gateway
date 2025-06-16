import express from "express"
import { ExpressAuth } from "@auth/express"
import dotenv from "dotenv"
import { authSession } from "./libs/session.ts"
import { getAuthProvider } from "./libs/auth.ts"
import { findClientByName, getAllClients } from "./services/mcp-client.ts"
import type { MCPTool } from "./types/tools.types.ts"
import {
  signTokens,
  TOKEN_EXPIRATION_TIME,
  verifyToken,
} from "./libs/tokens.ts"
import { getUserByTokens, upsertUser } from "./services/db.ts"
import path from "path"
import mcpRouter from "./routes/mcp.ts"
dotenv.config()

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

// Auth
app.use("/auth", ExpressAuth({ providers: [await getAuthProvider()] }))

app.use(authSession)

app.get("/authorized", (req, res) => {
  const { session } = res.locals
  const email = session?.user?.email
  if (!email) {
    res.status(401).send({ error: "Unauthorized" })
  }
  const {
    token: tokenFromQuery,
    clientId,
    code,
    callbackUrl,
  } = req.query as {
    token?: string
    clientId?: string
    code?: string
    callbackUrl?: string
  }
  let userAccessKey: string = ""
  let token: string = ""
  if (tokenFromQuery) {
    const paredToken = verifyToken(tokenFromQuery)
    userAccessKey = paredToken.userAccessKey!
    token = paredToken.token!
    if (!userAccessKey || !token) {
      res.status(401).send({ error: "Unauthorized" })
    }
  } else if (code) {
    userAccessKey = clientId!
    token = code!
  }

  upsertUser({
    email,
    user_access_key: userAccessKey,
    token,
    token_expired_at: Date.now() + TOKEN_EXPIRATION_TIME,
  })

  if (callbackUrl) {
    res.redirect(callbackUrl)
    return
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
    getAllClients().map(async ({ name, client }) => {
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

  res.send({
    data: {
      url: `${process.env.BASE_URL}/auth/signin?callbackUrl=${callbackUrl}`,
    },
  })
})

app.post("/call/:integrationSlug/:toolSlug", async (req, res) => {
  const { integrationSlug, toolSlug } = req.params
  const auth = req.headers["authorization"]!
  const [userAccessKey, token] = auth.split(":")

  const user = getUserByTokens(userAccessKey, token)
  if (!user || (user.token_expired_at as number) < Date.now()) {
    res.status(401).send({ error: "Unauthorized - invalid-mcp-s-token" })
  }

  const client = await findClientByName(integrationSlug)

  if (!client) {
    res.status(404).send({ error: "Client not found" })
  }

  const toolResponse = await client.callTool({
    name: toolSlug,
    arguments: req.body,
  })

  res.send(toolResponse)
})

export default app
