<?php
/**
 * Authentication helpers that bridge Nginx/NestJS injected headers into theme.
 *
 * IMPORTANT: Thrive auth (via Google OAuth) and WordPress native auth are separate systems.
 * - Thrive auth: Uses thrive_sess cookie validated by NestJS, injected via X-Auth-Context header
 * - WP native auth: Uses wordpress_logged_in_* cookies, validated by WordPress core
 *
 * This file bridges them, but WP admin users should NOT be overwritten by Thrive auth.
 */

/**
 * Check if the current request is targeting wp-login.php
 */
function thrive_request_targets_wp_login(): bool
{
    global $pagenow;
    if (isset($pagenow) && $pagenow === 'wp-login.php') {
        return true;
    }

    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    return $requestUri !== '' && strpos($requestUri, 'wp-login.php') !== false;
}

/**
 * Check if the current request is in the wp-admin area
 */
function thrive_request_is_wp_admin(): bool
{
    // Check if this is an admin request
    if (is_admin()) {
        return true;
    }

    // Also check URI for early detection before is_admin() is available
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    return strpos($requestUri, '/wp-admin') !== false;
}

/**
 * Check if the user is already authenticated via WordPress native auth.
 * This runs BEFORE we potentially override with Thrive auth.
 *
 * @return bool True if user has a valid WordPress session (logged in via wp-login.php)
 */
function thrive_user_has_native_wp_session(): bool
{
    // Check for WordPress auth cookies (they start with wordpress_logged_in_)
    foreach ($_COOKIE as $name => $value) {
        if (strpos($name, 'wordpress_logged_in_') === 0 && !empty($value)) {
            return true;
        }
    }
    return false;
}

/**
 * Check if the currently logged-in WP user (via native auth) is an administrator.
 * This is used to determine if we should skip Thrive auth override in wp-admin.
 *
 * @return bool True if current WP session user is an admin
 */
function thrive_native_wp_user_is_admin(): bool
{
    if (!thrive_user_has_native_wp_session()) {
        return false;
    }

    // Validate the WordPress cookie and get the user
    $userId = wp_validate_auth_cookie('', 'logged_in');
    if (!$userId) {
        return false;
    }

    $user = get_user_by('id', $userId);
    if (!$user) {
        return false;
    }

    return user_can($user, 'manage_options');
}

/**
 * Determine if we should skip Thrive proxy hydration for this request.
 *
 * Skip in these cases:
 * 1. wp-login.php POST (user is actively logging in via WP native form)
 * 2. wp-login.php with reauth=1 (user is re-authenticating)
 * 3. In wp-admin area AND user already has a valid WP admin session
 *
 * This prevents Thrive auth from overwriting WP admin credentials.
 */
function thrive_should_skip_proxy_hydration(): bool
{
    // Case 1 & 2: Skip during wp-login.php form submissions
    if (thrive_request_targets_wp_login()) {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $forceReauth = isset($_REQUEST['reauth']) && $_REQUEST['reauth'] === '1';

        if ($method === 'POST' || $forceReauth) {
            static $loginLogged = false;
            if (!$loginLogged) {
                $reason = $forceReauth ? 'reauth request' : 'login form POST';
                error_log('[ThriveAuth] Skipping proxy hydration for wp-login ' . $reason . '.');
                $loginLogged = true;
            }
            return true;
        }
    }

    // Case 3: In wp-admin with existing WP admin session - don't override!
    if (thrive_request_is_wp_admin() && thrive_native_wp_user_is_admin()) {
        static $adminLogged = false;
        if (!$adminLogged) {
            error_log('[ThriveAuth] Skipping proxy hydration - user has valid WP admin session in wp-admin area.');
            $adminLogged = true;
        }
        return true;
    }

    return false;
}

function thrive_hydrate_user_from_proxy(): void
{
    $rawHeader = $_SERVER['HTTP_X_AUTH_CONTEXT'] ?? '';
    $ctx = ThriveAuthContext::fromJson($rawHeader);
    if ($ctx === null) {
        return;
    }

    if (thrive_should_skip_proxy_hydration()) {
        return;
    }

    $GLOBALS['thrive_auth_context'] = $ctx;
    // Sync user to WP database and log them in
    $ctx->applyToWordPress();
}
add_action('init', 'thrive_hydrate_user_from_proxy', 1);

/**
 * Force manual wp-login flows back into /wp-admin/ so proxy hydration resumes immediately.
 *
 * @param string $redirectTo
 * @param string $requestedRedirectTo
 * @param mixed $user WP_User|WP_Error
 * @return string
 */
function thrive_redirect_manual_login_to_admin(string $redirectTo, string $requestedRedirectTo, $user): string
{
    if (!thrive_request_targets_wp_login()) {
        return $redirectTo;
    }

    if (is_wp_error($user)) {
        return $redirectTo;
    }

    return admin_url();
}
add_filter('login_redirect', 'thrive_redirect_manual_login_to_admin', 99, 3);

function thrive_get_auth_context(): ?ThriveAuthContext
{
    $ctx = $GLOBALS['thrive_auth_context'] ?? null;
    return $ctx instanceof ThriveAuthContext ? $ctx : null;
}

function thrive_is_logged_in(): bool
{
    if (thrive_get_auth_context() instanceof ThriveAuthContext) {
        return true;
    }
    if (!empty($_SERVER['HTTP_X_AUTH_EMAIL'])) {
        return true;
    }
    $cookieName = $_ENV['SESSION_COOKIE_NAME'] ?? 'thrive_sess';
    return isset($_COOKIE[$cookieName]) && $_COOKIE[$cookieName] !== '';
}

function thrive_get_auth_context_array(): ?array
{
    $ctx = thrive_get_auth_context();
    return $ctx ? $ctx->toArray() : null;
}

function thrive_user_has_role(string|ThriveRole $role): bool
{
    $ctx = thrive_get_auth_context();
    if (!$ctx) {
        return false;
    }

    $roleValue = is_string($role) ? $role : $role->value;
    return in_array($roleValue, array_map(fn(ThriveRole $r) => $r->value, $ctx->roles), true);
}

function thrive_is_admin(): bool
{
    return thrive_user_has_role(ThriveRole::ADMIN);
}

function thrive_is_teacher(): bool
{
    return thrive_user_has_role(ThriveRole::TEACHER);
}

function thrive_get_user_roles(): array
{
    $ctx = thrive_get_auth_context();
    return $ctx ? $ctx->roles : [];
}

function thrive_get_user_role_strings(): array
{
    $ctx = thrive_get_auth_context();
    return $ctx ? array_map(fn(ThriveRole $role) => $role->value, $ctx->roles) : [];
}

function thrive_is_student(): bool
{
    return thrive_user_has_role(ThriveRole::STUDENT);
}

function thrive_get_primary_role(): ?string
{
    $roles = thrive_get_user_role_strings();
    if (empty($roles)) {
        return null;
    }
    // Priority: admin > teacher > student
    if (in_array('admin', $roles)) {
        return 'admin';
    }
    if (in_array('teacher', $roles)) {
        return 'teacher';
    }
    if (in_array('student', $roles)) {
        return 'student';
    }
    return $roles[0];
}

?>