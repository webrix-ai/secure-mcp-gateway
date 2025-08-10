import type { DefaultSession } from "@auth/core/types"

// Extend the default session to include access token
declare module "@auth/core/types" {
  interface Session extends DefaultSession {
    accessToken?: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string
  }
}
