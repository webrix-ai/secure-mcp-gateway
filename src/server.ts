import express from "express"
import { ExpressAuth } from "@auth/express"
import dotenv from "dotenv"
import { authSession } from "./libs/session.ts"
import { getAuthProvider } from "./libs/auth.ts"
import { findClientByName, getAllClients } from "./services/mcp-client.ts"
import type { MCPTool } from "./types/tools.types.ts"
import { signTokens } from "./libs/tokens.ts"
dotenv.config()

const app = express()

app.use(express.json())

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

app.use("/auth", ExpressAuth({ providers: [await getAuthProvider()] }))

app.use(authSession)

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
  // const auth = req.headers["authorization"]!
  // const [userAccessKey, token] = auth.split(":")
  // TODO: validate userAccessKey and token

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
