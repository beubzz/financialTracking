import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthenticatedRequest = Request & { userId?: string };

/**
 * Validates the bearer token and attaches its subject to the request.
 *
 * @param request The incoming Express request.
 * @param response The Express response used for authentication errors.
 * @param next The middleware callback invoked after successful validation.
 * @returns The next middleware result or an HTTP 401 response.
 */
export function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return response.status(401).json({ error: "Authentication required" });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload !== "object" || !payload.sub)
      throw new Error("Invalid token");
    request.userId = payload.sub;
    return next();
  } catch {
    return response.status(401).json({ error: "Invalid or expired token" });
  }
}
