import { DatabaseSync } from "node:sqlite"
import path from "path"

const db = new DatabaseSync(path.resolve(process.env.DB_PATH || "./mcp.sqlite"))

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    user_access_key TEXT NOT NULL,
    token TEXT NOT NULL,
    token_expired_at INTEGER NOT NULL
  )
`)

export function upsertUser({ email, user_access_key, token, token_expired_at }: {
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
       token_expired_at=excluded.token_expired_at`
  ).run(email, user_access_key, token, token_expired_at)
}

export function getUserByEmail(email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email)
}

export function getUserByTokens(user_access_key: string, token: string) {
  return db.prepare("SELECT * FROM users WHERE user_access_key = ? AND token = ?").get(user_access_key, token)
}

