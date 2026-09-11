# ROOM Jūrmala

A multilingual static website for the event space at Skolas iela 50, Jūrmala. The redesign uses the existing logo, local fonts, venue photography and videos, with an interactive Three.js photo installation, event selector, gallery, price calculator and booking request flow.

All redesign work belongs to the `updates` branch. Do not merge or push these changes to `main` as part of this work.

## Local development

Requires Node.js 20 or newer.

```sh
npm ci
npm run build
npm run dev
```

Open http://127.0.0.1:4174. The local server supports video range requests. Run the build again after changing the generator or content files. CSS and JavaScript edits are served directly.

## Sources

- `scripts/build.mjs` generates all nine static HTML pages and copies the pinned Three.js modules into `assets/vendor`.
- `content/design.mjs` contains new interface copy in Latvian, English and Russian, plus references to existing media.
- `content/copy.json` retains the original multilingual business and booking copy.
- `content/pages.json` retains each original page's metadata, detailed service copy and FAQs.
- `assets/css/site.css` defines the responsive visual system.
- `assets/js/app.js` handles navigation, galleries, calculator, calendar and request review.
- `assets/js/scene.js` renders the photographic 3D installation. It represents photographs of the venue, not a measured floor plan.
- `assets/js/booking-core.mjs` contains prices, date validation and WhatsApp message formatting.
- `calendar-events.js` remains the source of the venue's scheduled activities.

The generated routes are `/`, `/telpa/`, `/cenas/` and their `/en/` and `/ru/` equivalents. Edit the source files and rebuild rather than editing generated HTML directly. Existing canonical URLs, language alternates, structured data, sitemap and robots files are preserved.

## Motion and media

Desktop screens use locally vendored Three.js. Phones, reduced-motion preferences and WebGL failures use the existing photos in a CSS perspective layout, with manual gallery controls. Motion can be paused. Rendering stops outside the viewport and in hidden tabs. Videos load only when opened and retain native playback controls.

Only existing venue assets are shipped. No generated room imagery or replacement logo is included.

## Booking behavior

The calendar shows the existing activity schedule. It does not claim to be a live reservation database. Customers choose a date, package and times, review their request locally, then open WhatsApp to send it to the existing venue number. Submission is completed by the customer in WhatsApp. The site does not store personal information or send a request when the review button is pressed.

Hourly and package prices remain unchanged. Memberships have a three-month minimum. Date validation uses Europe/Riga time. Without JavaScript the booking section provides a direct WhatsApp contact link.

## Verification

```sh
npm run build
npm run check
npm test
```

The static check verifies the nine routes, local links and assets, metadata, JSON, IDs, form fallback and JavaScript syntax. Tests cover price breaks, membership terms, booking validation, Riga dates and message encoding. Browser verification should also cover desktop and phone layouts, keyboard navigation, media playback and the full request review flow.

## Publishing

The repository root remains a ready-to-serve static website. Generated HTML and the vendored runtime are committed, so an existing static host does not need a build server. To rebuild in a hosting pipeline, use `npm ci && npm run build` and publish the repository root, excluding development files and `node_modules`.

Analytics retain the existing property and load only on `roomjurmala.lv` or `www.roomjurmala.lv`. Local previews do not send analytics. Publishing to `updates` does not itself authorize changes to `main` or a new production deployment.
