<?php
/**
 * Script to seed WordPress users for development.
 * Can be run via CLI or browser (if accessible).
 * 
 * Usage (CLI): wp eval-file seed-wp-users.php
 * Usage (Browser): http://localhost:8080/wp-content/themes/custom-theme/scripts/seed-wp-users.php
 */

// Load WordPress if not already loaded
if (!defined('ABSPATH')) {
    $possible_paths = [
        dirname(__FILE__) . '/../../../../wp-load.php', // From theme/scripts/
        dirname(__FILE__) . '/../../../wp-load.php',    // From theme/
    ];
    
    foreach ($possible_paths as $path) {
        if (file_exists($path)) {
            require_once($path);
            break;
        }
    }
}

if (!defined('ABSPATH')) {
    die("Could not load WordPress. Please check the path to wp-load.php.");
}

// Users to seed
$users = [
    [
        'email' => 'admin@thrive.com',
        'login' => 'admin@thrive.com', // Use email as login for consistency with NestJS
        'password' => 'thrive_test_123',
        'role' => 'administrator',
        'display_name' => 'Test Admin'
    ],
    [
        'email' => 'teacher@thrive.com',
        'login' => 'teacher@thrive.com',
        'password' => 'thrive_test_123',
        'role' => 'editor', // Mapping teacher to editor for now
        'display_name' => 'Test Teacher'
    ],
    [
        'email' => 'student@thrive.com',
        'login' => 'student@thrive.com',
        'password' => 'thrive_test_123',
        'role' => 'subscriber',
        'display_name' => 'Test Student'
    ]
];

echo "<h2>Seeding WordPress Users...</h2>";

foreach ($users as $u) {
    $user = get_user_by('email', $u['email']);
    
    if ($user) {
        echo "User <strong>{$u['email']}</strong> exists (ID: {$user->ID}). Updating...<br>";
        
        // Update password
        wp_set_password($u['password'], $user->ID);
        
        // Update role
        $user_obj = new WP_User($user->ID);
        $user_obj->set_role($u['role']);
        
        // Update display name
        wp_update_user([
            'ID' => $user->ID,
            'display_name' => $u['display_name']
        ]);
        
        echo "Updated password and role to '{$u['role']}'.<br>";
    } else {
        echo "Creating user <strong>{$u['email']}</strong>...<br>";
        
        $user_id = wp_insert_user([
            'user_login' => $u['login'],
            'user_pass' => $u['password'],
            'user_email' => $u['email'],
            'role' => $u['role'],
            'display_name' => $u['display_name']
        ]);
        
        if (is_wp_error($user_id)) {
            echo "Error: " . $user_id->get_error_message() . "<br>";
        } else {
            echo "Created with ID: {$user_id}.<br>";
        }
    }
    echo "<hr>";
}

echo "<h3>Seeding Complete.</h3>";
