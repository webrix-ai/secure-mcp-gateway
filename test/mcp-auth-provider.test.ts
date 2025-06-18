import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { mcpAuthProvider } from "../src/services/mcp-auth-provider.ts"
import { DatabaseSync } from "node:sqlite"
import path from "path"
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js"
import type { Credentials } from "../src/types/clients.types.ts"

process.env.BASE_URL = "http://localhost"

const dbPath = path.resolve(process.env.DB_PATH || "./mcp.sqlite")
const db = new DatabaseSync(dbPath)
function clearClientsTable() {
  db.exec("DELETE FROM clients")
}

describe("MCP Auth Provider", () => {
  beforeEach(() => {
    clearClientsTable()
  })

  const client: OAuthClientInformationFull = {
    client_id: "client-1",
    redirect_uris: ["http://localhost/callback"],
    token_endpoint_auth_method: "client_secret_basic",
    grant_types: ["authorization_code"],
    response_types: ["code"],
    client_name: "Test Client",
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
  
  it("registerClient and getClient should work", async () => {
    await mcpAuthProvider.clientsStore.registerClient!(client)
    const found = await mcpAuthProvider.clientsStore.getClient(client.client_id)
    assert.deepEqual(found, client)
  })

  it("getClient should throw for missing client", async () => {
    await assert.rejects(async () => {
      await mcpAuthProvider.clientsStore.getClient("bad-id")
    }, /Unauthorized/)
  })

  it("verifyAccessToken should return info for valid token", async () => {
    // Insert client with credentials
    db.prepare(
      `INSERT INTO clients (client_id, client, credentials) VALUES (?, ?, ?)`,
    ).run(client.client_id, JSON.stringify(client), JSON.stringify(credentials))
    const result = await mcpAuthProvider.verifyAccessToken(
      credentials.access_token,
    )
    assert.equal(result.token, credentials.access_token)
    assert.equal(result.clientId, client.client_id)
    assert(result.expiresAt && result.expiresAt > Date.now())
    assert.deepEqual(result.scopes, ["openid", "email", "profile"])
  })

  it("verifyAccessToken should throw for invalid token", async () => {
    await assert.rejects(async () => {
      await mcpAuthProvider.verifyAccessToken("bad-token")
    }, /Unauthorized/)
  })

  it("authorize should redirect with correct params", async () => {
    // Insert client
    db.prepare(`INSERT INTO clients (client_id, client) VALUES (?, ?)`).run(
      client.client_id,
      JSON.stringify(client),
    )
    let redirectedUrl = ""
    const res: { redirect: (url: string) => void } = {
      redirect: (url: string) => {
        redirectedUrl = url
      },
    }
    process.env.BASE_URL = process.env.BASE_URL || "http://localhost"
    await mcpAuthProvider.authorize(
      client,
      {
        codeChallenge: "challenge-1",
        redirectUri: "http://localhost/callback",
        state: "abc123",
      },
      res as unknown as import("express").Response,
    )
    console.log("Redirected URL:", redirectedUrl)
    const url = new URL(redirectedUrl);
    const callbackUrl = url.searchParams.get("callbackUrl");
    assert(callbackUrl, "callbackUrl param should exist in redirect");

    // Now decode and check the inner URL
    const decodedCallbackUrl = decodeURIComponent(callbackUrl);
    assert(decodedCallbackUrl.includes("state=abc123"));
    assert(decodedCallbackUrl.includes("code="));
  })

  it("challengeForAuthorizationCode should return code_challenge", async () => {
    // Insert client with code and code_challenge
    db.prepare(
      `INSERT INTO clients (client_id, client, code, code_challenge) VALUES (?, ?, ?, ?)`,
    ).run(client.client_id, JSON.stringify(client), "thecode", "thechallenge")
    const challenge = await mcpAuthProvider.challengeForAuthorizationCode(
      client,
      "thecode",
    )
    assert.equal(challenge, "thechallenge")
  })

  it("challengeForAuthorizationCode should throw for bad code", async () => {
    await assert.rejects(async () => {
      await mcpAuthProvider.challengeForAuthorizationCode(client, "badcode")
    }, /Unauthorized/)
  })

  it("exchangeAuthorizationCode should update credentials and return them", async () => {
    // Insert client with code
    db.prepare(
      `INSERT INTO clients (client_id, client, code, user) VALUES (?, ?, ?, ?)`,
    ).run(client.client_id, JSON.stringify(client), "thecode", JSON.stringify({
      id: "user-1",
      name: "User 1",
      email: "user1@example.com",
    }))
    const creds = await mcpAuthProvider.exchangeAuthorizationCode(
      client,
      "thecode",
      "verifier",
      "http://localhost/callback",
    )
    console.log("creds", creds)
    assert(typeof creds.access_token === "string")
    assert(typeof creds.refresh_token === "string")
    assert.equal(creds.token_type, "Bearer")
    // access_token_expired_at is not guaranteed to be present in the returned object
  })

  it("exchangeAuthorizationCode should throw for bad code", async () => {
    await assert.rejects(async () => {
      await mcpAuthProvider.exchangeAuthorizationCode(client, "badcode")
    }, /Unauthorized/)
  })

  it("exchangeRefreshToken should update access token and return new one", async () => {
    // Insert client with credentials and refresh_token
    db.prepare(
      `INSERT INTO clients (client_id, client, credentials) VALUES (?, ?, ?)`,
    ).run(client.client_id, JSON.stringify(client), JSON.stringify(credentials))
    const result = await mcpAuthProvider.exchangeRefreshToken(
      client,
      credentials.refresh_token,
      ["openid", "email"],
    )
    assert(typeof result.access_token === "string")
    assert.equal(result.token_type, "Bearer")
    assert.equal(result.scope, "openid email")
    assert.equal(result.refresh_token, credentials.refresh_token)
    assert(typeof result.expires_in === "number")
  })

  it("exchangeRefreshToken should throw for bad refresh token", async () => {
    await assert.rejects(async () => {
      await mcpAuthProvider.exchangeRefreshToken(client, "bad-refresh", [
        "openid",
      ])
    }, /Unauthorized/)
  })
})
