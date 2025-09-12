# Page Content Templates

This folder contains the HTML content templates for WordPress pages that are automatically created by the theme.

## Files

- `booking.html` - Content for the main booking page (/booking)
- `booking-confirmation.html` - Content for the booking confirmation page (/booking-confirmation)
- `booking-complete.html` - Content for the booking complete page (/booking-complete)
- `student.html` - Content for the student dashboard page (/student)
- `teacher.html` - Content for the teacher dashboard page (/teacher)
- `teacher-set-availability.html` - Content for the teacher availability page (/teacher/set-availability)

## How it works

The `includes/page-manager.php` file contains a helper function `get_page_content_from_file()` that loads these HTML files and uses their content when creating or updating WordPress pages.

This keeps the page content organized and maintainable, rather than having large blocks of HTML inline in the PHP code.

## Editing content

To modify the content of any page:
1. Edit the corresponding `.html` file in this folder
2. The changes will be applied automatically when the theme is activated or when WordPress loads
3. No need to run separate creation scripts

## Update Control

By default, existing pages will be updated with new content when the HTML files change. To prevent this (allowing manual editing in WordPress admin):

```php
// In wp-config.php or functions.php
define('THRIVE_UPDATE_PAGES', false);
```

To re-enable automatic updates:
```php
define('THRIVE_UPDATE_PAGES', true); // This is the default
```

## Block structure

All content uses WordPress Gutenberg blocks with the following format:
```html
<!-- wp:block-type {"attributes": "value"} /-->
<!-- wp:block-type -->
Content here
<!-- /wp:block-type -->
```

Custom theme blocks use the namespace `custom-theme/block-name`.
