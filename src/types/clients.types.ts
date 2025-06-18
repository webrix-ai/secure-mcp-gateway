import type { DefaultUser } from "@auth/core/types"

export interface ClientInfo {
  client_id: string
  client_name?: string
  redirect_uris?: string[]
  token_endpoint_auth_method?: string
  grant_types?: string[]
  response_types?: string[]
  client_id_issued_at?: number
  client_secret_expires_at?: number
}

export type User = DefaultUser;

export interface Credentials {
    access_token: string,
    token_type: "Bearer",
    access_token_expired_at: number,
    scope: string,
    refresh_token: string,
}

export interface Client {
  client_id: string
  client: ClientInfo
  code?: string
  code_challenge?: string
  user?: User
  credentials?: Credentials
}