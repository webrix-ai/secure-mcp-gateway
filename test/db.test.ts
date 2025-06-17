import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import {
  createClient,
  getByClientId,
  getByAccessToken,
  updateCodes,
  getByCode,
  updateUser,
  getByRefreshToken,
  updateCredentials,
} from "../src/services/db.ts"
import type {
  ClientInfo,
  Credentials,
  User,
} from "../src/types/clients.types.ts"
import { DatabaseSync } from "node:sqlite"
import path from "path"

// Helper to clear the DB before each test
const dbPath = path.resolve(process.env.DB_PATH || "./mcp.sqlite")
const db = new DatabaseSync(dbPath)

function clearClientsTable() {
  db.exec("DELETE FROM clients")
}

describe("DB", () => {
  beforeEach(() => {
    clearClientsTable()
  })

  const clientInfo: ClientInfo = {
    client_id: "client-1",
    client_name: "Test Client",
    redirect_uris: ["http://localhost/callback"],
    token_endpoint_auth_method: "client_secret_basic",
    grant_types: ["authorization_code"],
    response_types: ["code"],
    client_id_issued_at: Date.now(),
    client_secret_expires_at: 0,
  }

  const credentials: Credentials = {
    access_token: "access-token-1",
    token_type: "Bearer",
    access_token_expired_at: Date.now() + 10000,
    scope: "openid profile",
    refresh_token: "refresh-token-1",
  }

  const user: User = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    image: null,
  }

  it("should create and retrieve a client by client_id", () => {
    createClient({ client: clientInfo })
    const found = getByClientId(clientInfo.client_id)
    assert(found, "Client should be found")
    assert.equal(found!.client_id, clientInfo.client_id)
    assert.deepEqual(found!.client, clientInfo)
  })

  it("should update and retrieve codes", () => {
    createClient({ client: clientInfo })
    updateCodes({
      client_id: clientInfo.client_id,
      code: "code-1",
      code_challenge: "challenge-1",
    })
    const found = getByClientId(clientInfo.client_id)
    assert.equal(found!.code, "code-1")
    assert.equal(found!.code_challenge, "challenge-1")
  })

  it("should get client by code", () => {
    createClient({ client: clientInfo })
    updateCodes({
      client_id: clientInfo.client_id,
      code: "code-2",
      code_challenge: "challenge-2",
    })
    const found = getByCode(clientInfo.client_id, "code-2")
    assert(found, "Client should be found by code")
    assert.equal(found!.code, "code-2")
  })

  it("should update and retrieve user", () => {
    createClient({ client: clientInfo })
    updateCodes({
      client_id: clientInfo.client_id,
      code: "code-3",
      code_challenge: "challenge-3",
    })
    updateUser({ client_id: clientInfo.client_id, code: "code-3", user })
    const found = getByCode(clientInfo.client_id, "code-3")
    assert.deepEqual(found!.user, user)
  })

  it("should update and retrieve credentials by access token", () => {
    createClient({ client: clientInfo })
    updateCredentials({ client_id: clientInfo.client_id, credentials })
    const found = getByAccessToken(credentials.access_token)
    assert(found, "Client should be found by access token")
    assert.deepEqual(found!.credentials, credentials)
  })

  it("should return null for non-existent access token", () => {
    const found = getByAccessToken("non-existent")
    assert.equal(found, null)
  })

  it("should return null for non-existent client_id", () => {
    const found = getByClientId("non-existent")
    assert.equal(found, null)
  })

  it("should return null for non-existent code", () => {
    createClient({ client: clientInfo })
    const found = getByCode(clientInfo.client_id, "bad-code")
    assert.equal(found, null)
  })

  it("should return null for non-existent refresh token", () => {
    const found = getByRefreshToken("bad-refresh")
    assert.equal(found, null)
  })

  it("should update and retrieve credentials by refresh token", () => {
    db.prepare(
      `INSERT INTO clients (client_id, client, credentials) VALUES (?, ?, ?)`,
    ).run(
      "client-legacy",
      JSON.stringify(clientInfo),
      JSON.stringify(credentials),
    )
    const found = getByRefreshToken(credentials.refresh_token)
    assert(found, "Client should be found by refresh token")
    assert.deepEqual(found!.credentials, credentials)
  })
})
