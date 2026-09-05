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
3. Vercel auto-detects Next.js — no configuration needed. Click **Deploy**.

## Notes

- All schedule data (members, photos, classes) lives in the browser's `localStorage` — there is no server database. Data does not sync across devices/browsers.
- Uploaded photos are automatically downscaled before saving to keep storage usage small.
- To reset everything back to the original seed data, clear this site's local storage from your browser's dev tools (Application → Local Storage) or clear browsing data for the site.
