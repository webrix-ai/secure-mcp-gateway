import { getSession } from "@auth/express"
import type { NextFunction, Request, Response } from "express"
import { getAuthProvider } from "./auth.js"

export async function authSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.session = await getSession(req, {
    basePath: "/auth",
    providers: [await getAuthProvider()],
  })
  next()
}
