"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VIEWER_COOKIE, getViewer } from "@/lib/session";
import { addMessage, createJam, getJam, getRsvp, getRsvps, getUser, removeRsvp, setRsvp } from "@/lib/store";
import type { Openness, Schedule } from "@/lib/types";
import { canPost, canSeeAddress } from "@/lib/views";
import { localParts, localToUtc } from "@/lib/time";

export async function switchViewer(formData: FormData) {
  const id = String(formData.get("userId") ?? "");
  const jar = await cookies();
  if (getUser(id)) jar.set(VIEWER_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  else jar.delete(VIEWER_COOKIE);
  refresh();
}

async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Sign in first.");
  return viewer;
}

/** RSVP to a public jam, or to an "RSVP to see address" jam while there's room. */
export async function rsvpGoing(jamId: string) {
  const viewer = await requireViewer();
  const jam = getJam(jamId);
  if (!jam || jam.openness === "approval" || jam.hostId === viewer.id) return;
  if (jam.capacity !== null && !getRsvp(jamId, viewer.id)) {
    const taken = getRsvps(jamId).filter((r) => r.status === "going" || r.status === "approved").length;
    if (taken >= jam.capacity) return;
  }
  setRsvp(jamId, viewer.id, "going");
  refresh();
}

export async function requestToJoin(jamId: string, formData: FormData) {
  const viewer = await requireViewer();
  const jam = getJam(jamId);
  if (!jam || jam.openness !== "approval" || jam.hostId === viewer.id) return;
  const existing = getRsvp(jamId, viewer.id);
  if (existing?.status === "approved" || existing?.status === "declined") return;
  setRsvp(jamId, viewer.id, "requested", String(formData.get("note") ?? "").slice(0, 280));
  refresh();
}

export async function cancelRsvp(jamId: string) {
  const viewer = await requireViewer();
  if (getRsvp(jamId, viewer.id)?.status === "declined") return;
  removeRsvp(jamId, viewer.id);
  refresh();
}

/** Host approves or declines a request to join. */
export async function decideRequest(jamId: string, userId: string, approve: boolean) {
  const viewer = await requireViewer();
  const jam = getJam(jamId);
  if (!jam || jam.hostId !== viewer.id || !getRsvp(jamId, userId)) return;
  setRsvp(jamId, userId, approve ? "approved" : "declined");
  refresh();
}

export async function postMessage(jamId: string, formData: FormData) {
  const viewer = await requireViewer();
  const jam = getJam(jamId);
  const text = String(formData.get("text") ?? "").trim().slice(0, 500);
  if (!jam || !text) return;
  // On private jams the chat is for people who've been let in.
  if (jam.openness !== "public" && !canSeeAddress(jam, viewer.id, getRsvp(jamId, viewer.id), Date.now())) return;
  addMessage(jamId, viewer.id, text);
  refresh();
}

const OPENNESS: Openness[] = ["public", "rsvp", "approval"];

function list(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export type PostJamState = { error: string | null };

export async function postJam(_prev: PostJamState, formData: FormData): Promise<PostJamState> {
  const viewer = await getViewer();
  if (!canPost(viewer)) return { error: "Posting needs an invite from a member during the beta." };

  const title = String(formData.get("title") ?? "").trim();
  const placeName = String(formData.get("placeName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const openness = String(formData.get("openness")) as Openness;
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const repeat = formData.get("repeat") === "weekly";
  const capacity = Number(formData.get("capacity")) || null;

  if (!title) return { error: "Give the jam a name." };
  if (!placeName || !address) return { error: "Add a place name and an address." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return { error: "Tap the map to place the jam." };
  if (!OPENNESS.includes(openness)) return { error: "Choose how open the jam is." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Pick a date and a start time." };

  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const start = localToUtc(y, m, d, hh, mm);
  const schedule: Schedule = repeat ? { kind: "weekly", weekday: localParts(start).weekday, time } : { kind: "once", start };

  const jam = createJam({
    title,
    hostId: viewer!.id,
    genres: list(formData.get("genres")).map((g) => g.toLowerCase()),
    description: String(formData.get("description") ?? "").trim(),
    instrumentsWanted: list(formData.get("instrumentsWanted")),
    provided: list(formData.get("provided")),
    vibe: String(formData.get("vibe") ?? "All levels"),
    openness,
    placeName,
    address,
    location: { lat, lng },
    schedule,
    durationMins: 180,
    capacity,
  });
  redirect(`/jams/${jam.id}`);
}
