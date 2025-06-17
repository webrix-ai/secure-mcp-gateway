import { test, describe, after } from "node:test"
import assert from "node:assert/strict"
import request from "supertest"
import app from "../src/server.ts"
import { getAllMcpClients } from "../src/services/mcp-client.ts"

describe("MCP Gateway", () => {
  after(async () => {
    getAllMcpClients().forEach(({ client }) => {
      client.transport?.close()
      client.close()
    })
  })

  describe("Health", () => {
    test("GET /health returns 200 and status ok", async () => {
      const res = await request(app).get("/health")
      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { status: "ok" })
    })
  })
})
