---
applyTo: 'wordpress/**'
---


## WordPress### Provided Helpers
* `thrive_get_auth_context(): ?ThriveAuthContext` – returns strongly typed context object (email, name, roles, externalId, raw payload).
* `thrive_is_logged_in(): bool` – true if context exists OR headers present OR fallback session cookie exists.
* `thrive_user_has_role(string|ThriveRole $role): bool` – check if user has specific role
* `thrive_is_admin(): bool` – check if user has admin role
* `thrive_is_teacher(): bool` – check if user has teacher role
* `thrive_get_user_roles(): ThriveRole[]` – get all user roles as enum array
* `thrive_get_user_role_strings(): string[]` – get all user roles as string array

### When to Use Each
| Need | Use |
| ---- | --- |
| Just check if user authenticated | `thrive_is_logged_in()` |
| Display user's name | `$ctx = thrive_get_auth_context(); $ctx?->name` |
| Check admin role | `thrive_is_admin()` |
| Check teacher role | `thrive_is_teacher()` |
| Check custom role | `thrive_user_has_role('custom_role')` |
| Get all roles | `thrive_get_user_roles()` |
| Raw identity debugging | `error_log( wp_json_encode( $ctx->toArray() ) );` |verse Proxy & Session-Aware Integration

### Block-Driven Theme Structure (Editor-First Philosophy)

**Imperative:** All user-facing UI and content should be implemented using WordPress blocks that are easily editable in the block editor. This ensures non-technical admins can update text, colors, layout, and settings directly in the editor without code changes.

**Best Practices:**
- Use custom blocks (with block.json, JS/TSX, and PHP render) for all dynamic or interactive features.
- Expose all relevant attributes (text, color, alignment, etc.) in the block editor sidebar using InspectorControls.
- In the PHP render template, always map all block attributes (including backgroundColor, textColor, align, style, etc.) to the frontend output, so editor changes are faithfully reflected.
- Avoid hardcoding content or styles in PHP—prefer block attributes and theme.json presets.
- Document any block-specific conventions in the theme README.

**Example:**
The login/auth block exposes all button text, modal labels, provider toggles, and color/alignment options as block attributes. The PHP template uses these attributes to render the frontend, ensuring WYSIWYG parity with the editor.

**Why:**
This approach empowers non-technical site admins to manage and update the site visually, reduces developer bottlenecks, and ensures a modern, maintainable WordPress experience.

System Prompt / Mental Model for Contributors:
You are working inside a hybrid stack where WordPress is a presentational + editorial layer and MUST treat the NestJS service (behind the same origin via Nginx) as the authority for authentication. Do NOT re‑implement native WP auth flows for users coming through the unified login; the NestJS session cookie is the single source of truth. WordPress should render different states based solely on reverse‑proxy injected headers (or the parsed auth context object), without persisting parallel credentials unless a future feature explicitly requires it.

### High-Level Flow
1. Browser hits https://<origin>/ (dev: http://localhost:8080) – actually terminates at Nginx.
2. If a session cookie (default name `thrive_sess`) is present, Nginx calls internal NestJS introspection endpoint (`/auth/introspect`).
3. NestJS validates the signed cookie (HS256 using `SESSION_SECRET`). On success it returns a compact identity JSON.
4. Nginx injects identity into upstream WordPress request as headers:
	 - `X-Auth-Email`
	 - `X-Auth-Name`
	 - `X-Auth-User-Id` (external / platform id)
	 - `X-Auth-Roles` (comma separated)
	 - `X-Auth-Context` (JSON blob; canonical)
5. WordPress bootstrap reads these headers early (init priority 1) and builds an in‑memory `ThriveAuthContext` object (no local WP user creation in the simplified model).
6. Theme / plugins call `thrive_is_logged_in()` or `thrive_get_auth_context()` to branch UI.

### Key Principles
* Source of truth = NestJS session cookie only.
* WordPress MUST NOT rely on `is_user_logged_in()` for cross‑app sessions; instead use `thrive_is_logged_in()`.
* Avoid creating or mutating `wp_users` records automatically (legacy mapping code was removed/simplified). Any future persistence must be opt‑in and explicitly documented.
* Authorization logic (roles / capabilities) for cross‑service features should read from `ThriveAuthContext` roles array, not WP roles, unless a feature is purely within WP.

### Provided Helpers
* `thrive_get_auth_context(): ?ThriveAuthContext` – returns strongly typed context object (email, name, roles, externalId, raw payload).
* `thrive_is_logged_in(): bool` – true if context exists OR headers present OR fallback session cookie exists.

### When to Use Each
| Need | Use |
| ---- | --- |
| Just check if user authenticated | `thrive_is_logged_in()` |
| Display user’s name | `$ctx = thrive_get_auth_context(); $ctx?->name` |
| Role-based conditional | `$ctx && in_array('teacher', $ctx->roles, true)` |
| Raw identity debugging | `error_log( wp_json_encode( $ctx->toArray() ) );` |

### Security Notes
* The session cookie is HttpOnly and validated upstream; WordPress PHP never needs the secret.
* Do NOT trust client JS to gate server-rendered sensitive content; always branch in PHP using the context.
* Size guard on `X-Auth-Context` (max 8KB) already enforced in parser; keep payload minimal.
* If you add new sensitive headers, explicitly prefix with `X-Auth-` and ensure Nginx strips any inbound client-supplied versions (`proxy_set_header` hygiene).

### Adding Auth-Conditional UI
Example:
```php
<?php if ( function_exists('thrive_is_logged_in') && thrive_is_logged_in() ) : ?>
	<p>Welcome back, <?php echo esc_html( thrive_get_auth_context()->name ?? 'Learner' ); ?>!</p>
	
	<?php if (thrive_is_admin()) : ?>
		<a href="/admin">Admin Panel</a>
	<?php endif; ?>
	
	<?php if (thrive_is_teacher()) : ?>
		<a href="/availability">Manage Availability</a>
	<?php endif; ?>
<?php else : ?>
	<a href="/api/auth/google" class="login-link">Sign in</a>
<?php endif; ?>
```

### Role-Based Template Logic
```php
// Check specific role
if (thrive_user_has_role('admin')) {
    // Show admin features
}

// Check multiple roles
$userRoles = thrive_get_user_roles();
if (in_array(ThriveRole::TEACHER, $userRoles)) {
    // Show teacher features
}
```

### Front-End JS Considerations
* JS should not attempt to read `thrive_sess` (HttpOnly). All decisions either originate in server-rendered HTML or, if absolutely needed, can be hydrated by embedding a minimal serialized context (e.g., `<script>window.__AUTH__ = <?php echo wp_json_encode(thrive_get_auth_context_array()); ?>;</script>`). Avoid unless necessary.
* For logout: link or form submit to `/api/auth/logout` (proxied to NestJS). After 302, headers will no longer be injected.

### Future Extensions (Document Before Implementing)
* Silent session refresh endpoint (extend Nginx introspection cadence).
* Role synchronization into WP for plugins that insist on native capabilities.
* Centralized permission API consumed by both WordPress and future SPA.
* Real-time revocation via short-lived access token + refresh rotation.

### Common Pitfalls & Answers
* Q: “Why does `current_user_can()` return false?” – Because we’re not creating WP users; use roles from context instead.
* Q: “I need a WP user ID for a post author.” – Create a deliberate sync routine; do NOT re-enable automatic mapping globally.
* Q: “Can I call the NestJS API directly from JS?” – Yes (same origin). Include credentials (browser sends cookie). Prefer server rendering for critical auth gating.

### Minimal Contract for Introspection Response (JSON -> X-Auth-Context)
```json
{
	"id": "uuid-or-external",
	"email": "user@example.com",
	"name": "Jane Doe",
	"roles": ["admin", "teacher"],
	"iat": 1733770000,
	"exp": 1733771800
}
```
Only `email` is strictly required for a valid context object. The `roles` array contains validated role strings that map to `ThriveRole` enum values.

### Testing Checklist
1. Start stack: `make run` (or docker-compose command per README).
2. Visit home page (unauthenticated) – login button visible.
3. Click Google sign-in – complete flow – redirected back with welcome state.
4. Inspect network request: subsequent page loads include `X-Auth-*` headers (use browser devtools -> network -> request headers via a local proxy extension, or log in PHP).
5. Logout – headers disappear; `thrive_is_logged_in()` returns false.

### Contributor DO / DON’T
DO: Add new PHP conditionals using `thrive_is_logged_in()`.
DO: Keep auth state server-driven.
DON’T: Call `is_user_logged_in()` for proxy sessions.
DON’T: Store sensitive auth data in client-readable cookies or localStorage.

---
This document is the authoritative reference for WordPress-side behavior in the hybrid auth model. Keep it updated alongside any Nginx or NestJS auth pipeline changes.
    