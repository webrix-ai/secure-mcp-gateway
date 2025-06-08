import { getSession } from "@auth/express"
import { NextFunction, Request, Response } from "express"
import { getAuthProvider } from "./libs/auth"

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
