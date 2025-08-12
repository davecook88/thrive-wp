<?php
declare(strict_types=1);

/**
 * Strongly typed representation of the reverse proxy auth context.
 *
 * Source: JSON provided via the X-Auth-Context header (or optionally a cookie).
 * Expected shape (all fields except email optional):
 *   {
 *     "id": "external-identity",    // string
 *     "email": "user@example.com",  // string (required, used for mapping)
 *     "name": "Jane Doe",           // string
 *     "roles": ["subscriber"],      // array<string>
 *     ...additional fields are retained in raw[]
 *   }
 */
final class ThriveAuthContext
{
    /** @var string|null */
    public ?string $externalId;
    /** @var string */
    public string $email;
    /** @var string|null */
    public ?string $name;
    /** @var string[] */
    public array $roles;
    /** @var array<string,mixed> */
    public array $raw; // Entire decoded payload (sanitized)

    /**
     * @param string|null $externalId
     * @param string $email
     * @param string|null $name
     * @param string[] $roles
     * @param array<string,mixed> $raw
     */
    private function __construct(?string $externalId, string $email, ?string $name, array $roles, array $raw)
    {
        $this->externalId = $externalId;
        $this->email = $email;
        $this->name = $name;
        $this->roles = $roles;
        $this->raw = $raw;
    }

    /**
     * Build from raw JSON header (already pulled from $_SERVER) or cookie value.
     * Returns null if invalid or email missing/invalid.
     *
     * @param string|null $json
     * @return self|null
     */
    public static function fromJson(?string $json): ?self
    {
        if ($json === null || $json === '') {
            error_log("Raw auth context header: $json");
            return null;
        }

        if (strlen($json) > 8192) { // Size guard
            error_log("Auth context header too large");
            return null;
        }

        try {
            /** @var mixed $decoded */
            $decoded = json_decode(wp_unslash($json), true, 32, JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_IGNORE);
        } catch (\Throwable $e) {
            error_log("Failed to decode JSON: " . $e->getMessage());
            return null;
        }

        if (!is_array($decoded)) {
            error_log("Invalid auth context structure");
            return null;
        }

        // Shallow sanitize top-level scalars used by WP mapping
        $email = isset($decoded['email']) ? sanitize_email((string) $decoded['email']) : '';
        if ($email === '' || !is_email($email)) {
            return null;
        }

        $name = isset($decoded['name']) ? wp_strip_all_tags((string) $decoded['name']) : null;
        $externalId = isset($decoded['id']) ? wp_strip_all_tags((string) $decoded['id']) : null;

        $rolesRaw = isset($decoded['roles']) && is_array($decoded['roles']) ? $decoded['roles'] : [];
        $roles = [];
        foreach ($rolesRaw as $r) {
            if (!is_string($r)) {
                continue;
            }
            $san = sanitize_key($r);
            if ($san !== '' && !in_array($san, $roles, true)) {
                $roles[] = $san;
            }
        }

        // Final canonical object
        return new self($externalId ?: null, $email, $name ?: null, $roles, $decoded);
    }

    /**
     * Apply this auth context to WordPress request lifecycle (stateless).
     * - Finds or creates the user (by email)
     * - Syncs display name & roles (if provided)
     * - Sets the current user (wp_set_current_user)
     *
     * @return int|null User ID set, or null if failure.
     */
    public function applyToWordPress(): ?int
    {
        if (!function_exists('get_user_by')) {
            return null; // Should not happen inside WP, defensive.
        }

        $user = get_user_by('email', $this->email);
        if (!$user) {
            $base = $this->deriveUsernameBase();
            $username = $this->uniqueUsername($base);
            $userId = wp_insert_user([
                'user_login' => $username,
                'user_email' => $this->email,
                'display_name' => $this->name ?: $username,
                'nickname' => $this->name ?: $username,
                'user_pass' => wp_generate_password(32),
                'role' => 'subscriber',
                'description' => $this->externalId ? 'External ID: ' . $this->externalId : '',
            ]);
            if (is_wp_error($userId)) {
                return null;
            }
            $user = get_user_by('id', (int) $userId);
        }

        if (!$user) {
            return null;
        }

        $userId = (int) $user->ID;

        // Display name sync
        if ($this->name && $this->name !== $user->display_name) {
            wp_update_user([
                'ID' => $userId,
                'display_name' => $this->name,
                'nickname' => $this->name,
            ]);
        }

        // Roles sync if supplied
        if (!empty($this->roles)) {
            global $wp_roles;
            if ($wp_roles instanceof WP_Roles) {
                $valid = array_intersect($this->roles, array_keys($wp_roles->roles));
                if (empty($valid)) {
                    $valid = ['subscriber'];
                }
                $user->set_role('');
                foreach ($valid as $vr) {
                    $user->add_role($vr);
                }
            }
        }

        wp_set_current_user($userId);
        return $userId;
    }

    /**
     * Convert to array for template usage.
     * @return array<string,mixed>
     */
    public function toArray(): array
    {
        return [
            'external_id' => $this->externalId,
            'email' => $this->email,
            'name' => $this->name,
            'roles' => $this->roles,
            'raw' => $this->raw,
            'user_id' => get_current_user_id() ?: null,
        ];
    }

    /** @return string */
    private function deriveUsernameBase(): string
    {
        if ($this->name) {
            $base = sanitize_user(strtolower(str_replace(' ', '.', $this->name)));
            if ($base !== '') {
                return $base;
            }
        }
        $local = substr($this->email, 0, (int) strpos($this->email, '@'));
        $local = sanitize_user(strtolower($local));
        return $local !== '' ? $local : 'user';
    }

    /**
     * Ensure username uniqueness.
     * @param string $base
     * @return string
     */
    private function uniqueUsername(string $base): string
    {
        $username = $base;
        $suffix = 1;
        while (username_exists($username)) {
            $username = $base . $suffix;
            $suffix++;
            if ($suffix > 50) {
                break;
            }
        }
        return $username;
    }
}
