<?php
/**
 * Theme init: basic includes loaded early.
 */

// Page manager (kept in root functions loader for compatibility)
// Other includes are loaded from functions.php which decides ordering.

// Load small helper classes if present
if (file_exists(get_template_directory() . '/includes/class-thrive-auth-context.php')) {
    require_once get_template_directory() . '/includes/class-thrive-auth-context.php';
}
if (file_exists(get_template_directory() . '/includes/class-thrive-role.php')) {
    require_once get_template_directory() . '/includes/class-thrive-role.php';
}
if (file_exists(get_template_directory() . '/includes/base-rest-endpoint.php')) {
    require_once get_template_directory() . '/includes/base-rest-endpoint.php';
}

// Patterns file (optional path in some installs)
if (file_exists(get_template_directory() . '/inc/patterns.php')) {
    require_once get_template_directory() . '/inc/patterns.php';
}

?>