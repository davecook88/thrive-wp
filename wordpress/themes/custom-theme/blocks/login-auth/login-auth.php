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
$button_classes = [
    'wp-block-button__link',
    'is-style-thrive-outline',
    'has-text-align-center',
];
?>
<div class="thrive-auth-component" data-thrive-auth>
    <?php if ($logged_in): ?>
        <form action="<?php echo $logout_url; ?>" method="get" class="thrive-auth-form" style="display:inline;">
            <button class="<?php echo implode(' ', $button_classes); ?>" type="submit">
                <?php printf(
                    /* translators: %s: User's display name. */
                    esc_html__('Sign out %s', 'thrive'),
                    $display ? esc_html($display) : ''
                ); ?>
            </button>
        </form>
    <?php else: ?>
        <button id="thrive-login-button" class="<?php echo implode(' ', $button_classes); ?>" type="button"
            aria-haspopup="dialog" aria-controls="thrive-login-modal">
            <?php esc_html_e('Sign in', 'thrive'); ?>
        </button>

        <div id="thrive-login-modal" class="thrive-login-modal" role="dialog" aria-modal="true" aria-hidden="true"
            aria-labelledby="thrive-login-title">
            <div class="thrive-login-modal__backdrop" data-close-modal></div>
            <div class="thrive-login-modal__dialog wp-block-group has-base-background-color has-contrast-color"
                role="document">
                <button class="thrive-login-modal__close" type="button" aria-label="Close" data-close-modal>&times;</button>

                <h2 id="thrive-login-title" class="has-x-large-font-size"
                    style="margin-bottom: var(--wp--preset--spacing--20);">
                    <?php esc_html_e('Sign In', 'thrive'); ?>
                </h2>

                <p class="has-gray-600-color has-small-font-size"
                    style="margin-top:0; margin-bottom: var(--wp--preset--spacing--50);">
                    <?php esc_html_e('Choose a sign-in method', 'thrive'); ?>
                </p>

                <div class="wp-block-buttons is-vertical" style="gap: var(--wp--preset--spacing--30);">
                    <div class="wp-block-button">
                        <button id="thrive-google-login" class="wp-block-button__link" type="button"
                            style="display:flex; gap: var(--wp--preset--spacing--30); align-items:center; justify-content:center; width:100%; border: 1px solid var(--wp--preset--color--gray-200); background-color: var(--wp--preset--color--base); color: var(--wp--preset--color--contrast);">
                            <span class="thrive-login-provider__icon" aria-hidden="true">G</span>
                            <span><?php esc_html_e('Continue with Google', 'thrive'); ?></span>
                        </button>
                    </div>
                </div>

                <form id="thrive-email-login-form" class="thrive-email-login" autocomplete="on"
                    style="margin-top: var(--wp--preset--spacing--40);">
                    <div class="thrive-field" style="margin-bottom: var(--wp--preset--spacing--40);">
                        <label for="thrive-email" class="thrive-label has-gray-900-color"
                            style="font-weight:500; margin-bottom:var(--wp--preset--spacing--20); display:block;"><?php esc_html_e('Email', 'thrive'); ?></label>
                        <input id="thrive-email" name="email" type="email" required autocomplete="email" />
                    </div>
                    <div class="thrive-field" style="margin-bottom: var(--wp--preset--spacing--40);">
                        <label for="thrive-password" class="thrive-label has-gray-900-color"
                            style="font-weight:500; margin-bottom:var(--wp--preset--spacing--20); display:block;"><?php esc_html_e('Password', 'thrive'); ?></label>
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
                            class="wp-block-button__link has-primary-background-color has-base-color"><?php esc_html_e('Sign in with Email', 'thrive'); ?></button>
                        <button type="button" id="thrive-toggle-register" class="thrive-link-button has-primary-color"
                            aria-pressed="false"><?php esc_html_e('Create account', 'thrive'); ?></button>
                    </div>
                    <div id="thrive-email-feedback" class="thrive-feedback has-accent-color" role="alert"
                        style="display:none; margin-top:var(--wp--preset--spacing--40);"></div>
                </form>

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