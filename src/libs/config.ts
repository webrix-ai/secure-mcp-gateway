import dotenv from "dotenv"
dotenv.config()

export const envVars = {
  AUTH_SECRET: process.env.AUTH_SECRET!,
  BASE_URL: process.env.BASE_URL || "http://localhost:3000",
  PORT: process.env.PORT || 3000,
  TOKEN_EXPIRATION_TIME: process.env.TOKEN_EXPIRATION_TIME
    ? parseInt(process.env.TOKEN_EXPIRATION_TIME)
    : 60 * 60 * 24,
  AUTH_PROVIDER: process.env.AUTH_PROVIDER?.toLowerCase() || "google",
  DB_PATH: process.env.DB_PATH || "./mcp.sqlite",
}

if (!process.env.AUTH_SECRET) {
  // add here emoji of x and say that the AUTH_SECRET is not set
  console.error("❌ AUTH_SECRET is not set")
  console.warn("⚠️  Please set AUTH_SECRET environment variable.")
  console.warn("⚠️  Generate one with: openssl rand -base64 33\n")
}
