import express from "express"
import { ExpressAuth } from "@auth/express"
import Google from "@auth/express/providers/google"
import dotenv from "dotenv"
dotenv.config()

const app = express()

app.use(express.json())

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" })
})

app.use("/auth", ExpressAuth({ providers: [Google] }))

app.get("/", (_req, res) => {
  res.send("Hello from Express + TypeScript!")
})

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
  })
}
