import Link from "next/link";
import { Suspense } from "react";
import { JamMap } from "@/components/LazyMaps";
import OpennessBadge from "@/components/OpennessBadge";
import { currentTime, getViewer } from "@/lib/session";
import { getRsvp, listJams } from "@/lib/store";
import { addLocalDays, dayKey, formatDay, formatTime } from "@/lib/time";
import { occurrences, toJamView, type JamView } from "@/lib/views";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Finding jams…</p>}>
      <ThisWeek searchParams={searchParams} />
    </Suspense>
  );
}

type Row = { jam: JamView; start: number };

async function ThisWeek({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const when = params.when === "tonight" ? "tonight" : "week";
  const genre = typeof params.genre === "string" ? params.genre : "";
  const plays = typeof params.plays === "string" ? params.plays.trim().toLowerCase() : "";

  const viewer = await getViewer();
  const now = await currentTime();
  const until = addLocalDays(now, when === "tonight" ? 1 : 7);
  const allJams = listJams();
  const genres = [...new Set(allJams.flatMap((j) => j.genres))].sort();

  const rows: Row[] = [];
  for (const jam of allJams) {
    if (genre && !jam.genres.includes(genre)) continue;
    if (plays && !jam.instrumentsWanted.some((i) => i === "anything" || i.toLowerCase().includes(plays))) continue;
    const view = toJamView(jam, viewer?.id ?? null, viewer ? getRsvp(jam.id, viewer.id) : null, now);
    for (const start of occurrences(jam, now, until)) rows.push({ jam: view, start });
  }
  rows.sort((a, b) => a.start - b.start);

  const byDay = new Map<string, Row[]>();
  for (const row of rows) {
    const key = dayKey(row.start);
    byDay.set(key, [...(byDay.get(key) ?? []), row]);
  }

  // One map shape per jam, even if it repeats within the window.
  const mapJams = [...new Map(rows.map((r) => [r.jam.id, r])).values()].map(({ jam, start }) => ({
    id: jam.id,
    title: jam.title,
    when: `${formatDay(start, now)}, ${formatTime(start)}`,
    where: jam.where,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{when === "tonight" ? "Jams tonight" : "Jams this week"} in Seattle</h1>
        <p className="text-stone-600">Anyone can come by public jams. Home and garage jams show a one-mile circle until the host lets you in.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-stone-500">When</span>
          <select name="when" defaultValue={when} className="rounded-md border border-stone-300 px-2 py-1.5">
            <option value="week">Next 7 days</option>
            <option value="tonight">Tonight</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-stone-500">Genre</span>
          <select name="genre" defaultValue={genre} className="rounded-md border border-stone-300 px-2 py-1.5">
            <option value="">Any genre</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-stone-500">I play</span>
          <input name="plays" defaultValue={plays} placeholder="e.g. bass" className="w-36 rounded-md border border-stone-300 px-2 py-1.5" />
        </label>
        <button className="rounded-md bg-stone-900 px-3 py-1.5 font-medium text-white">Show jams</button>
        {(genre || plays || when === "tonight") && (
          <Link href="/" className="py-1.5 text-stone-500 underline">
            Clear
          </Link>
        )}
      </form>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="h-[420px] overflow-hidden rounded-xl border border-stone-200 lg:sticky lg:top-4">
          <JamMap jams={mapJams} />
        </div>
        <div className="space-y-5">
          {rows.length === 0 && (
            <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
              No jams match yet. <Link href="/post" className="underline">Post one</Link> and see who shows up.
            </p>
          )}
          {[...byDay.values()].map((dayRows) => (
            <section key={dayKey(dayRows[0].start)}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">{formatDay(dayRows[0].start, now)}</h2>
              <ul className="space-y-2">
                {dayRows.map(({ jam, start }) => (
                  <li key={`${jam.id}-${start}`}>
                    <Link href={`/jams/${jam.id}`} className="block rounded-xl border border-stone-200 bg-white p-3 hover:border-amber-400">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{jam.title}</p>
                          <p className="text-sm text-stone-600">
                            {formatTime(start)} · {jam.placeName}
                          </p>
                        </div>
                        <OpennessBadge openness={jam.openness} />
                      </div>
                      <p className="mt-1 text-sm text-stone-500">
                        {jam.genres.join(", ")}
                        {jam.instrumentsWanted.length > 0 && <> · wanted: {jam.instrumentsWanted.join(", ")}</>}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
