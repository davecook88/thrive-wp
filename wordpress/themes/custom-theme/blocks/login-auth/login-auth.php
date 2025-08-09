<?php
/**
 * Unified server-rendered auth component with modal & JS.
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
    // Only attempt WP user object if native auth exists (legacy compatibility)
    $u = wp_get_current_user();
    if ($u && $u->exists()) {
        $display = $u->display_name ?: '';
    }
}

$google_url = esc_url(home_url('/api/auth/google'));
$logout_url = esc_url(home_url('/api/auth/logout'));
?>
<div class="thrive-auth-component" data-thrive-auth>
    <?php if ($logged_in): ?>
        <form action="<?php echo $logout_url; ?>" method="get" class="thrive-auth-form" style="display:inline;">
            <button class="thrive-login-button" type="submit">Sign
                out<?php echo $display ? ' ' . esc_html($display) : ''; ?></button>
        </form>
    <?php else: ?>
        <button id="thrive-login-button" class="thrive-login-button" type="button" aria-haspopup="dialog"
            aria-controls="thrive-login-modal">Sign in</button>
        <div id="thrive-login-modal" class="thrive-login-modal" role="dialog" aria-modal="true" aria-hidden="true"
            aria-labelledby="thrive-login-title">
            <div class="thrive-login-modal__backdrop" data-close-modal></div>
            <div class="thrive-login-modal__dialog" role="document">
                <button class="thrive-login-modal__close" type="button" aria-label="Close" data-close-modal>&times;</button>
                <h2 id="thrive-login-title">Sign In</h2>
                <p class="thrive-login-modal__subtitle">Choose a sign-in method</p>
                <div class="thrive-login-modal__actions">
                    <button id="thrive-google-login" class="thrive-login-provider thrive-login-provider--google"
                        type="button">
                        <span class="thrive-login-provider__icon" aria-hidden="true">G</span>
                        <span>Continue with Google</span>
                    </button>
                    <form id="thrive-email-login-form" class="thrive-email-login" autocomplete="on">
                        <div class="thrive-field">
                            <label for="thrive-email" class="thrive-label">Email</label>
                            <input id="thrive-email" name="email" type="email" required autocomplete="email" />
                        </div>
                        <div class="thrive-field">
                            <label for="thrive-password" class="thrive-label">Password</label>
                            <input id="thrive-password" name="password" type="password" required
                                autocomplete="current-password" />
                        </div>
                        <div class="thrive-field thrive-field--name" style="display:none;" id="thrive-name-fields">
                            <div>
                                <label for="thrive-first-name" class="thrive-label">First name</label>
                                <input id="thrive-first-name" name="firstName" type="text" autocomplete="given-name" />
                            </div>
                            <div>
                                <label for="thrive-last-name" class="thrive-label">Last name</label>
                                <input id="thrive-last-name" name="lastName" type="text" autocomplete="family-name" />
                            </div>
                        </div>
                        <div class="thrive-actions-row">
                            <button type="submit" id="thrive-email-submit"
                                class="thrive-login-provider thrive-login-provider--primary">Sign in with Email</button>
                            <button type="button" id="thrive-toggle-register" class="thrive-link-button"
                                aria-pressed="false">Create account</button>
                        </div>
                        <div id="thrive-email-feedback" class="thrive-feedback" role="alert" style="display:none;"></div>
                    </form>
                </div>
                <p class="thrive-login-modal__disclaimer">By continuing you agree to our <a href="#"
                        rel="noopener">Terms</a> &amp; <a href="#" rel="noopener">Privacy Policy</a>.</p>
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
                        var endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
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