<?php
/**
 * Unified server-rendered auth component with modal & JS.
 *
 * This template has been refactored to use WordPress core block classes
 * and generated utility classes from theme.json as much as possible.
 */
if (!defined('ABSPATH')) {
    exit;
}

$ctx = function_exists('thrive_get_auth_context') ? thrive_get_auth_context() : null;
$logged_in = function_exists('thrive_is_logged_in') ? thrive_is_logged_in() : false;

$display = '';
if ($ctx && $ctx->name) {
    $display = $ctx->name;
} elseif ($logged_in && function_exists('wp_get_current_user')) {
    $u = wp_get_current_user();
    if ($u && $u->exists()) {
        $display = $u->display_name ?: '';
    }
}

$google_url = esc_url(home_url('/api/auth/google'));
$logout_url = esc_url(home_url('/api/auth/logout'));



// Define classes using arrays to keep them clean
// Button style and alignment

// Compose button classes
$button_classes = [
    'wp-block-button__link',
    isset($attributes['buttonStyle']) && $attributes['buttonStyle'] === 'solid' ? 'is-style-thrive-solid'
    : (isset($attributes['buttonStyle']) && $attributes['buttonStyle'] === 'rounded' ? 'is-style-thrive-rounded' : 'is-style-thrive-outline'),
    isset($attributes['buttonAlign']) && $attributes['buttonAlign'] === 'left' ? 'has-text-align-left'
    : (isset($attributes['buttonAlign']) && $attributes['buttonAlign'] === 'right' ? 'has-text-align-right' : 'has-text-align-center'),
];
if (!empty($attributes['extraClass'])) {
    $button_classes[] = sanitize_html_class($attributes['extraClass']);
}

// Color classes for button
$color_class = '';
if (!empty($attributes['backgroundColor'])) {
    $color_class .= ' has-' . esc_attr($attributes['backgroundColor']) . '-background-color';
}
if (!empty($attributes['textColor'])) {
    $color_class .= ' has-' . esc_attr($attributes['textColor']) . '-color';
}

// Compose wrapper classes and styles
$wrapper_attrs = [
    'class' => 'thrive-auth-component',
    'data-thrive-auth' => true,
];
if (!empty($attributes['backgroundColor'])) {
    $wrapper_attrs['class'] .= ' has-' . esc_attr($attributes['backgroundColor']) . '-background-color';
}
if (!empty($attributes['textColor'])) {
    $wrapper_attrs['class'] .= ' has-' . esc_attr($attributes['textColor']) . '-color';
}
if (!empty($attributes['align'])) {
    $wrapper_attrs['class'] .= ' align' . esc_attr($attributes['align']);
}
if (!empty($attributes['style']) && is_array($attributes['style'])) {
    // Inline style support (from block editor)
    $style_str = '';
    foreach ($attributes['style'] as $k => $v) {
        if (is_array($v)) {
            foreach ($v as $subk => $subv) {
                $style_str .= esc_attr($k) . '-' . esc_attr($subk) . ':' . esc_attr($subv) . ';';
            }
        } else {
            $style_str .= esc_attr($k) . ':' . esc_attr($v) . ';';
        }
    }
    if ($style_str) {
        $wrapper_attrs['style'] = $style_str;
    }
}
?>
<div <?php echo get_block_wrapper_attributes($wrapper_attrs); ?>>

    <?php if ($logged_in): ?>
        <form action="<?php echo $logout_url; ?>" method="get" class="thrive-auth-form" style="display:inline;">
            <button class="<?php echo implode(' ', $button_classes) . esc_attr($color_class); ?>" type="submit">
                <?php echo esc_html($attributes['signOutText'] ?? esc_html__('Sign out', 'thrive')); ?>
                <?php if ($display)
                    echo ' ' . esc_html($display); ?>
            </button>
        </form>
    <?php else: ?>
        <button id="thrive-login-button" class="<?php echo implode(' ', $button_classes) . esc_attr($color_class); ?>"
            type="button" aria-haspopup="dialog" aria-controls="thrive-login-modal">
            <?php echo esc_html($attributes['signInText'] ?? esc_html__('Sign in', 'thrive')); ?>
        </button>

        <div id="thrive-login-modal" class="thrive-login-modal" role="dialog" aria-modal="true" aria-hidden="true"
            aria-labelledby="thrive-login-title">
            <div class="thrive-login-modal__backdrop" data-close-modal></div>
            <div class="thrive-login-modal__dialog wp-block-group has-base-background-color has-contrast-color"
                role="document">
                <button class="thrive-login-modal__close" type="button" aria-label="Close" data-close-modal>&times;</button>

                <h2 id="thrive-login-title" class="has-x-large-font-size"
                    style="margin-bottom: var(--wp--preset--spacing--20);">
                    <?php echo esc_html($attributes['modalTitle'] ?? 'Sign In'); ?>
                </h2>

                <p class="has-gray-600-color has-small-font-size"
                    style="margin-top:0; margin-bottom: var(--wp--preset--spacing--50);">
                    <?php echo esc_html($attributes['modalDescription'] ?? 'Choose a sign-in method'); ?>
                </p>

                <?php if (!empty($attributes['showGoogle'])): ?>
                    <div class="wp-block-buttons is-vertical" style="gap: var(--wp--preset--spacing--30);">
                        <div class="wp-block-button">
                            <button id="thrive-google-login" class="wp-block-button__link" type="button"
                                style="display:flex; gap: var(--wp--preset--spacing--30); align-items:center; justify-content:center; width:100%; border: 1px solid var(--wp--preset--color--gray-200); background-color: var(--wp--preset--color--base); color: var(--wp--preset--color--contrast);">
                                <span class="thrive-login-provider__icon" aria-hidden="true">G</span>
                                <span><?php esc_html_e('Continue with Google', 'thrive'); ?></span>
                            </button>
                        </div>
                    </div>
                <?php endif; ?>

                <?php if (!empty($attributes['showEmail'])): ?>
                    <form id="thrive-email-login-form" class="thrive-email-login" autocomplete="on"
                        style="margin-top: var(--wp--preset--spacing--40);">
                        <div class="thrive-field" style="margin-bottom: var(--wp--preset--spacing--40);">
                            <label for="thrive-email" class="thrive-label has-gray-900-color"
                                style="font-weight:500; margin-bottom:var(--wp--preset--spacing--20); display:block;">
                                <?php echo esc_html($attributes['emailLabel'] ?? 'Email'); ?>
                            </label>
                            <input id="thrive-email" name="email" type="email" required autocomplete="email" />
                        </div>
                        <div class="thrive-field" style="margin-bottom: var(--wp--preset--spacing--40);">
                            <label for="thrive-password" class="thrive-label has-gray-900-color"
                                style="font-weight:500; margin-bottom:var(--wp--preset--spacing--20); display:block;">
                                <?php echo esc_html($attributes['passwordLabel'] ?? 'Password'); ?>
                            </label>
                            <input id="thrive-password" name="password" type="password" required
                                autocomplete="current-password" />
                        </div>
                        <div class="thrive-field thrive-field--name wp-block-columns"
                            style="display:none; margin-bottom:var(--wp--preset--spacing--40);" id="thrive-name-fields">
                            <div class="wp-block-column">
                                <label for="thrive-first-name" class="thrive-label has-gray-900-color"
                                    style="font-weight:500; margin-bottom:var(--wp--preset--spacing--20); display:block;"><?php esc_html_e('First name', 'thrive'); ?></label>
                                <input id="thrive-first-name" name="firstName" type="text" autocomplete="given-name" />
                            </div>
                            <div class="wp-block-column">
                                <label for="thrive-last-name" class="thrive-label has-gray-900-color"
                                    style="font-weight:500; margin-bottom:var(--wp--preset--spacing--20); display:block;"><?php esc_html_e('Last name', 'thrive'); ?></label>
                                <input id="thrive-last-name" name="lastName" type="text" autocomplete="family-name" />
                            </div>
                        </div>
                        <div class="thrive-actions-row"
                            style="display:flex; justify-content:space-between; align-items:center; margin-top:var(--wp--preset--spacing--40);">
                            <button type="submit" id="thrive-email-submit"
                                class="wp-block-button__link has-primary-background-color has-base-color">
                                <?php esc_html_e('Sign in with Email', 'thrive'); ?>
                            </button>
                            <button type="button" id="thrive-toggle-register" class="thrive-link-button has-primary-color"
                                aria-pressed="false"><?php esc_html_e('Create account', 'thrive'); ?></button>
                        </div>
                        <div id="thrive-email-feedback" class="thrive-feedback has-accent-color" role="alert"
                            style="display:none; margin-top:var(--wp--preset--spacing--40);"></div>
                    </form>
                <?php endif; ?>

                <p class="has-gray-500-color has-x-small-font-size"
                    style="margin-top: var(--wp--preset--spacing--50); line-height: 1.3;">
                    <?php echo wp_kses_post(__('By continuing you agree to our <a href="#" rel="noopener">Terms</a> &amp; <a href="#" rel="noopener">Privacy Policy</a>.', 'thrive')); ?>
                </p>
            </div>
        </div>
    <?php endif; ?>
</div>
<?php if (!$logged_in): ?>
    <script id="thrive-login-auth-inline">
        (function () {
            if (window.__THRIVE_LOGIN_AUTH_INITIALIZED__) return;
            window.__THRIVE_LOGIN_AUTH_INITIALIZED__ = true;

            // console.log(attributes)
            console.log(<?php echo wp_json_encode($attributes); ?>);

            var googleUrl = <?php echo wp_json_encode($google_url); ?>;

            function qs(selector, ctx) {
                return (ctx || document).querySelector(selector);
            }
            function qa(selector, ctx) {
                return Array.from((ctx || document).querySelectorAll(selector));
            }

            function trapFocus(modal) {
                var focusable = qa(
                    'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
                    modal
                ).filter(function (el) { return !el.hasAttribute('disabled'); });
                if (!focusable.length) return;
                var first = focusable[0];
                var last = focusable[focusable.length - 1];
                modal.addEventListener('keydown', function (e) {
                    if (e.key === 'Tab') {
                        if (e.shiftKey && document.activeElement === first) {
                            e.preventDefault();
                            last.focus();
                        } else if (!e.shiftKey && document.activeElement === last) {
                            e.preventDefault();
                            first.focus();
                        }
                    } else if (e.key === 'Escape') {
                        closeModal();
                    }
                });
                first.focus();
            }

            function openModal() {
                var modal = qs('#thrive-login-modal');
                if (!modal) return;
                modal.setAttribute('aria-hidden', 'false');
                modal.classList.add('is-open');
                document.body.classList.add('thrive-modal-open');
                trapFocus(modal);
            }

            function closeModal() {
                var modal = qs('#thrive-login-modal');
                if (!modal) return;
                modal.setAttribute('aria-hidden', 'true');
                modal.classList.remove('is-open');
                document.body.classList.remove('thrive-modal-open');
                var trigger = qs('#thrive-login-button');
                if (trigger) trigger.focus();
            }

            function init() {
                var trigger = qs('#thrive-login-button');
                var modal = qs('#thrive-login-modal');
                if (!trigger || !modal) return;
                trigger.addEventListener('click', openModal);
                qa('[data-close-modal]', modal).forEach(function (btn) {
                    btn.addEventListener('click', closeModal);
                });
                modal.addEventListener('click', function (e) {
                    if (e.target === modal) closeModal();
                });
                var googleBtn = qs('#thrive-google-login');
                if (googleBtn) {
                    googleBtn.addEventListener('click', function () {
                        if (googleUrl) {
                            window.location.href = googleUrl;
                        } else {
                            console.error('Google auth URL missing');
                        }
                    });
                }
                var form = qs('#thrive-email-login-form');
                if (form) {
                    var toggle = qs('#thrive-toggle-register');
                    var nameFields = qs('#thrive-name-fields');
                    var feedback = qs('#thrive-email-feedback');
                    var submitBtn = qs('#thrive-email-submit');
                    var mode = 'login'; // or 'register'
                    function setMode(m) {
                        mode = m;
                        if (mode === 'register') {
                            nameFields.style.display = 'flex';
                            toggle.textContent = 'Have an account? Sign in';
                            submitBtn.textContent = 'Create account';
                            toggle.setAttribute('aria-pressed', 'true');
                        } else {
                            nameFields.style.display = 'none';
                            toggle.textContent = 'Create account';
                            submitBtn.textContent = 'Sign in with Email';
                            toggle.setAttribute('aria-pressed', 'false');
                        }
                    }
                    toggle.addEventListener('click', function () { setMode(mode === 'login' ? 'register' : 'login'); });
                    form.addEventListener('submit', async function (e) {
                        e.preventDefault();
                        feedback.style.display = 'none';
                        submitBtn.disabled = true; submitBtn.textContent = 'Please wait...';
                        var fd = new FormData(form);
                        var payload = Object.fromEntries(fd.entries());
                        var endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
                        try {
                            var resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                            var json = await resp.json().catch(() => ({}));
                            if (resp.ok && json.redirect) { window.location.href = json.redirect; return; }
                            throw new Error(json.message || 'Request failed');
                        } catch (err) {
                            feedback.textContent = err.message;
                            feedback.style.display = 'block';
                        } finally {
                            submitBtn.disabled = false; submitBtn.textContent = mode === 'register' ? 'Create account' : 'Sign in with Email';
                        }
                    });
                    setMode('login');
                }
            }

            document.addEventListener('DOMContentLoaded', init);
        })();
    </script>
<?php endif; ?>