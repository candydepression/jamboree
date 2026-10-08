# Jamboree

*Where musicians find each other.*

Find a jam tonight, or open your door to one. Jamboree is a map of open jams happening in the next week, for any genre, from bar jazz jams to garage funk to noise circles in someone's basement. Anyone can browse and RSVP. Home hosts can post a jam without telling the whole internet where they live.

This is the first prototype. It runs on demo data held in memory, so everything resets when the server restarts.

## What works

- **This week.** A map and list of every jam in the next 7 days, with filters for tonight, genre and the instrument you play.
- **Three levels of openness.**
  - *Public*: exact pin and address for everyone (venues, parks).
  - *RSVP to see address*: the map shows a one-mile circle, and the address unlocks when you RSVP.
  - *Approval needed*: the map shows a one-mile circle, and only guests the host approves get the address.
- **Private locations stay private.** The circle is centered 20–70% of a mile away from the real spot in a random direction, so the house is inside it but never in the middle. The address and real coordinates are never sent to a browser that hasn't been let in, and guests lose the address once a one-off jam is over.
- **Ask to join.** Guests send a short note; hosts approve or decline from the jam page.
- **Jam chat.** A message board on each jam, open to approved guests only on private jams.
- **Invite to post.** During the beta, everyone can browse and RSVP, but posting needs an invite from a member. The host's page shows who invited them.
- **Post a jam.** One-off or weekly, with a tap on the map to place it.

Sign-in is faked for now: use the "Viewing as" menu at the top to switch between demo people (Mo hosts the garage jam, Jules has asked to join it, Jules has no invite so can't post).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm test       # privacy and scheduling rules
npm run lint
npm run build
```

## How it's put together

- [Next.js](https://nextjs.org) 16 (App Router, Server Actions) with Tailwind CSS.
- Maps: [Leaflet](https://leafletjs.com) with OpenStreetMap tiles.
- `src/lib/store.ts` is the only code that touches data. Swapping it for a real database (Supabase is the plan) leaves the pages alone.
- `src/lib/views.ts` decides what each viewer may see. Pages only receive a `JamView`, which never carries a private address.
- Times are Seattle wall-clock times (`src/lib/time.ts`), whatever timezone the server runs in.

## Next steps

- Real accounts (email or Google sign-in) and invites
- A real database, so posts survive restarts
- Post-jam feedback ("Was it as described? Would you go again?")
- Load the real seed list of Seattle jams
- Deploy to a public URL
