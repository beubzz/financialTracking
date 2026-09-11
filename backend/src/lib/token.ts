import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * Creates a signed session token for an authenticated user.
 *
 * @param userId The identifier stored in the token subject.
 * @returns A JWT valid for seven days.
 */
export function tokenFor(userId: string) {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: "7d" });
}

/**
 * Generates the raw token sent to a user by email.
 *
 * @returns A cryptographically secure hexadecimal token.
 */
export function rawToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a raw action token before it is persisted.
 *
 * @param token The raw token received from a request or generated for email.
 * @returns The SHA-256 hexadecimal digest.
 */
export function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
