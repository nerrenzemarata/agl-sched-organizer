# AGL Sched Organizer

Everyone's weekly class schedule in one calendar, color-coded by name — spot who's free, and when, at a glance.

## Features

- Weekly calendar grid (Mon–Sun, 6 AM–10 PM) with overlapping-class layout
- "Everyone's free at the same time" summary panel
- Click a name to hide/show their classes
- **Add member** button — enter a name, upload a photo, and manually build their weekly schedule
- Edit or delete any member (pencil icon on their chip)
- Data is saved to your browser's local storage, so it persists between visits

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel

1. Push this project to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Next.js — no configuration needed. Click **Deploy**.

## Notes

- All schedule data (members, photos, classes) lives in the browser's `localStorage` — there is no server database. Data does not sync across devices/browsers.
- Uploaded photos are automatically downscaled before saving to keep storage usage small.
- To reset everything back to the original seed data, clear this site's local storage from your browser's dev tools (Application → Local Storage) or clear browsing data for the site.
