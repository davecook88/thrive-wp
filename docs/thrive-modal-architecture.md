# Thrive Modal Architecture (WordPress Theme)

This document explains how reusable modals are authored and rendered on the WordPress frontend using React while remaining 100% block‑editor friendly.

## Overview

- Authors create one or more modal blocks (each with its own content) in the editor.
- Each modal block renders server‑side to a hidden `<template data-modal-id="...">…</template>` element.
- A small frontend “view” script runs React and opens a WordPress Modal (`@wordpress/components/Modal`) when any element with `data-open-modal-id="<ID>"` is clicked.
- The modal content is exactly the InnerBlocks HTML the author created; no shadow copies or shortcodes.

Why this approach
- Editor‑first: designers use normal blocks for modal content.
- Accessible: the WP Modal handles focus, Escape, aria roles.
- Framework‑agnostic triggers: any element can open a modal via a data attribute.

## Authoring a modal

1) Insert the block “Thrive Calendar Modal”.
2) Set its Modal ID (e.g. `booking-details`) and optional label.
3) Add content with standard blocks (Paragraphs, Headings, Buttons, Images). Save.

At render time, PHP outputs:

```html
<template data-modal-id="booking-details">
  <!-- your InnerBlocks HTML here -->
</template>
```

File: `wordpress/themes/custom-theme/blocks/thrive-calendar-modal/render.php`

## Opening a modal

Place any clickable element with a matching opener attribute:

```html
<button data-open-modal-id="booking-details" data-modal-title="Booking details">Open</button>
```

- `data-open-modal-id` (required): links the click to a matching `<template data-modal-id>`.
- `data-modal-title` (optional): sets the modal header title.

When clicked, the frontend script:
1) Finds the matching `<template>`.
2) Reads its innerHTML (the exact author content).
3) Renders a React `<Modal>` and injects that HTML via `dangerouslySetInnerHTML`.
4) Provides a Close button and Escape/overlay dismiss per WP Modal defaults.

File: `wordpress/themes/custom-theme/blocks/thrive-calendar-modal/view.tsx`

## Frontend bundling and wiring

- The theme builds two bundles using `@wordpress/scripts`:
  - Editor: `blocks/index.ts` (block registrations and editor UI)
  - View: `blocks/view.index.ts` (frontend runtime; imports the modal view)
- The modal block’s `block.json` references the frontend handle: `"viewScript": "custom-theme-blocks-view"`.
- `functions.php` enqueues the built `view.index.ts.js` on the frontend, exposing that handle.

Files:
- `blocks/thrive-calendar-modal/block.json` (has `viewScript`)
- `blocks/view.index.ts` (imports `./thrive-calendar-modal/view`)
- `functions.php` (enqueues `custom-theme-blocks-view`)

## Integrating with the calendar

The calendar can open these modals by rendering triggers with `data-open-modal-id` attributes. For example, when an event is clicked, the calendar could emit a button like:

```html
<button data-open-modal-id="booking-details" data-modal-title="Booking with {{teacher_name}}">Details</button>
```

Token replacement can be performed in the calendar component or upstream before rendering the opener. Current v1 uses direct HTML; a safe token replacement helper will be added as we wire calendar events to specific modal IDs.

## Notes and caveats

- `@wordpress/components` is primarily an admin/editor library; it works on the frontend when bundled. If you prefer no dependency, we can swap to a lightweight a11y modal later with the same opener contract.
- Avoid putting scripts inside modal content; keep it declarative HTML/blocks.
- The view script observes the DOM for newly added openers and will enhance them automatically.

## Quick checklist

- Create a modal block, set a unique ID.
- Add a button elsewhere with `data-open-modal-id` that matches.
- Optional: set `data-modal-title`.
- Build theme assets and view on the frontend; click to open.
