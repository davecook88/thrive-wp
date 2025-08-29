<?php
declare(strict_types=1);

/**
 * Enum for user roles in the Thrive system.
 * These values must match the roles sent from the NestJS backend.
 */
enum ThriveRole: string
{
    case ADMIN = 'admin';
    case TEACHER = 'teacher';

    /**
     * Get all available role values as an array of strings.
     * @return string[]
     */
    public static function values(): array
    {
        return array_map(fn($case) => $case->value, self::cases());
    }

    /**
     * Check if a string value is a valid role.
     * @param string $value
     * @return bool
     */
    public static function isValid(string $value): bool
    {
        return in_array($value, self::values(), true);
    }

    /**
     * Try to create a ThriveRole from a string value.
     * @param string $value
     * @return self|null
     */
    public static function tryFromString(string $value): ?self
    {
        foreach (self::cases() as $case) {
            if ($case->value === $value) {
                return $case;
            }
        }
        return null;
    }
}
