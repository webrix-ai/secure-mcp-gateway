import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { Transport } from "@modelcontextprotocol/sdk/shared/transport"

export const getMcpClient = async (transport: Transport) => {
  const client = new Client({
    name: "mcp-s client",
    version: "1.0.0",
  })

  await client.connect(transport)

  return client
}
