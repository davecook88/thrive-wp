# Gutenberg Calendar Block — Authoring Guide and Tech Notes

This document explains how a non-technical designer can use and edit the calendar in WordPress and how developers should implement the custom block so it integrates with the Lit Web Component.

## What designers will do (no code)

1) Insert the “Thrive Calendar” block on any page.
2) In the right sidebar (block settings), configure:
   - View (Week/Day/Month/List)
   - Mode (auto from login, or force Public/Student/Teacher for previews)
   - Teacher (optional filter by teacher id)
   - Slot duration and snapping
   - Toggles to show availability, classes, bookings
3) Edit the “Event Modal Content” area directly in the editor using normal blocks (Headings, Paragraphs, Buttons, Images). This is the template used when a calendar item is clicked. See `docs/thrive-modal-architecture.md` for how this content is rendered in a frontend React Modal.
4) Publish.

The calendar loads automatically and clicking a timeslot or event will show your modal design with real event details filled in.

## Modal templating (designer-friendly)

Inside the block you will see an “Event Modal Content” panel. This is just editable content. The calendar fills in placeholders when it opens the modal:

Available placeholders (must be typed exactly):
- {{title}} — Event/class title
- {{description}} — Short description
- {{start_local}} — Start date/time in the viewer’s timezone
- {{end_local}} — End date/time in the viewer’s timezone
- {{teacher_name}} — Teacher display name
- {{capacity}} — Max seats (group classes)
- {{enrolled_count}} — Enrolled students (group classes)
- {{location}} — Location or conference link label

Examples:
- “Join {{title}} with {{teacher_name}} on {{start_local}}.”
- “Seats: {{enrolled_count}} / {{capacity}}.”

Buttons/links you add (e.g., “Book now”) will work as normal links. The block’s settings can inject booking URLs automatically in the future; for now you can link to any page.

## Developer implementation overview

We reuse a single Lit Web Component (<thrive-calendar>) and expose it via a custom Gutenberg block.

- The block is dynamic (PHP render) to always enqueue the bundle and set attributes based on user auth (ThriveAuthContext).
- The block renders the web component. For modal content, v1 uses standalone modal blocks keyed by ID and frontend openers (`data-open-modal-id`). Alternative named slot wiring is possible; see `docs/thrive-modal-architecture.md` for the current approach.

### Files to add (theme)

- wordpress/themes/custom-theme/blocks/thrive-calendar/
  - block.json — metadata + attributes + render callback
  - edit.tsx — InspectorControls (props), InnerBlocks (modal editor), live preview
  - render.php — outputs <thrive-calendar> (modal handling is handled by standalone modal blocks)
  - style.css (optional)
  - editor.css (optional)

The theme already auto-registers block.json files in subfolders.

### block.json (sketch)

```json
{
  "apiVersion": 3,
  "name": "custom-theme/thrive-calendar",
  "title": "Thrive Calendar",
  "category": "widgets",
  "icon": "calendar",
  "description": "Teacher availability and bookings calendar.",
  "attributes": {
    "view": { "type": "string", "default": "week" },
    "mode": { "type": "string", "default": "auto" },
    "teacherId": { "type": "string" },
    "slotDuration": { "type": "number", "default": 30 },
    "snapTo": { "type": "number", "default": 15 },
    "showClasses": { "type": "boolean", "default": true },
    "showAvailability": { "type": "boolean", "default": true },
    "showBookings": { "type": "boolean", "default": true }
  },
  "supports": { "anchor": true },
  "editorScript": "file:./index.js",
  "render": "file:./render.php"
}
```

### edit.tsx (sketch)

- Adds InspectorControls for props.
- Renders an InnerBlocks area labeled “Event Modal Content”.
- Optionally renders a live preview using the same web component in the editor (script is globally enqueued already).

InnerBlocks config:
- allowedBlocks: core/heading, core/paragraph, core/buttons, core/image, core/list
- templateLock: false

### render.php (key idea)

- Determine actual mode via ThriveAuth helpers:
  - admin → admin, teacher → teacher, logged-in student → student, else public
  - if attribute mode = 'auto', use the detected mode; otherwise, honor explicit mode
- Output the web component with attributes mapped 1:1
- Modal content is provided by separate modal blocks that output `<template data-modal-id>`; the calendar triggers can open them via `data-open-modal-id`. See `docs/thrive-modal-architecture.md`.

Example outline:

```php
$attrs = $attributes ?? [];
$detectedMode = 'public';
if (function_exists('thrive_is_admin') && thrive_is_admin()) $detectedMode = 'admin';
elseif (function_exists('thrive_is_teacher') && thrive_is_teacher()) $detectedMode = 'teacher';
elseif (function_exists('thrive_is_logged_in') && thrive_is_logged_in()) $detectedMode = 'student';
$mode = ($attrs['mode'] ?? 'auto') === 'auto' ? $detectedMode : $attrs['mode'];

ob_start();
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
echo '<thrive-calendar'
  . ' view="' . esc_attr($attrs['view'] ?? 'week') . '"'
  . ' mode="' . esc_attr($mode) . '"'
  . (!empty($attrs['teacherId']) ? ' teacher-id="' . esc_attr($attrs['teacherId']) . '"' : '')
  . ' slot-duration="' . intval($attrs['slotDuration'] ?? 30) . '"'
  . ' snap-to="' . intval($attrs['snapTo'] ?? 15) . '"'
  . ' show-classes="' . (!empty($attrs['showClasses']) ? 'true' : 'false') . '"'
  . ' show-availability="' . (!empty($attrs['showAvailability']) ? 'true' : 'false') . '"'
  . ' show-bookings="' . (!empty($attrs['showBookings']) ? 'true' : 'false') . '"'
  . '>';

  // Modal content is external (standalone modal blocks) and opened by data attributes.

echo '</thrive-calendar>';

return ob_get_clean();
```

### Web Component (Lit) — how it uses the modal

- Define a named slot `<slot name="event-modal"></slot>`
- On event click, clone the slotted `<template>` content and do token replacement (e.g., `{{title}}`).
- Mount a modal inside the component’s Shadow DOM for isolation; expose CSS vars for styling.
- Dispatch `modal:open` and `modal:close` events for analytics.

Token replacement rules:
- Replace only known tokens.
- Escape text when injecting to prevent XSS (treat token values as text, not HTML).

### Serving the bundle

- Bundle is served by Nginx at `/assets/calendar/thrive-calendar.js`.
- Theme already enqueues this script globally; alternatively enqueue only when block is used (future optimization).

## Accessibility and editor parity

- Keyboard support: open modal with Enter, close with Escape; focus trap inside modal; return focus to trigger element.
- In the editor, the component renders similarly so designers can see an approximate preview of their modal layout.

## Future extensions

- Auto-inject booking URLs into a specific button in the modal when present (e.g., data attribute selector).
- Multiple modal templates by event type (group vs 1:1) using block variation or Conditional Blocks.
- Server-provided feature flags via a small `/api/config` endpoint.
