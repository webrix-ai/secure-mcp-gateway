import express from "express"
import { ExpressAuth } from "@auth/express"
import dotenv from "dotenv"
import { authSession } from "./session"
import { getAuthProvider } from "./libs/auth"
import {
  findClientByName,
  getAllClients,
  loadMcpServers,
} from "./services/mcp-client"
import fs from "fs"
import { Client } from "@modelcontextprotocol/sdk/client/index"
import { MCPTool } from "./types/tools.types"
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

try {
  const mcpServersJsonFile = process.argv.includes("--mcpServersJsonFile")
    ? process.argv[process.argv.indexOf("--mcpServersJsonFile") + 1]
    : "./mcp.json"

  const mcpServers = await fs.promises.readFile(mcpServersJsonFile, "utf-8")

  await loadMcpServers(JSON.parse(mcpServers))
} catch (error) {
  console.error("No valid MCP servers found", error)
}

app.get("/tools", async (req, res) => {
  const { session } = res.locals
  if (!session?.user?.email) {
    res.status(401).send({ error: "Unauthorized" })
    return
  }

  const toolMap = new Map<string, MCPTool>()

  await Promise.all(
    (await getAllClients()).map(async ({ name, client }) => {
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

export default app

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
  })
}
