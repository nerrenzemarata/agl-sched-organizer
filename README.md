# AGL Sched Organizer

Everyone's weekly class schedule in one calendar, color-coded by name — spot who's free, and when, at a glance.

## Features

- Weekly calendar grid (Mon–Sun, 6 AM–10 PM) with overlapping-class layout
- "Everyone's free at the same time" summary panel
- Click a name to hide/show their classes
- **Add member** button — enter a name, optionally add a profile photo (shown as their avatar
  in the legend), then upload a photo of their schedule (a class card, a printed list, a grid
  screenshot, etc.) and it's **scanned for free, entirely on-device** (via
  [tesseract.js](https://github.com/naptha/tesseract.js), no API key, no account, no cost)
  to try to fill in the classes below. No schedule photo, or the scan comes up empty? Add
  classes by hand instead — that always works.
- Edit or delete any member (pencil icon on their chip)
- Data is saved to your browser's local storage, so it persists between visits

## Getting started

1. Create a [Supabase](https://supabase.com) project, then open its SQL editor and run
   [`supabase/schema.sql`](supabase/schema.sql) once to create the `organizers` table.
2. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key
   (Project Settings → API in the Supabase dashboard).
3. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### About the schedule photo scan

Scanning runs fully in the browser with no server call, no API key, and no cost, and handles
two different photo shapes:

- **A typed/printed list** ("Monday 9:00–10:30 AM Calculus") — read directly and parsed line
  by line, with day names matched fuzzily so small OCR typos don't break it.
- **A spreadsheet-style weekly grid** (day columns × time rows, a colored block per class —
  e.g. a screenshot from Excel/Google Sheets) — OCR alone can't see table structure, so this
  also samples pixel colors directly on the photo to find where each colored block starts and
  ends, using the day and time headers it reads to convert that into an actual time range,
  then attaches whatever label text sits inside the block. The photo is upscaled, grayscaled,
  and contrast-boosted first to help both approaches.

It tries the grid reading first; if the photo doesn't look like a grid, it falls back to the
plain-list reading automatically. Either way, every row it produces is marked "approx" on
purpose: a label can come through as generic "Class" if the text inside a block was too small
or low-contrast to read, and times can land up to ~30 minutes off. Always give the results a
glance — and typing the schedule in by hand is always available as a fallback.

## Deploying to Vercel

1. Push this project to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Next.js — no build configuration needed.
4. Before deploying, add the same two environment variables from `.env.local.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) under the project's
   Environment Variables settings. Click **Deploy**.

## Notes

- Each Schedule Organizer board (members, events, visibility) lives in Supabase, keyed by
  its URL slug — anyone with the link can view and edit it, no account needed, and it syncs
  across every device that opens that link.
- The homepage's list of organizers is just a local, per-browser bookmark list for
  convenience (stored in `localStorage`); the actual board data always lives in Supabase.
  Opening any board's link adds it to that list.
- Because access is "anyone with the link," treat a board's URL like a shared document link
  — don't put anything sensitive in one, and don't publish a board's link somewhere public
  unless everyone should be able to edit it.
- Uploaded photos are stored as compressed, downscaled data URLs inside the board's row.
