export const getAuthProviderName = () => {
  return process.env.AUTH_PROVIDER?.toLowerCase() || "google"
}

export const getAuthProvider = async () => {
  const provider = getAuthProviderName()
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
