import {
  envVars,
  loadConfig,
  reloadEnvVars,
  validateConfig,
} from "./libs/config.js"

import app from "./server.js"
import fs from "node:fs"
import { loadMcpServers, shutdownAllMcpServers } from "./services/mcp-client.js"

// Parse command line arguments
const args = process.argv.slice(2)
let mcpConfigPath = "./mcp.json"
let envFilePath: string | undefined

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mcp-config" && i + 1 < args.length) {
    mcpConfigPath = args[i + 1]
    i++ // Skip the next argument as it's the value
  } else if (args[i] === "--env-file" && i + 1 < args.length) {
    envFilePath = args[i + 1]
    i++ // Skip the next argument as it's the value
  }
}

// Load custom env file if provided and reload environment variables
if (envFilePath) {
  loadConfig(envFilePath)
  reloadEnvVars()
}

// Validate configuration after all loading is complete
validateConfig()

try {
  const mcpServers = await fs.promises.readFile(mcpConfigPath, "utf-8")
  await loadMcpServers(JSON.parse(mcpServers))
} catch (error) {
  console.error(`Failed to load MCP servers from ${mcpConfigPath}:`, error)
}

const port = envVars.PORT
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
