<?php
declare(strict_types=1);

/**
 * Simple test script for ThriveRole enum and ThriveAuthContext integration.
 * Run this to verify the enum works correctly.
 */

// Include the required files
require_once __DIR__ . '/includes/class-thrive-role.php';
require_once __DIR__ . '/includes/class-thrive-auth-context.php';

// Test the enum
echo "Testing ThriveRole enum:\n";
echo "- Available roles: " . implode(', ', ThriveRole::values()) . "\n";
echo "- ADMIN value: " . ThriveRole::ADMIN->value . "\n";
echo "- TEACHER value: " . ThriveRole::TEACHER->value . "\n";
echo "- Is 'admin' valid? " . (ThriveRole::isValid('admin') ? 'Yes' : 'No') . "\n";
echo "- Is 'invalid' valid? " . (ThriveRole::isValid('invalid') ? 'Yes' : 'No') . "\n";

// Test enum creation from string
$adminRole = ThriveRole::tryFromString('admin');
$teacherRole = ThriveRole::tryFromString('teacher');
$invalidRole = ThriveRole::tryFromString('invalid');

echo "- Created ADMIN role: " . ($adminRole ? $adminRole->value : 'null') . "\n";
echo "- Created TEACHER role: " . ($teacherRole ? $teacherRole->value : 'null') . "\n";
echo "- Created INVALID role: " . ($invalidRole ? $invalidRole->value : 'null') . "\n";

// Test ThriveAuthContext with roles
echo "\nTesting ThriveAuthContext with enum roles:\n";
$testJson = json_encode([
    'id' => '123',
    'email' => 'test@example.com',
    'name' => 'Test User',
    'roles' => ['admin', 'teacher']
]);

$ctx = ThriveAuthContext::fromJson($testJson);
if ($ctx) {
    echo "- Context created successfully\n";
    echo "- Email: " . $ctx->email . "\n";
    echo "- Name: " . $ctx->name . "\n";
    echo "- Roles count: " . count($ctx->roles) . "\n";
    echo "- Has ADMIN role: " . (in_array(ThriveRole::ADMIN, $ctx->roles) ? 'Yes' : 'No') . "\n";
    echo "- Has TEACHER role: " . (in_array(ThriveRole::TEACHER, $ctx->roles) ? 'Yes' : 'No') . "\n";

    // Test toArray conversion
    $array = $ctx->toArray();
    echo "- Array roles: " . implode(', ', $array['roles']) . "\n";
} else {
    echo "- Failed to create context\n";
}

echo "\nTest completed!\n";
