# @thrive/calendar-wc (Lit Web Component)

Build a reusable calendar web component and serve it via Nginx under /assets/calendar/.

## Dev

- Install deps and build:

```bash
cd web-components/thrive-calendar
npm i
npm run build
```

The bundle outputs to `dist/thrive-calendar.js`.

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

## Admin (Vue islands)

In a Vue component, ensure the script tag is present (e.g., in PHP template), then use the element directly or wrap it; listen to CustomEvents via `addEventListener`.

## Notes

- ESM only, no polyfills included.
- Shadow DOM encapsulates styles; override via CSS variables on the host.
