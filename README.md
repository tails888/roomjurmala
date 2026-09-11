# ROOM Jūrmala

A multilingual static website for the event space at Skolas iela 50, Jūrmala. A fullscreen venue video opens the short homepage, followed by four activity films, an orange pricing section and a two-field WhatsApp booking request. Detailed space and pricing pages retain the gallery, interactive Three.js photo installation, calculator and FAQs.

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

- `scripts/build.mjs` generates all fifteen static HTML pages and copies the pinned Three.js modules into `assets/vendor`.
- `content/services.mjs` contains the two service pages in all three languages.
- `content/design.mjs` contains new interface copy in Latvian, English and Russian, plus references to existing media.
- `content/copy.json` retains the original multilingual business and booking copy.
- `content/pages.json` retains each original page's metadata, detailed service copy and FAQs.
- `assets/css/site.css` defines the responsive visual system.
- `assets/js/app.js` handles navigation, galleries, calculator, activity schedule and booking requests.
- `assets/js/films.js` handles visible-only video playback and the desktop scrolling story.
- `assets/js/scene.js` renders the photographic 3D installation. It represents photographs of the venue, not a measured floor plan.
- `assets/js/booking-core.mjs` contains prices, date validation and WhatsApp message formatting.
- `calendar-events.js` remains the source of the venue's scheduled activities.

The generated routes are `/`, `/telpa/`, `/cenas/`, `/bernu-ballites/`, `/telpas-nodarbibam/` and their `/en/` and `/ru/` equivalents. The two service pages have distinct copy, descriptive headings, existing venue photos/video, prices, custom FAQs and contextual booking requests. They are linked from the homepage and space overview, and link to each other. Edit the source files and rebuild rather than editing generated HTML directly. Existing titles, descriptions, canonical URLs and language alternates are retained. Detailed service and FAQ text remains in static HTML on the inner pages. The homepage includes expandable FAQs with matching FAQ structured data. Unshown aggregate ratings were removed. The sitemap includes all fifteen routes with updated modification dates.

## Motion and media

The homepage uses all five existing videos. The venue-entry film fills the first screen and loops its room segment from 13 seconds onward. The private event, creative workshop, children's class and exercise films appear beside their respective activities. Original files remain untouched. Their portrait resolution limits detail when cropped across a desktop screen; activity films retain their portrait framing. Poster images are frames extracted from those same files.

Videos autoplay muted only while visible, and inactive desktop panels pause. Playback also pauses in hidden tabs. Each film has pause and sound controls. Reduced-motion mode starts films paused and allows manual playback. Without JavaScript, native video controls and source URLs remain available.

Above 900 pixels, the activity section stays in place while scrolling switches its four films. Activity labels also navigate directly, including with arrow keys. Phones, tablets and reduced-motion mode use a normal flowing layout. Scrolling uses browser behavior without wheel interception.

The space page uses locally vendored Three.js on desktop. Phones, reduced-motion preferences and WebGL failures use existing photos in a CSS perspective layout with manual gallery controls. Motion can be paused, and rendering stops outside the viewport and in hidden tabs.

Only existing venue assets are shipped. No generated room imagery or replacement logo is included.

## Booking behavior

Customers choose a date and approximate start time, then open a prepared WhatsApp message to the existing venue number. The customer sends the message in WhatsApp; availability is confirmed in that conversation. No name, phone number or account is required on the website. The pricing calculator can optionally attach a selected package, which can also be removed. The site does not store the request. A mobile booking button appears between the hero and booking sections.

Every booking section includes a month calendar with scheduled-class markers and localized class details from the existing calendar data. Selecting a day fills the date field; selecting a class also fills its start time and adds its name to the WhatsApp request. Past dates and already-started classes cannot be booked through the calendar. Editing the date or time clears the selected class. This is an activity schedule, not a live reservation database.

Hourly and package prices remain unchanged. Memberships have a three-month minimum. Date validation uses Europe/Riga time. Without JavaScript the booking section provides a direct WhatsApp contact link.

## Verification

```sh
npm run build
npm run check
npm test
```

The static check verifies the fifteen routes, local links and assets, metadata, JSON, IDs, five homepage films, two-field forms, fallback links and JavaScript syntax. Tests cover price breaks, membership terms, booking validation, Riga dates and message encoding. Browser verification should also cover all three languages, desktop and phone layouts, keyboard navigation, visible-only playback, reduced motion, the no-JavaScript fallback and the prepared WhatsApp payload without sending a message.

Video sources and posters are present in the generated HTML for discovery, following [Google's video guidance](https://developers.google.com/search/docs/appearance/video). These are venue pages rather than dedicated watch pages; no video-rich-result eligibility or ranking is promised. Video upload dates are not invented for structured data.

## Publishing

The repository root remains a ready-to-serve static website. Generated HTML and the vendored runtime are committed, so an existing static host does not need a build server. To rebuild in a hosting pipeline, use `npm ci && npm run build` and publish the repository root, excluding development files and `node_modules`.

Analytics retain the existing property and load only on `roomjurmala.lv` or `www.roomjurmala.lv`. Local previews do not send analytics. Publishing to `updates` does not itself authorize changes to `main` or a new production deployment.
