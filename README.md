# ROOM Jurmala

Static website for ROOM Jurmala, an event and activity space in Jurmala.

## Project Structure

- `index.html` - page markup and SEO metadata
- `telpa/index.html` - detailed Latvian space and services SEO landing page
- `en/index.html` - English SEO landing page
- `en/telpa/index.html` - English space and services SEO landing page
- `ru/index.html` - Russian SEO landing page
- `ru/telpa/index.html` - Russian space and services SEO landing page
- `styles.css` - site styling
- `script.js` - language switching and interactive behavior
- `cenas/index.html`, `en/cenas/index.html`, `ru/cenas/index.html` - pricing pages with the price calculator (party, hours, days, week, month)
- `calendar-events.js` - class calendar; loads events from `/api/events` and keeps the embedded schedule as a fallback
- `admin/`, `api/`, `server/` - calendar event administration (PHP 8.3 + SQLite3)
- `content/events-seed.json` - initial events imported once into the admin database
- `favicon.ico` - root favicon for browsers and search crawlers
- `assets/images/brand/` - active logos and brand marks
- `assets/images/icons/` - favicons and app icons
- `assets/images/gallery/` - active space and event photography used as posters
- `assets/images/reviews/` - review call-to-action imagery
- `assets/images/services/` - active service page illustrations and hero imagery
- `assets/images/social/` - social sharing preview images
- `assets/videos/` - active site videos

## Prices

Keep these values identical on the homepage cards, FAQ answers (visible HTML, FAQ structured data and `script.js`), pricing pages and booking notes:

- Hourly rental: 1h 20 €, 2h 38 €, 3h 55 €, 4h 70 €, 5h 85 €, 6h 100 €, 7h 115 €, 8h (full day) 130 €
- Party up to 15 guests: 3 hours 100 €, each additional hour 20 €
- Party over 15 guests: 3 hours 130 €, each additional hour 30 €
- Day package 130 € (2 days 250 €, 3 days 360 €, 4 days 460 €), week package 550 €, monthly subscription 460 € (minimum 3 months)

## Deployment

The pages are static. Hostinger also runs the calendar administration with PHP 8.3 and the SQLite3 extension. Deploy `admin/`, `api/`, `server/`, `content/events-seed.json` and their `.htaccess` files with the public files. The root `.htaccess` blocks web access to `server/`, `content/`, `scripts/`, `tests/` and `docs/`.

## Calendar administration

Open `https://roomjurmala.lv/admin/`. Both administrators (owner and manager) have their own email, password and session and manage the same events: one-time or weekly events, photos, cancelling one date or a whole series, restoring, archiving and permanent deletion. Changes appear in the public calendars within 15 seconds, without a Git push.

Data lives outside `public_html` in `.roomjurmala-admin/` (`calendar.sqlite`, sessions, invitations). Git deployments do not replace it; include it in hosting backups.

Inviting administrators:

1. Run `node scripts/prepare-invitations.mjs ../room-admin-invitations --owner OWNER@EMAIL --manager MANAGER@EMAIL` outside the repository folder. Omit a role to invite only one person.
2. Upload only `invitations.json` to `.roomjurmala-admin/` beside `public_html`. Never commit it or place it in `public_html`.
3. Give each person only their own link from `activation-links.json`. Links are bound to one email and expire after 48 hours. Each person chooses a password of at least 8 characters.

Replacing `invitations.json` revokes unused links but keeps activated accounts and events. Password recovery by email is described in `docs/password-recovery.md`.

## Tests

`npm test` runs the PHP administration tests (requires PHP 8.3 with SQLite3; set `PHP_BINARY` if `php` is not on PATH).
