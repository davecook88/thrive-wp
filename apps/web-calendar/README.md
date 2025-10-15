# @thrive/calendar-wc (Lit Web Component)

Build a reusable calendar web component and serve it via Nginx under /assets/calendar/.

## Features

- **Week View**: Interactive weekly calendar with time slots
- **Event Management**: Display classes and bookings with different colors
- **Navigation**: Navigate between weeks with prev/next buttons
- **View Modes**: Support for Week, Day, Month, and List views (Week implemented)
- **User Modes**: Public, Student, Teacher, and Admin modes
- **Time Slots**: Click on time slots to select for booking
- **Event Interaction**: Click on events to view details
- **Current Time Indicator**: Shows current time on today's schedule
- **Responsive Design**: Works on different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Dev

- Install deps and build:

```bash
cd web-components/thrive-calendar
pnpm i
pnpm run build
```

The bundle outputs to `dist/thrive-calendar.js`.

- Run development server with demo:

```bash
pnpm run dev
```

This will start a development server and open the demo page at `http://localhost:5173`.

## WordPress usage

After `docker compose up`, the Nginx container serves the bundle at:

```
http://localhost:8080/assets/calendar/thrive-calendar.js
```

Enqueue or inline a module script in your theme or block render:

```php
wp_enqueue_script(
  'thrive-calendar-wc',
  home_url('/assets/calendar/thrive-calendar.js'),
  [],
  null,
  [ 'in_footer' => true ]
);
```

Then render the element:

```html
<thrive-calendar view="week" mode="student" teacher-id="123"></thrive-calendar>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `view` | string | "week" | Calendar view: "week", "day", "month", "list" |
| `mode` | string | "public" | User mode: "public", "student", "teacher", "admin" |
| `teacher-id` | string | - | Filter events by teacher ID |
| `slot-duration` | number | 30 | Duration of time slots in minutes |
| `snap-to` | number | 15 | Snap interval for slot selection in minutes |
| `show-classes` | boolean | true | Show class events |
| `show-bookings` | boolean | true | Show booking events |
| `timezone` | string | user timezone | IANA timezone identifier |

## Events

The component emits custom events that you can listen to:

```javascript
const calendar = document.querySelector('thrive-calendar');

calendar.addEventListener('slot:select', (e) => {
  console.log('Slot selected:', e.detail);
  // e.detail: { startUtc, endUtc, teacherId }
});

calendar.addEventListener('event:click', (e) => {
  console.log('Event clicked:', e.detail);
  // e.detail: { event }
});
```

## Admin (Vue islands)

In a Vue component, ensure the script tag is present (e.g., in PHP template), then use the element directly or wrap it; listen to CustomEvents via `addEventListener`.

## Styling

The component uses CSS custom properties for theming:

```css
thrive-calendar {
  --thrive-cal-fg: #0f172a;
  --thrive-cal-bg: #fff;
  --thrive-cal-toolbar-bg: #f8fafc;
}
```

## Architecture

### Files

- `src/thrive-calendar.ts` - Main calendar component
- `src/types.ts` - TypeScript interfaces and types
- `index.html` - Demo page with interactive controls
- `package.json` - Package configuration
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration

### Data Flow

1. Component loads and fetches events (currently mock data)
2. Events are rendered in the appropriate view
3. User interactions (clicks) emit custom events
4. Parent components can listen to these events and handle booking logic

### Event Types

The calendar supports different types of events:

- **Classes**: Group or private sessions with capacity management
- **Bookings**: Student bookings for classes
- **Availability**: Teacher availability slots (future)
- **Blackouts**: Blocked time periods (future)

### Time Handling

- All times are stored in UTC
- Display times are converted to user's local timezone
- Current time indicator shows on today's schedule
- Time slots are clickable for booking selection

## Notes

- ESM only, no polyfills included.
- Shadow DOM encapsulates styles; override via CSS variables on the host.
- Currently uses mock data; integrate with NestJS API for real data
- Week view is fully implemented; other views show placeholder
