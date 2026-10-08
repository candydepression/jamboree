import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getUser } from "./store";
import type { User } from "./types";

/**
 * Prototype sign-in: a cookie holding a demo user's id, picked from the
 * header. Real accounts (email or Google sign-in) replace this later.
 */
export const VIEWER_COOKIE = "jb_viewer";

export async function getViewer(): Promise<User | null> {
  return getUser((await cookies()).get(VIEWER_COOKIE)?.value);
}

/**
 * The current instant, read at request time. Jams are listed relative to
 * now, so these pages are never prerendered with a stale clock.
 */
export async function currentTime(): Promise<number> {
  await connection();
  return Date.now();
}
