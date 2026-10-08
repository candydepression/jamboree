"use client";

import { useActionState, useState } from "react";
import { postJam, type PostJamState } from "@/app/actions";
import type { Openness } from "@/lib/types";
import { OPENNESS_HINT, OPENNESS_LABEL } from "@/lib/views";
import { LocationPicker } from "./LazyMaps";

const field = "w-full rounded-md border border-stone-300 px-3 py-2";

export default function PostJamForm() {
  const [state, action, pending] = useActionState<PostJamState, FormData>(postJam, { error: null });
  const [openness, setOpenness] = useState<Openness>("approval");

  return (
    <form action={action} className="space-y-5 rounded-xl border border-stone-200 bg-white p-5">
      <Field label="Name of the jam">
        <input name="title" required placeholder="Saturday garage funk" className={field} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date">
          <input type="date" name="date" required className={field} />
        </Field>
        <Field label="Starts">
          <input type="time" name="time" required defaultValue="19:00" className={field} />
        </Field>
        <Field label="Repeats">
          <select name="repeat" className={field}>
            <option value="once">Just this once</option>
            <option value="weekly">Every week</option>
          </select>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">How open is it?</legend>
        {(["public", "rsvp", "approval"] as const).map((o) => (
          <label key={o} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${openness === o ? "border-amber-500 bg-amber-50" : "border-stone-200"}`}>
            <input type="radio" name="openness" value={o} checked={openness === o} onChange={() => setOpenness(o)} />
            <span>
              <span className="font-medium">{OPENNESS_LABEL[o]}</span>
              <span className="block text-sm text-stone-600">{OPENNESS_HINT[o]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Place name (shown to everyone)">
          <input name="placeName" required placeholder={openness === "public" ? "The Blue Lantern" : "A garage in Georgetown"} className={field} />
        </Field>
        <Field label={openness === "public" ? "Address" : "Address (only guests you let in)"}>
          <input name="address" required className={field} />
        </Field>
      </div>

      <LocationPicker />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Genres (comma separated)">
          <input name="genres" placeholder="funk, soul" className={field} />
        </Field>
        <Field label="Players wanted">
          <input name="instrumentsWanted" placeholder="bass, keys" className={field} />
        </Field>
        <Field label="What's provided">
          <input name="provided" placeholder="drums, amps, PA" className={field} />
        </Field>
        <Field label="Vibe">
          <select name="vibe" className={field}>
            <option>All levels</option>
            <option>Experienced</option>
            <option>Listeners welcome</option>
          </select>
        </Field>
        <Field label="Max people (optional)">
          <input type="number" name="capacity" min={1} className={field} />
        </Field>
      </div>

      <Field label="Anything else?">
        <textarea name="description" rows={3} placeholder="Long grooves, no charts. Come in through the side gate." className={field} />
      </Field>

      {state.error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-md bg-amber-500 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
        {pending ? "Posting…" : "Post jam"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
