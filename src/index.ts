import app from "./server.ts"
import fs from "node:fs"
import { loadMcpServers, shutdownAllMcpServers } from "./services/mcp-client.ts"

try {
  const mcpServersJsonFile = process.argv.includes("--mcpServersJsonFile")
    ? process.argv[process.argv.indexOf("--mcpServersJsonFile") + 1]
    : "./mcp.json"

  const mcpServers = await fs.promises.readFile(mcpServersJsonFile, "utf-8")

  await loadMcpServers(JSON.parse(mcpServers))
} catch (error) {
  console.error("No valid MCP servers found", error)
}

const port = process.env.PORT || 3000
const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})

async function gracefulShutdown() {
  console.log("Shutting down MCP servers...")
  await shutdownAllMcpServers()
  server.close(() => {
    console.log("Express server closed.")
    process.exit(0)
  })
}

process.on("SIGINT", gracefulShutdown)
process.on("SIGTERM", gracefulShutdown)
