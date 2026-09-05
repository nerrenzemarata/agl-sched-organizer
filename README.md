# AGL Sched Organizer

Everyone's weekly class schedule in one calendar, color-coded by name — spot who's free, and when, at a glance.

## Features

- Weekly calendar grid (Mon–Sun, 6 AM–10 PM) with overlapping-class layout
- "Everyone's free at the same time" summary panel
- Click a name to hide/show their classes
- **Add member** button — enter a name, then upload a photo of their schedule (a class card,
  a printed list, etc.) and it's **scanned for free, entirely on-device** (via
  [tesseract.js](https://github.com/naptha/tesseract.js), no API key, no account, no cost)
  to try to fill in the classes below. No photo, or the scan comes up empty? Add classes by
  hand instead — that always works.
- Edit or delete any member (pencil icon on their chip)
- Data is saved to your browser's local storage, so it persists between visits

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### About the schedule photo scan

Scanning runs fully in the browser with no server call, no API key, and no cost. To get the
most out of free OCR, each photo is: cleaned up (upscaled, grayscaled, contrast-boosted),
read twice with different layout assumptions (a plain list vs. a scattered/table layout),
and merged, with day names matched fuzzily to shrug off small OCR typos.

Even so, it reads *text*, not table layout — it works well on a clear, typed schedule list
("Monday 9:00–10:30 AM Calculus"), and less reliably on a photographed screenshot of a
calendar app's grid view, where the layout itself carries information OCR can't see. Every
row it produces is marked "approx" on purpose — always give them a glance — and typing the
schedule in by hand is always available as a fallback.

## Deploying to Vercel

1. Push this project to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Next.js — no configuration needed. Click **Deploy**.

## Notes

- All schedule data (members, photos, classes) lives in the browser's `localStorage` — there is no server database. Data does not sync across devices/browsers.
- Uploaded photos are automatically downscaled before saving to keep storage usage small.
- To reset everything back to the original seed data, clear this site's local storage from your browser's dev tools (Application → Local Storage) or clear browsing data for the site.
