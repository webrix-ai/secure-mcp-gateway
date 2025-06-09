import { createHmac } from "crypto"

export const signTokens = ({
  userAccessKey,
  token,
}: {
  userAccessKey: string
  token: string
}) => {
  const hmac = createHmac("sha256", process.env.AUTH_SECRET!)
  hmac.update(`${userAccessKey}:${token}`)
  const signature = hmac.digest("base64url")

  return encodeURIComponent(
    Buffer.from(JSON.stringify({ userAccessKey, token, signature })).toString(
      "base64",
    ),
  )
}
