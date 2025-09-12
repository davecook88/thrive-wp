<?php
/**
 * Booking Session Details Block
 * 
 * @param array $attributes Block attributes.
 */

// Get block attributes
$heading = $attributes['heading'] ?? 'Session Details';
$show_teacher_name = $attributes['showTeacherName'] ?? true;
$show_date_time = $attributes['showDateTime'] ?? true;
$date_time_format = $attributes['dateTimeFormat'] ?? 'F j, Y g:i A T';
$error_message = $attributes['errorMessage'] ?? 'Please ensure you have valid booking details in your URL.';

// Extract and validate query params (same as original template)
$start = isset($_GET['start']) ? sanitize_text_field(wp_unslash($_GET['start'])) : '';
$end = isset($_GET['end']) ? sanitize_text_field(wp_unslash($_GET['end'])) : '';
$teacher = isset($_GET['teacher']) ? sanitize_text_field(wp_unslash($_GET['teacher'])) : '';
$teacher = preg_replace('/\D+/', '', (string) $teacher);

// Basic ISO validation
$is_iso_like = function ($s) {
    return is_string($s)
        && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?Z$/', $s);
};

$errors = [];
if (!$is_iso_like($start)) {
    $errors[] = 'Invalid or missing start time.';
}
if (!$is_iso_like($end)) {
    $errors[] = 'Invalid or missing end time.';
}
if ($teacher === '' || !ctype_digit($teacher)) {
    $errors[] = 'Invalid or missing teacher.';
}

// Check login status
$is_logged_in = function_exists('thrive_is_logged_in') && thrive_is_logged_in();

// Get wrapper attributes
$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'booking-session-details-block'
]);

?>
<div <?php echo $wrapper_attributes; ?>>
    <section style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;">
        <h3 style="margin:0 0 12px 0;color:#374151;"><?php echo esc_html($heading); ?></h3>
        
        <?php if (!empty($errors)): ?>
            <div class="notice notice-error" style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:10px;">
                <p style="margin:0;"><?php echo esc_html($error_message); ?></p>
                <ul style="margin:8px 0 0 18px;">
                    <?php foreach ($errors as $error): ?>
                        <li><?php echo esc_html($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php elseif (!$is_logged_in): ?>
            <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:16px 18px;">
                <p style="margin:0 0 10px 0;">Please sign in to view session details.</p>
                <?php
                global $wp;
                $path = home_url(add_query_arg(array(), $wp->request));
                $query = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? ('?' . sanitize_text_field(wp_unslash($_SERVER['QUERY_STRING']))) : '';
                $redirect_to = $path . $query;
                ?>
                <a class="button button-primary" 
                   href="<?php echo esc_url('/api/auth/google?redirect=' . rawurlencode($redirect_to)); ?>">
                   Sign in with Google
                </a>
            </div>
        <?php else: ?>
            <div style="display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:center;">
                <?php if ($show_date_time): ?>
                    <div style="color:#6b7280;font-weight:600;">Start Time</div>
                    <div>
                        <?php 
                        try {
                            $start_dt = new DateTime($start);
                            echo esc_html($start_dt->format($date_time_format));
                        } catch (Exception $e) {
                            echo esc_html($start);
                        }
                        ?>
                    </div>
                    <div style="color:#6b7280;font-weight:600;">End Time</div>
                    <div>
                        <?php 
                        try {
                            $end_dt = new DateTime($end);
                            echo esc_html($end_dt->format($date_time_format));
                        } catch (Exception $e) {
                            echo esc_html($end);
                        }
                        ?>
                    </div>
                <?php endif; ?>
                
                <?php if ($show_teacher_name): ?>
                    <div style="color:#6b7280;font-weight:600;">Teacher</div>
                    <div>
                        <?php
                        // Try to fetch teacher name from API
                        $teacher_name = "Teacher #" . esc_html($teacher);
                        if (function_exists('wp_remote_get')) {
                            $response = wp_remote_get("http://nestjs:3000/teachers/{$teacher}");
                            if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                                $teacher_data = json_decode(wp_remote_retrieve_body($response), true);
                                if (isset($teacher_data['displayName'])) {
                                    $teacher_name = esc_html($teacher_data['displayName']);
                                }
                            }
                        }
                        echo $teacher_name;
                        ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </section>
</div>