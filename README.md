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

Hostinger deploys the repository root to `public_html`. The generated pages remain static; the event administration uses PHP 8.3 with the built-in SQLite3 extension. Deploy `admin/`, `api/`, `server/`, `content/events-seed.json` and their `.htaccess` files alongside the public assets. The root `.htaccess` blocks web access to private source directories and hidden files. No Node.js server is needed on Hostinger.

A Git push and a hosting deployment are separate operations. The private Sites preview uses its own checkout and publishing process.

GA4 is initialized once by `assets/js/analytics.js`, only on HTTPS `roomjurmala.lv` and `www.roomjurmala.lv`. Local and Sites previews do not send analytics. Change the script or stylesheet version in the generator when modifying cached runtime files.

## Booking and business data

The website prepares a WhatsApp request with a chosen date and approximate time. Customers send it themselves; availability is confirmed in conversation. The calendar shows scheduled classes, not live room availability.

Pricing uses `assets/js/booking-core.js`. Memberships have a three-month minimum. Update visible prices and related FAQ answers together.

Google reviews in `content/reviews.mjs` are a manual snapshot. Refresh the rating, count and quotations together after checking the business profile. No self-serving review rating schema is emitted.

## Event administration

Open `/admin/`. The Latvian interface adds one-time or weekly events, cancels one date or all dates from a chosen date, and restores cancelled events. Dates and times use Europe/Riga. New Latvian copy is also the fallback on English and Russian pages.

The public calendar loads `/api/events` and refreshes every 15 seconds while visible and on tab focus. Successful responses replace the embedded schedule, including an empty schedule. Connection failures retain the last loaded schedule. Adding or cancelling events needs no Git push or website deployment.

### Hostinger activation

1. Deploy `main` to the existing `roomjurmala.lv` site with PHP 8.3 and SQLite3 enabled.
2. From this repository, run `node scripts/prepare-admin.mjs ../room-admin-activation`. This creates a one-time activation link and its hash outside Git. The link expires after 48 hours.
3. In Hostinger File Manager, create `.roomjurmala-admin` beside `public_html`, then upload **only** `bootstrap.json` into it. Never put activation material inside `public_html` or Git. If the API has already been opened, the directory may already exist.
4. Privately open the link from `activation.txt`. The owner enters her email and a password of at least 12 characters. She can then use `https://roomjurmala.lv/admin/`. The email is a login name; this version sends no email.
5. After activation, securely remove the local activation files. The bootstrap token cannot create another owner once activation succeeds.

Events, password hash and rate limits live in `.roomjurmala-admin/calendar.sqlite`; session files live in its `sessions/` subdirectory. The directory is outside `public_html`, so Git deployments do not replace it. The database imports `content/events-seed.json` only once. Existing local preview events are not automatically copied to production. Back up this private directory through hosting backups and verify that it is included before relying on those backups.

Authentication uses HTTPS, HttpOnly/SameSite cookies, CSRF tokens, bounded sessions and login rate limits. Event writes require the owner session. A failed setup remains closed until a valid bootstrap file and token are supplied. Password recovery currently requires the hosting administrator; there is no email reset flow. To reset access, back up the database, delete only its singleton `owner` row using a trusted SQLite administration tool, and repeat activation with a fresh token. Keep the event tables intact. Removing the owner invalidates existing sessions.

`ROOM_DATA_DIR` can override the private directory and `ROOM_ORIGIN` can override the canonical HTTPS origin. The default is `https://roomjurmala.lv`. Private storage must stay outside the served directory and be writable by PHP.

### Local preview and verification

`npm run dev` exposes an unauthenticated preview only on `127.0.0.1:4174/admin/`. Its JSON store is `../roomjurmala-data/events.json`; `ROOM_EVENTS_FILE` can select another private file. Do not expose this Node development server through a tunnel or reverse proxy.

To test the production PHP backend locally, use PHP 8.3 with SQLite3, set `ROOM_ORIGIN=http://127.0.0.1:4176` and `ROOM_DATA_DIR` to a private directory outside this repository, then run `php -S 127.0.0.1:4176 scripts/php-router.php`.

`npm test` covers event persistence, cancellation, restoration, validation and public-calendar filtering. With PHP available, it also runs real HTTP tests for owner activation, login/logout, origin and CSRF checks, idempotent creation and rate limiting. Set `PHP_BINARY` to the PHP executable when it is not on PATH. `npm run check` validates the public website and admin asset references.
