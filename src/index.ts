import express from "express"
import { ExpressAuth } from "@auth/express"
import dotenv from "dotenv"
import { authSession } from "./session"
import { getAuthProvider } from "./libs/auth"
dotenv.config()

const app = express()

app.use(express.json())

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

app.use("/auth", ExpressAuth({ providers: [await getAuthProvider()] }))

app.use(authSession)

app.get("/", (_req, res) => {
  const { session } = res.locals
  res.send({
    message: "Hello from MCP-S",
    session,
  })
})

export default app

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
  })
}
