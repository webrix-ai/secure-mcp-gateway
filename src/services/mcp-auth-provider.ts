import type { Response } from "express"
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js"
import crypto from "node:crypto"
import { envVars } from "../libs/config.js"
import {
  createClient,
  getByAccessToken,
  updateCodes,
  getByCode,
  getByClientId,
  getByRefreshToken,
  updateCredentials,
} from "../services/db.js"
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js"

export const mcpAuthProvider: OAuthServerProvider = {
  clientsStore: {
    getClient: async (client_id) => {
      console.log("getClient called with", { client_id })
      const client = getByClientId(client_id)
      if (!client) {
        throw new Error("Unauthorized: Invalid client ID")
      }

      return client.client as OAuthClientInformationFull
    },
    registerClient: async (client) => {
      console.log("registerClient called with", { client })
      createClient({ client })
      return client
    },
  },
  verifyAccessToken: async (token) => {
    console.log("verifyAccessToken called with", { token })
    const client = getByAccessToken(token)
    if (!client) {
      throw new Error("Unauthorized")
    }

    return {
      token,
      clientId: client.client_id,
      scopes: ["openid", "email", "profile"],
      expiresAt: client.credentials!.access_token_expired_at,
    }
  },
  authorize: async (
    client: OAuthClientInformationFull,
    params: {
      codeChallenge: string
      redirectUri: string
      state: string
    },
    res: Response,
  ) => {
    console.log("authorize called with", { client, params })

    const code = crypto.randomBytes(32).toString("hex")
    if (params.codeChallenge) {
      updateCodes({
        client_id: client.client_id,
        code,
        code_challenge: params.codeChallenge,
      })
    }
    const redirectUrl = new URL(params.redirectUri)
    redirectUrl.searchParams.set("code", code)
    if (params.state) {
      redirectUrl.searchParams.set("state", params.state)
    }
    const callbackUrl = `${envVars.BASE_URL}/authorized?code=${code}&clientId=${client.client_id}&callbackUrl=${encodeURIComponent(
      redirectUrl.toString(),
    )}`
    res.redirect(
      `${envVars.BASE_URL}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    )
  },
  challengeForAuthorizationCode: async (
    oauthClient: OAuthClientInformationFull,
    authorizationCode: string,
  ) => {
    console.log("challengeForAuthorizationCode called with", {
      oauthClient,
      authorizationCode,
    })
    const client = getByCode(oauthClient.client_id, authorizationCode)
    if (!client) {
      throw new Error("Unauthorized: Invalid authorization code")
    }
    return client.code_challenge || ""
  },
  exchangeAuthorizationCode: async (
    oauthClient: OAuthClientInformationFull,
    authorizationCode: string,
    codeVerifier?: string,
    redirectUri?: string,
  ) => {
    console.log("exchangeAuthorizationCode called with", {
      oauthClient,
      authorizationCode,
      codeVerifier,
      redirectUri,
    })

    const client = getByCode(oauthClient.client_id, authorizationCode)
    if (!client) {
      throw new Error("Unauthorized: Invalid authorization code")
    }

    if (!client.user) {
      throw new Error("Unauthorized: User not found")
    }

    const refreshToken = crypto.randomBytes(32).toString("hex")
    const accessToken = crypto.randomBytes(32).toString("hex")
    const accessTokenExpiredAt = Date.now() + envVars.TOKEN_EXPIRATION_TIME

    const credentials = {
      access_token: accessToken,
      token_type: "Bearer" as const,
      access_token_expired_at: accessTokenExpiredAt,
      scope: "openid email profile",
      refresh_token: refreshToken,
    }

    updateCredentials({
      client_id: oauthClient.client_id,
      credentials,
    })

    return credentials
  },
  skipLocalPkceValidation: true,
  exchangeRefreshToken: async (
    oauthClient: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
  ) => {
    console.log("exchangeRefreshToken called with", {
      oauthClient,
      refreshToken,
      scopes,
    })
    const client = getByRefreshToken(refreshToken)
    if (!client) {
      throw new Error("Unauthorized: Invalid refresh token")
    }
    const accessToken = crypto.randomBytes(32).toString("hex")
    const accessTokenExpiredAt = Date.now() + envVars.TOKEN_EXPIRATION_TIME
    updateCredentials({
      client_id: client.client_id,
      credentials: {
        ...client.credentials!,
        access_token: accessToken,
        access_token_expired_at: accessTokenExpiredAt,
      },
    })
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: envVars.TOKEN_EXPIRATION_TIME,
      scope: scopes?.join(" ") || "openid email profile",
      refresh_token: refreshToken,
    }
  },
}
