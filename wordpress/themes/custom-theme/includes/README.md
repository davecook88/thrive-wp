# Theme Includes

This directory contains additional PHP files that extend the theme's functionality.

## Files

### `page-manager.php`
Handles automatic creation and updating of essential theme pages.

**Features:**
- Automatically creates required pages on theme activation
- Loads page content from the `page-contents/` folder
- Respects the `THRIVE_UPDATE_PAGES` flag for controlling updates

**Configuration:**
```php
// In wp-config.php or functions.php
define('THRIVE_UPDATE_PAGES', false); // Prevent overwriting manually edited pages
define('THRIVE_UPDATE_PAGES', true);  // Allow automatic updates (default)
```

**Usage:**
- Set `THRIVE_UPDATE_PAGES` to `false` when you want to edit pages in the WordPress admin without them being overwritten
- Set `THRIVE_UPDATE_PAGES` to `true` to allow automatic updates when page content files change
- The system only updates pages when the content has actually changed

**Managed Pages:**
- `/booking` - Main booking calendar page
- `/booking-confirmation` - Booking confirmation with payment
- `/booking-complete` - Post-booking success page
- `/student` - Student dashboard
- `/teacher` - Teacher dashboard
- `/teacher/set-availability` - Teacher availability management

**Adding New Pages:**
Use the `ensure_page_exists()` function:
```php
ensure_page_exists('Page Title', 'page-slug', 'content-filename', 'optional-template.php');
```
