import { envVars } from "./config.js"
import type { JWT } from "@auth/core/jwt"
import type { Session } from "@auth/core/types"
import type { Account, User, Profile } from "@auth/core/types"
import type { AdapterUser } from "@auth/core/adapters"
import type { Provider } from "@auth/core/providers"

export const getAuthConfig = async () => {
  return {
    providers: [await getAuthProvider()] as Provider[],
    callbacks: {
      jwt: async ({ token, account }: { 
        token: JWT; 
        user: User | AdapterUser; 
        account?: Account | null | undefined; 
        profile?: Profile | undefined; 
        trigger?: "signIn" | "signUp" | "update" | undefined; 
        isNewUser?: boolean | undefined; 
        session?: Session; 
      }) => {
        // Save the access token in the JWT token
        if (account?.access_token) {
          token.accessToken = account.access_token
        }
        return token
      },
      session: async ({ session, token }: { session: Session; token: JWT }) => {
        // Pass the access token to the session
        if (token.accessToken) {
          session.accessToken = token.accessToken as string
        }
        return session
      }
    }
  }
}

export const getAuthProvider = async (): Promise<Provider> => {
  const provider = envVars.AUTH_PROVIDER
  
  // Special handling for GitHub provider with custom configuration
  if (provider === "github") {
    try {
      const { default: GitHub } = await import("@auth/express/providers/github")
      return GitHub({
        clientId: envVars.AUTH_GITHUB_ID!,
        clientSecret: envVars.AUTH_GITHUB_SECRET!,
        authorization: {
          // Request the scopes you need. Add/remove as needed.
          params: { scope: envVars.AUTH_GITHUB_SCOPES },
        }
      })
    } catch (error) {
      console.error("Failed to configure GitHub provider:", error)
      throw error
    }
  }
  
  // Default dynamic provider loading for other providers
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
