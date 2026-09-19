# ROOM Jūrmala

Static venue website in Latvian, English and Russian. The repository contains the source and generated HTML for nine pages.

## Development

Requires Node.js 20 or newer.

```sh
npm ci
npm run build
npm run dev
```

Open http://127.0.0.1:4174. Rebuild after changing content or templates. The preview server supports video range requests and redirects retired service URLs.

## Project structure

| Path | Purpose |
| --- | --- |
| `content/` | Translations, metadata, FAQs, prices, reviews and media catalogues |
| `scripts/build.mjs` | Generates the nine pages and sitemap |
| `scripts/check.mjs` | Checks routes, links, metadata, forms and syntax |
| `scripts/audit-assets.mjs` | Checks asset references and exact duplicates |
| `scripts/serve.mjs` | Local preview server |
| `assets/css/` | Shared layout and homepage styling |
| `assets/fonts/` | Inter and Cormorant Garamond, including Latvian and Cyrillic glyphs |
| `assets/images/` | Venue photos, illustrations, logo, icons and video posters |
| `assets/videos/` | Videos used by pages or the media viewer |
| `assets/js/` | Navigation, galleries, video playback, motion, booking and analytics |
| `calendar-events.js` | Scheduled classes |
| `tests/` | Booking, pricing, date and analytics tests |
| `docs/` | Historical design notes |

## Pages and editing

The routes are `/`, `/telpa/` and `/cenas/`, with matching `/en/` and `/ru/` versions. Party and workshop content lives in sections of the venue page. The former standalone service URLs redirect to that page.

Edit source files and rebuild instead of editing generated HTML. Homepage wording is in `content/paper.mjs`; venue copy is in `content/sidepages.mjs` and `content/services.mjs`. The image catalogue also powers the media viewer, so a photo without its own page thumbnail may still be in use.

The homepage contains a room video, activity cards, photo gallery, films, prices, manually maintained Google reviews, a class calendar and FAQs. The venue and pricing pages contain detailed information and booking links. There is no Blender or Three.js tour.

## Verification

```sh
npm run build
npm run check
npm test
```

Checks cover all nine routes, local assets, metadata, structured data, links, fonts, JavaScript imports, duplicate files and booking fallbacks. Tests cover pricing, membership minimums, Riga dates, WhatsApp messages and the analytics hostname gate.

For layout or interaction changes, also check phone and desktop widths, the menu, media viewer, reduced motion and booking handoff. Do not send test WhatsApp messages.

## Media maintenance

Keep public assets in their existing folders and use descriptive filenames. Before removing a file, check both page references and the media viewer catalogue. Run `npm run audit:assets` after changes. It follows references from generated pages through local stylesheets and JavaScript modules, checks that referenced files exist, and reports unused files and byte-identical duplicates.

Video posters, the optimized hero video, font language subsets and different icon sizes serve distinct purposes. Similar appearance alone is not evidence that a file is redundant. Original versions remain recoverable from Git history.

## Publishing

`main` contains the approved version; `updates` is the working branch. The previous main version is preserved in `backup/main-before-updates-2026-09-11`.

The repository root remains ready for the existing static host. Publish the generated route directories, `assets/`, `calendar-events.js`, `favicon.ico`, `robots.txt`, `sitemap.xml` and `.htaccess`. Source files, tests, documentation, local design concepts and `.git/` are not public website assets.

A Git push and a hosting deployment are separate operations. The private Sites preview uses its own checkout and publishing process.

GA4 is initialized once by `assets/js/analytics.js`, only on HTTPS `roomjurmala.lv` and `www.roomjurmala.lv`. Local and Sites previews do not send analytics. Change the script or stylesheet version in the generator when modifying cached runtime files.

## Booking and business data

The website prepares a WhatsApp request with a chosen date and approximate time. Customers send it themselves; availability is confirmed in conversation. The calendar shows scheduled classes, not live room availability.

Pricing uses `assets/js/booking-core.js`. Memberships have a three-month minimum. Update visible prices and related FAQ answers together.

Google reviews in `content/reviews.mjs` are a manual snapshot. Refresh the rating, count and quotations together after checking the business profile. No self-serving review rating schema is emitted.

## Local event administration

Run `npm run dev` and open `http://127.0.0.1:4174/admin/`. The Latvian interface adds one-time or weekly events, cancels one occurrence or all occurrences from a chosen date, and restores cancelled events. It validates dates and times in Europe/Riga. New event copy is entered in Latvian and is displayed as a Latvian fallback on the English and Russian pages.

Changes are saved on the server in `../roomjurmala-data/events.json`, outside the served website directory. The first run imports the existing schedule from `content/events-seed.json`. Later runs retain saved changes. `ROOM_EVENTS_FILE` can select another private file outside the web root. Back up that file before moving the project. Use one server process per store. This file store is intended for the local version, not concurrent multi-instance hosting.

The public calendar refreshes every 15 seconds while visible, on tab focus, and immediately after a change in another tab on the same origin. A successful API result replaces the embedded events even when the list is empty. A connection failure retains the last loaded schedule. Static hosting without this API continues to show the original embedded schedule and cannot save admin changes.

This is a working **local preview**, not a publicly deployed admin system. The server binds only to `127.0.0.1`, checks Host and Origin, and requires a custom header for mutations. There is no owner login yet. Before public use, connect an authenticated backend with persistent storage, HTTPS, backups, and authenticated write endpoints. Uploading the static files alone does not make the admin functional. Do not expose this development server through a tunnel or reverse proxy.

`npm test` covers persistence, concurrent writes in one process, one-off and weekly cancellation, restoration, validation, API origin checks, private-file access, and public-calendar filtering. `npm run check` validates the existing public website.

