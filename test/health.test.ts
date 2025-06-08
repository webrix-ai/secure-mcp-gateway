import test from "node:test"
import assert from "node:assert/strict"
import request from "supertest"
import app from "../src/index.ts"

test("GET /health returns 200 and status ok", async () => {
  const res = await request(app).get("/health")
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { status: "ok" })
})
