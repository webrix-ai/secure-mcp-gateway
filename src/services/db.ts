import { DatabaseSync } from "node:sqlite"
import path from "path"

const db = new DatabaseSync(path.resolve(process.env.DB_PATH || "./mcp.sqlite"))

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    user_access_key TEXT NOT NULL,
    token TEXT NOT NULL,
    token_expired_at INTEGER NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    access_token_expired_at INTEGER
  )
`)

export function upsertUser({
  email,
  user_access_key,
  token,
  token_expired_at,
}: {
  email: string
  user_access_key: string
  token: string
  token_expired_at: number
}) {
  db.prepare(
    `INSERT INTO users (email, user_access_key, token, token_expired_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       user_access_key=excluded.user_access_key,
       token=excluded.token,
       token_expired_at=excluded.token_expired_at`,
  ).run(email, user_access_key, token, token_expired_at)
}

export function updateOAuthTokensByCode({
  user_access_key,
  token,
  access_token,
  access_token_expired_at,
  refresh_token,
}: {
  user_access_key: string
  token: string
  access_token: string
  access_token_expired_at: number
  refresh_token: string
}) {
  db.prepare(
    `UPDATE users SET access_token = ?, access_token_expired_at = ?, refresh_token = ? WHERE user_access_key = ? AND token = ?`,
  ).run(
    access_token,
    access_token_expired_at,
    refresh_token,
    user_access_key,
    token,
  )
}
export function updateOAuthTokensByRefreshToken({
  user_access_key,
  access_token,
  access_token_expired_at,
  refresh_token,
}: {
  user_access_key: string
  access_token: string
  access_token_expired_at: number
  refresh_token: string
}) {
  db.prepare(
    `UPDATE users SET access_token = ?, access_token_expired_at = ? WHERE user_access_key = ? AND refresh_token = ?`,
  ).run(access_token, access_token_expired_at, user_access_key, refresh_token)
}

export function getUserByEmail(email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email)
}

export function getUserByTokens(user_access_key: string, token: string) {
  return db
    .prepare("SELECT * FROM users WHERE user_access_key = ? AND token = ?")
    .get(user_access_key, token)
}

export function getUserByAccessToken(access_token: string) {
  return db.prepare("SELECT * FROM users WHERE access_token = ?").get(access_token)
}
