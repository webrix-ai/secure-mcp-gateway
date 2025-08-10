import Database from "better-sqlite3"
import path from "path"
import type {
  Client,
  ClientInfo,
  Credentials,
  User,
} from "../types/clients.types.ts"
import { envVars } from "../libs/config.js"

const db = new Database(path.resolve(envVars.DB_PATH))

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    client_id TEXT PRIMARY KEY,
    client JSON NOT NULL,
    code TEXT,
    code_challenge TEXT,
    user JSON,
    credentials JSON
  )
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_clients_credentials_access_token 
  ON clients (JSON_EXTRACT(credentials, '$.access_token'))
`)

interface RawClient {
  client_id: string
  client: string
  code?: string
  code_challenge?: string
  user?: string
  credentials?: string
}

function parseClient(client: RawClient): Client {
  return {
    client_id: client.client_id,
    client: JSON.parse(client.client) as ClientInfo,
    code: client.code,
    code_challenge: client.code_challenge,
    user: client.user ? (JSON.parse(client.user) as User) : undefined,
    credentials: client.credentials
      ? (JSON.parse(client.credentials) as Credentials)
      : undefined,
  }
}

export function createClient({ client }: { client: ClientInfo }) {
  db.prepare(
    `INSERT INTO clients (client_id, client)
     VALUES (?, ?)`,
  ).run(client.client_id || crypto.randomUUID(), JSON.stringify(client))
}

export function getByClientId(client_id: string): Client | null {
  const result = db
    .prepare("SELECT * FROM clients WHERE client_id = ?")
    .get(client_id) as RawClient | undefined
  if (!result) {
    return null
  }
  return parseClient(result)
}

export function getByAccessToken(access_token: string): Client | null {
  const clientInfo = db
    .prepare(
      "SELECT * FROM clients WHERE JSON_EXTRACT(credentials, '$.access_token') = ?",
    )
    .get(access_token) as RawClient | undefined
  if (!clientInfo) {
    return null
  }
  return parseClient(clientInfo)
}

export function updateCodes({
  client_id,
  code,
  code_challenge,
}: {
  client_id: string
  code: string
  code_challenge: string
}) {
  db.prepare(
    `UPDATE clients SET code = ?, code_challenge = ? WHERE client_id = ?`,
  ).run(code, code_challenge, client_id)
}

export function getByCode(client_id: string, code: string): Client | null {
  const clientInfo = db
    .prepare("SELECT * FROM clients WHERE client_id = ? AND code = ?")
    .get(client_id, code) as RawClient | undefined
  if (!clientInfo) {
    return null
  }
  return parseClient(clientInfo)
}

export function updateUser({
  client_id,
  code,
  user,
}: {
  client_id: string
  code: string
  user: User
}) {
  db.prepare(
    `UPDATE clients SET user = ? WHERE client_id = ? AND code = ?`,
  ).run(JSON.stringify(user), client_id, code)
}

// LEGACY to support npx @mcp-s/mcp
export function createUser({
  client_id,
  access_token,
  user,
}: {
  client_id: string
  access_token: string
  user: User
}) {
  const credentials = {
    access_token,
    access_token_expired_at: Date.now() + envVars.TOKEN_EXPIRATION_TIME,
  }
  const clientInfo: ClientInfo = {
    client_id,
  }
  db.prepare(
    `INSERT INTO clients (client_id, client, credentials, user) VALUES (?, ?, ?, ?)`,
  ).run(
    client_id,
    JSON.stringify(clientInfo),
    JSON.stringify(credentials),
    JSON.stringify(user),
  )
}

export function getByRefreshToken(refresh_token: string): Client | null {
  const clientInfo = db
    .prepare(
      "SELECT * FROM clients WHERE JSON_EXTRACT(credentials, '$.refresh_token') = ?",
    )
    .get(refresh_token) as RawClient | undefined
  if (!clientInfo) {
    return null
  }
  return parseClient(clientInfo)
}

export function updateCredentials({
  client_id,
  credentials,
}: {
  client_id: string
  credentials: Credentials
}) {
  db.prepare(`UPDATE clients SET credentials = ? WHERE client_id = ?`).run(
    JSON.stringify(credentials),
    client_id,
  )
}

// Get OAuth access token (e.g., GitHub token) by MCP access token
export function getOAuthAccessTokenByMcpToken(mcp_access_token: string): string | null {
  const client = getByAccessToken(mcp_access_token)
  return client?.user?.oauthAccessToken || null
}
