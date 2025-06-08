import express from "express"
import { ExpressAuth } from "@auth/express"
import Google from "@auth/express/providers/google"
import dotenv from "dotenv"
dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())

app.use("/auth", ExpressAuth({ providers: [Google] }))

app.get("/", (_req, res) => {
  res.send("Hello from Express + TypeScript!")
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
