import dotenv from "dotenv"

// Load environment variables from custom path or default .env
export function loadConfig(envFilePath?: string) {
  if (envFilePath) {
    // Override existing environment variables when loading custom env file
    dotenv.config({ path: envFilePath, override: true })
  } else {
    // Default behavior for .env file
    dotenv.config()
  }
}

// Call loadConfig without parameters for backward compatibility during module load
loadConfig()

// Function to get current environment variables
function getEnvVars() {
  return {
    AUTH_SECRET: process.env.AUTH_SECRET!,
    BASE_URL: process.env.BASE_URL || "http://localhost:3000",
    PORT: parseInt(process.env.PORT || "3000"),
    TOKEN_EXPIRATION_TIME: process.env.TOKEN_EXPIRATION_TIME
      ? parseInt(process.env.TOKEN_EXPIRATION_TIME)
      : 60 * 60 * 24,
    AUTH_PROVIDER: process.env.AUTH_PROVIDER?.toLowerCase() || "google",
    DB_PATH: process.env.DB_PATH || "./mcp.sqlite",
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_GITHUB_SCOPES: process.env.AUTH_GITHUB_SCOPES || "read:user,user:email",
  }
}

// Export envVars as a getter to always return current values
export const envVars = new Proxy({} as ReturnType<typeof getEnvVars>, {
  get(target, prop) {
    const currentVars = getEnvVars()
    return currentVars[prop as keyof typeof currentVars]
  },
})

// Function to reload env vars after loading custom config (for explicit reloading)
export function reloadEnvVars() {
  // Environment variables are automatically reloaded via the proxy
  return getEnvVars()
}

// Function to validate required environment variables
export function validateConfig() {
  if (!process.env.AUTH_SECRET) {
    console.error("❌ AUTH_SECRET is not set")
    console.warn("⚠️  Please set AUTH_SECRET environment variable.")
    console.warn("⚠️  Generate one with: openssl rand -base64 33\n")
  }
}
