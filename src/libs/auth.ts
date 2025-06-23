import { envVars } from "./config.js"

export const getAuthProvider = async () => {
  const provider = envVars.AUTH_PROVIDER
  try {
    const module = await import(`@auth/express/providers/${provider}`)
    return module.default
  } catch (error) {
    console.error(
      `Provider ${provider} not found, using default google provider`,
      error,
    )
    const googleModule = await import("@auth/express/providers/google")
    return googleModule.default
  }
}
