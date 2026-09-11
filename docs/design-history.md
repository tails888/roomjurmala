> Historical design notes. These describe an earlier iteration, not the current implementation.

# Paper direction implementation review

final result: passed

## Source and scope

The user selected Paper & Shadow as the site foundation and Infinite Atelier as the gallery direction. This is an adaptation for the actual venue, not a literal recreation of the invented interiors in the concept images.

- Hero reference: design-concepts/06-paper-and-shadow.png (1536 × 1024); user-selected attachment codex-clipboard-7918b67f-2d2c-4a34-92f5-d80a51cc1663.png.
- Gallery reference: design-concepts/08-infinite-atelier.png (1536 × 1024); user-selected attachment codex-clipboard-4c2a5c7d-6b0b-42f4-89fe-0556c6c769f9.png.
- Preview: http://127.0.0.1:4174/.
- Browser: Codex in-app browser. Desktop CSS viewport 1536 × 1024. Browser captures are 1536 × 1024 at 1× density. Mobile checks at 390 × 844 and 320 × 740.
- Local browser evidence: design-concepts/qa/desktop-home.png, desktop-gallery.png, desktop-space.png, mobile-320.png, mobile-ru-cards.png.
- State: LV homepage initial hero; gallery centered in viewport; RU activity cards; LV price calculator with two days selected; reduced motion enabled and disabled.

## Comparison history

1. Initial desktop hero inspection found the portrait artwork cropped off the folded arch top (P1). A new landscape artwork was generated for the measured slot, compressed to WebP and fitted without cropping the arch. Initial mobile inspection found excess vertical space around the wide illustration (P2). Replaced fixed mobile height with an aspect-ratio layout.
2. A combined input containing the actual user reference and browser screenshot showed the hero headline too small and the cards too low (P2). Increased desktop display type and shortened the hero. Repeated combined comparison at 1536 × 1024 with updated capture; heading, CTA and three-card hierarchy now align with the selected direction.
3. RU 320px card inspection found long headings squeezing the photos (P2). EN/RU mobile cards now stack text and media. Repeated screenshot confirms readable headings and full-width photos.
4. Gallery reference and rendered gallery were displayed together in one comparison input. Central ROOM typography, cream photo borders, tilted placement, shadows and orange booking button carry through. Authentic venue photos intentionally replace generated event imagery and decorative ceramics. Gallery is a site section rather than a second homepage.

## Required fidelity surfaces

- Fonts and typography: existing self-hosted Cormorant Garamond provides the high-contrast serif display and Inter keeps small form labels readable. LV headline retains the requested two-line wording. Translation wrapping was checked at 320px. Original logo is unchanged.
- Spacing and layout rhythm: split hero, three overlapping paper cards, open collage center and regular section gutters. Mobile uses a sequential layout and two-column photo gallery. No document overflow at checked widths. Sidepages retain their minimal article structure.
- Colors and tokens: warm cream, dark forest green, near-black type and orange actions. Calendar selection and pricing receipt use green; headings and links retain readable contrast.
- Image quality: decorative arch is generated artwork, not a claim about the physical venue. Delivered as a compressed 1536 × 1024 WebP. Real supplied photos and all five existing videos remain in use. Full arch and photo crops checked in browser. No placeholder media.
- Copy and content: localized LV/EN/RU content. Existing prices, booking rules, reviews, contact information and FAQ data retained. Nine canonical routes remain. Activity links lead to the established space-page sections.

Full-view comparison text and controls were legible at the capture resolution. Focused mobile activity-card and calculator views additionally checked long copy, image sizing and form controls; no separate enlarged desktop crop was needed.

## Interaction verification

- Photo opens in dialog, next photo changes, close returns to the page.
- Desktop video strip drag changes scrollLeft from 0 to 409.5; drag state clears after release.
- Visible videos autoplay muted; offscreen video remains paused. Reduced-motion preference pauses all autoplay and removes decorative transforms.
- Pointer motion changes the arch rotation variable; scroll parallax is restricted to fine-pointer desktop and respects reduced motion.
- Mobile menu opens and closes.
- Calculator two-day preset returns 250 € and passes `2 dienas · 250 €` into homepage booking.
- Empty booking submit displays the existing validation error and does not send a message.
- Sidepage has no calendar or social/map widgets.
- Browser error log empty at final check.
- Build, route/SEO/asset validation and all six booking/pricing tests pass.

## Accepted adaptations and polish

Original logo, real venue media, functional language navigation and existing booking content take precedence over concept-only decoration. The new arch has wider proportions and no invented room inside. Paper cards use real photos with curved crops and subtle tilt rather than duplicating illustrated page curls. Animations are lightweight perspective/parallax and native scrolling, not a WebGL room simulation. No remaining actionable P0/P1/P2 findings.

## Implementation checklist

- [x] Apply first direction to homepage and shared palette.
- [x] Adapt second direction to a working photo and video gallery.
- [x] Preserve original logo, nine routes and booking functionality.
- [x] Verify desktop/mobile, translations and reduced motion.
- [x] Commit and push only the updates branch after final checks.

## Follow-up annotation changes

The user requested replacing the decorative arch with the existing venue video and a clearer class list. Hero now contains the muted entry film in a rounded arch crop; that film was removed from the gallery strip so all five unique videos remain once each. Upcoming classes span the section width in three columns on desktop, two on tablet and one on mobile, with date badges, separate time labels, clear booking buttons and a started-class state.

Browser checked at 1234 × 994 and 390 × 844. Video plays muted when visible and pauses offscreen. Selecting the September 15 yoga class fills September 15 and 19:00 in the booking form. Mobile cards have no horizontal overflow. Browser error log empty. Build, nine-route validation and six tests pass.
