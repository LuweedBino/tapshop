import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { env } from "./env";

const COOKIE = "tapshop_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function key() {
  if (env.authSecret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return new TextEncoder().encode(env.authSecret);
}

export async function createSession(creatorId: string) {
  const token = await new SignJWT({ sub: creatorId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCreator() {
  const id = await verifySessionToken((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  return db.creator.findUnique({ where: { id } });
}

export async function requireCreator() {
  const creator = await getCreator();
  if (!creator) redirect("/login");
  return creator;
}

export const SESSION_COOKIE = COOKIE;
