import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cancelRsvp, decideRequest, postMessage, requestToJoin, rsvpGoing } from "@/app/actions";
import { JamMap } from "@/components/LazyMaps";
import OpennessBadge from "@/components/OpennessBadge";
import { currentTime, getViewer } from "@/lib/session";
import { getJam, getRsvp, getRsvps, getUser, listMessages } from "@/lib/store";
import { WEEKDAY_NAMES, formatDay, formatTime, localParts, localToUtc } from "@/lib/time";
import type { Jam, Rsvp } from "@/lib/types";
import { canSeeAddress, isOver, toJamView } from "@/lib/views";

export default function JamPage({ params }: PageProps<"/jams/[id]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading jam…</p>}>
      <JamDetails params={params} />
    </Suspense>
  );
}

function scheduleText(jam: Jam, now: number): string {
  const s = jam.schedule;
  if (s.kind === "once") return `${formatDay(s.start, now)}, ${formatTime(s.start)}`;
  const p = localParts(now);
  const [h, m] = s.time.split(":").map(Number);
  return `Every ${WEEKDAY_NAMES[s.weekday]}, ${formatTime(localToUtc(p.year, p.month, p.day, h, m))}`;
}

const button = "rounded-md px-3 py-1.5 text-sm font-medium";

async function JamDetails({ params }: { params: PageProps<"/jams/[id]">["params"] }) {
  const { id } = await params;
  const jam = getJam(id);
  if (!jam) notFound();

  const viewer = await getViewer();
  const now = await currentTime();
  const myRsvp = viewer ? getRsvp(jam.id, viewer.id) : null;
  const view = toJamView(jam, viewer?.id ?? null, myRsvp, now);
  const isHost = viewer?.id === jam.hostId;
  const letIn = canSeeAddress(jam, viewer?.id ?? null, myRsvp, now);
  const host = getUser(jam.hostId);
  const voucher = getUser(host?.invitedBy);
  const rsvps = getRsvps(jam.id);
  const coming = rsvps.filter((r) => r.status === "going" || r.status === "approved");
  const requests = rsvps.filter((r) => r.status === "requested");
  const full = jam.capacity !== null && coming.length >= jam.capacity;
  const over = isOver(jam, now);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Link href="/" className="text-sm text-stone-500 hover:underline">
          ← This week
        </Link>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <OpennessBadge openness={jam.openness} />
            {jam.genres.map((g) => (
              <span key={g} className="rounded-full bg-stone-200 px-2 py-0.5 text-xs">
                {g}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-bold">{jam.title}</h1>
          <p className="text-lg text-stone-700">
            {scheduleText(jam, now)} · {jam.placeName}
          </p>
          <p className="text-sm text-stone-500">
            Hosted by {host?.name ?? "someone"}
            {host?.founder ? " (founding member)" : voucher ? ` · invited by ${voucher.name}` : ""}
          </p>
        </div>

        {over && <p className="rounded-lg bg-stone-200 p-3 text-sm">This jam is over. The address is no longer shared with guests.</p>}

        <div className="h-72 overflow-hidden rounded-xl border border-stone-200">
          <JamMap jams={[{ id: jam.id, title: jam.title, when: scheduleText(jam, now), where: view.where }]} center={[view.where.lat, view.where.lng]} zoom={view.where.kind === "exact" ? 15 : 13} />
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          {view.where.kind === "exact" ? (
            <p>
              <span className="font-semibold">Address:</span> {view.where.address}
            </p>
          ) : (
            <p className="text-stone-700">
              <span className="font-semibold">Exact spot is private.</span>{" "}
              {jam.openness === "rsvp" ? "RSVP and the address shows up here." : "The host shares the address with guests they approve."} The circle is a one-mile radius around it, deliberately off-center.
            </p>
          )}
        </div>

        <dl className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
          <Detail label="About">{jam.description || "—"}</Detail>
          <Detail label="Vibe">{jam.vibe}</Detail>
          <Detail label="Players wanted">{jam.instrumentsWanted.join(", ") || "Anyone"}</Detail>
          <Detail label="Provided">{jam.provided.join(", ") || "Bring your own"}</Detail>
          {jam.capacity !== null && <Detail label="Room for">{`${jam.capacity} people (${coming.length} coming)`}</Detail>}
        </dl>

        {(jam.openness === "public" || letIn) && <Chat jamId={jam.id} canPost={!!viewer && !over} />}
      </div>

      <aside className="space-y-4">
        <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          {over ? (
            <p className="text-stone-600">This jam has ended.</p>
          ) : !viewer ? (
            <p className="text-stone-600">Pick who you are under &ldquo;Viewing as&rdquo; at the top to RSVP.</p>
          ) : isHost ? (
            <p className="font-semibold">You&rsquo;re hosting this jam.</p>
          ) : (
            <GuestActions jam={jam} rsvp={myRsvp} full={full} />
          )}
        </div>

        {isHost && jam.openness === "approval" && (
          <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <h2 className="font-semibold">Requests to join</h2>
            {requests.length === 0 && <p className="text-sm text-stone-600">No requests waiting.</p>}
            {requests.map((r) => {
              const u = getUser(r.userId);
              return (
                <div key={r.userId} className="space-y-2 rounded-lg bg-white p-3">
                  <p className="font-medium">
                    {u?.name} <span className="font-normal text-stone-500">· {u?.instruments.join(", ")}</span>
                  </p>
                  {r.note && <p className="text-sm text-stone-600">&ldquo;{r.note}&rdquo;</p>}
                  <div className="flex gap-2">
                    <form action={decideRequest.bind(null, jam.id, r.userId, true)}>
                      <button className={`${button} bg-violet-600 text-white`}>Approve</button>
                    </form>
                    <form action={decideRequest.bind(null, jam.id, r.userId, false)}>
                      <button className={`${button} border border-stone-300`}>Decline</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Who&rsquo;s coming</h2>
          {coming.length === 0 ? (
            <p className="text-sm text-stone-600">Nobody yet.</p>
          ) : jam.openness === "public" || letIn ? (
            <ul className="space-y-1 text-sm">
              {coming.map((r) => {
                const u = getUser(r.userId);
                return (
                  <li key={r.userId}>
                    {u?.name} <span className="text-stone-500">· {u?.instruments.join(", ")}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-600">
              {coming.length} {coming.length === 1 ? "person" : "people"} going. Names are shared with guests.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function GuestActions({ jam, rsvp, full }: { jam: Jam; rsvp: Rsvp | null; full: boolean }) {
  const cancel = (
    <form action={cancelRsvp.bind(null, jam.id)}>
      <button className="text-sm text-stone-500 underline">Cancel</button>
    </form>
  );

  if (jam.openness !== "approval") {
    if (rsvp?.status === "going") {
      return (
        <>
          <p className="font-semibold text-emerald-700">You&rsquo;re going.</p>
          {cancel}
        </>
      );
    }
    if (full) return <p className="text-stone-600">This jam is full.</p>;
    return (
      <form action={rsvpGoing.bind(null, jam.id)} className="space-y-2">
        <button className={`${button} w-full bg-amber-500 text-white hover:bg-amber-600`}>I&rsquo;m going</button>
        {jam.openness === "rsvp" && <p className="text-xs text-stone-500">You&rsquo;ll see the address right after you RSVP.</p>}
      </form>
    );
  }

  switch (rsvp?.status) {
    case "approved":
      return (
        <>
          <p className="font-semibold text-emerald-700">You&rsquo;re in. The address and chat are unlocked.</p>
          {cancel}
        </>
      );
    case "requested":
      return (
        <>
          <p className="font-semibold">Request sent. Waiting for the host.</p>
          {cancel}
        </>
      );
    case "declined":
      return <p className="text-stone-600">The host can&rsquo;t fit you in this time.</p>;
    default:
      return full ? (
        <p className="text-stone-600">This jam is full.</p>
      ) : (
        <form action={requestToJoin.bind(null, jam.id)} className="space-y-2">
          <label className="block text-sm text-stone-600" htmlFor="note">
            Say hi to the host (what you play, who you know)
          </label>
          <textarea id="note" name="note" rows={3} maxLength={280} className="w-full rounded-md border border-stone-300 p-2 text-sm" />
          <button className={`${button} w-full bg-violet-600 text-white hover:bg-violet-700`}>Ask to join</button>
        </form>
      );
  }
}

function Chat({ jamId, canPost }: { jamId: string; canPost: boolean }) {
  const messages = listMessages(jamId);
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">Jam chat</h2>
      {messages.length === 0 && <p className="text-sm text-stone-600">No messages yet.</p>}
      <ul className="space-y-2">
        {messages.map((m) => (
          <li key={m.id} className="text-sm">
            <span className="font-medium">{getUser(m.userId)?.name}:</span> {m.text}
          </li>
        ))}
      </ul>
      {canPost && (
        <form action={postMessage.bind(null, jamId)} className="flex gap-2">
          <input name="text" required maxLength={500} placeholder="Bringing a bass amp, running late…" className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
          <button className={`${button} bg-stone-900 text-white`}>Send</button>
        </form>
      )}
    </div>
  );
}
