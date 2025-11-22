<?php
/**
 * Authentication helpers that bridge Nginx/NestJS injected headers into theme.
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

function thrive_should_skip_proxy_hydration(): bool
{
    if (!thrive_request_targets_wp_login()) {
        return false;
    }

    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $forceReauth = isset($_REQUEST['reauth']) && $_REQUEST['reauth'] === '1';

    if ($method !== 'POST' && !$forceReauth) {
        return false;
    }

    static $logged = false;
    if (!$logged) {
        $reason = $forceReauth ? 'reauth request' : 'login form POST';
        error_log('[ThriveAuth] Skipping proxy hydration for wp-login ' . $reason . '.');
        $logged = true;
    }

    return true;
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