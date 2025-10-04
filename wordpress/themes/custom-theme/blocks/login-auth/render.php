<?php
/**
 * Server-rendered Thrive Login/Auth block.
 *
 * This file has been refactored to be a self-contained block renderer,
 * making it easier to maintain and understand. It uses the block attributes
 * to dynamically control the output.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-attributes/
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Get the authentication context from the Thrive platform.
$ctx = function_exists('thrive_get_auth_context') ? thrive_get_auth_context() : null;
$is_logged_in = $ctx !== null;

$current_path = isset($_SERVER['REQUEST_URI']) ? wp_unslash($_SERVER['REQUEST_URI']) : '/';
// Prepare URLs for the auth actions. Use /api/auth/google/start and include the current path
// so the NestJS service can return the user to the page they started on.
$google_url = esc_url(home_url('/api/auth/google/start?redirect=' . rawurlencode($current_path)));
$logout_url = esc_url(home_url('/api/auth/logout'));

// A helper class to manage the block's attributes and classes.
class Thrive_Login_Auth_Block
{
    private $attributes;

    public function __construct($attributes)
    {
        $this->attributes = array_merge(
            [
                'signInText' => 'Sign in',
                'signOutText' => 'Sign out',
                'buttonStyle' => 'outline',
                'buttonAlign' => 'center',
                'buttonColor' => 'primary',
                'modalTitle' => 'Sign In',
                'modalDescription' => 'Choose a sign-in method',
                'showGoogle' => true,
                'showEmail' => true,
                'emailLabel' => 'Email',
                'passwordLabel' => 'Password',
                'extraClass' => '',
            ],
            $attributes
        );
    }

    public function get_wrapper_attributes()
    {
        $classes = ['thrive-auth-component'];
        if (!empty($this->attributes['extraClass'])) {
            $classes[] = sanitize_html_class($this->attributes['extraClass']);
        }
        if (!empty($this->attributes['align'])) {
            $classes[] = 'align' . esc_attr($this->attributes['align']);
        }
        $all_classes = get_block_wrapper_attributes(['class' => implode(' ', $classes)]);
        error_log("get_block_wrapper_attributes: $all_classes");
        return $all_classes;
    }

    public function get_button_classes()
    {
        $classes = ['wp-block-button__link'];
        $style = $this->attributes['buttonStyle'];
        $classes[] = 'is-style-thrive-' . $style;
        return implode(' ', $classes);
    }

    public function get_attribute($name)
    {
        return $this->attributes[$name] ?? null;
    }
}

$block = new Thrive_Login_Auth_Block($attributes);

?>

<div <?php echo $block->get_wrapper_attributes(); ?>>
    <?php if ($is_logged_in): ?>
        <form action="<?php echo $logout_url; ?>" method="get" class="thrive-auth-form" style="display:inline;">
            <button class="has-primary-background-color <?php echo $block->get_button_classes(); ?>" type="submit"
                onclick="window.dispatchEvent(new CustomEvent('thrive:auth:logout'));">
                <?php echo esc_html($block->get_attribute('signOutText')); ?>
                <?php if ($ctx->name)
                    echo ' ' . esc_html($ctx->name); ?>
            </button>
        </form>
    <?php else: ?>
        <button id="thrive-login-button" class="has-primary-background-color <?php echo $block->get_button_classes(); ?>"
            type="button" aria-haspopup="dialog" aria-controls="thrive-login-modal">
            <?php echo esc_html($block->get_attribute('signInText')); ?>
        </button>

        <div id="thrive-login-modal" class="thrive-login-modal" role="dialog" aria-modal="true" aria-hidden="true"
            aria-labelledby="thrive-login-title">
            <div class="thrive-login-modal__backdrop" data-close-modal></div>
            <div class="thrive-login-modal__dialog wp-block-group has-base-background-color has-contrast-color"
                role="document">
                <button class="thrive-login-modal__close" type="button" aria-label="Close" data-close-modal>&times;</button>

                <h2 id="thrive-login-title" class="has-x-large-font-size"
                    style="margin-bottom: var(--wp--preset--spacing--20);">
                    <?php echo esc_html($block->get_attribute('modalTitle')); ?>
                </h2>

                <p class="has-gray-600-color has-small-font-size"
                    style="margin-top:0; margin-bottom: var(--wp--preset--spacing--50);">
                    <?php echo esc_html($block->get_attribute('modalDescription')); ?>
                </p>

                <?php if ($block->get_attribute('showGoogle')): ?>
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

                <?php if ($block->get_attribute('showEmail')): ?>
                    <form id="thrive-email-login-form" class="thrive-email-login" autocomplete="on"
                        style="margin-top: var(--wp--preset--spacing--40);">
                        <div class="thrive-field" style="margin-bottom: var(--wp--preset--spacing--40);">
                            <label for="thrive-email" class="thrive-label has-gray-900-color"
                                style="font-weight:500; margin-bottom:var(--wp--preset--spacing--20); display:block;">
                                <?php echo esc_html($block->get_attribute('emailLabel')); ?>
                            </label>
                            <input id="thrive-email" name="email" type="email" required autocomplete="email" />
                        </div>
                        <div class="thrive-field" style="margin-bottom: var(--wp--preset--spacing--40);">
                            <label for="thrive-password" class="thrive-label has-gray-900-color"
                                style="font-weight:500; margin-bottom:var(--wp--preset--spacing--20); display:block;">
                                <?php echo esc_html($block->get_attribute('passwordLabel')); ?>
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

        <script id="thrive-login-auth-inline-<?php echo esc_attr(uniqid()); ?>">
            (function () {
                if (window.__THRIVE_LOGIN_AUTH_INITIALIZED__) return;
                window.__THRIVE_LOGIN_AUTH_INITIALIZED__ = true;

                const attributes = <?php echo wp_json_encode($attributes); ?>;
                const googleUrl = <?php echo wp_json_encode($google_url); ?>;

                function qs(selector, ctx) { return (ctx || document).querySelector(selector); }
                function qa(selector, ctx) { return Array.from((ctx || document).querySelectorAll(selector)); }

                function trapFocus(modal) {
                    const focusable = qa('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', modal).filter(el => !el.hasAttribute('disabled'));
                    if (!focusable.length) return;
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
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
                    const modal = qs('#thrive-login-modal');
                    if (!modal) return;
                    modal.setAttribute('aria-hidden', 'false');
                    modal.classList.add('is-open');
                    document.body.classList.add('thrive-modal-open');
                    trapFocus(modal);
                }

                function closeModal() {
                    const modal = qs('#thrive-login-modal');
                    if (!modal) return;
                    modal.setAttribute('aria-hidden', 'true');
                    modal.classList.remove('is-open');
                    document.body.classList.remove('thrive-modal-open');
                    const trigger = qs('#thrive-login-button');
                    if (trigger) trigger.focus();
                }

                function init() {
                    const trigger = qs('#thrive-login-button');
                    const modal = qs('#thrive-login-modal');
                    if (!trigger || !modal) return;

                    trigger.addEventListener('click', openModal);
                    qa('[data-close-modal]', modal).forEach(btn => btn.addEventListener('click', closeModal));
                    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

                    if (attributes.showGoogle) {
                        const googleBtn = qs('#thrive-google-login');
                        if (googleBtn) {
                            googleBtn.addEventListener('click', () => {
                                if (googleUrl) {
                                    window.location.href = googleUrl;
                                } else {
                                    console.error('Google auth URL missing');
                                }
                            });
                        }
                    }

                    if (attributes.showEmail) {
                        const form = qs('#thrive-email-login-form');
                        if (!form) return;

                        const toggle = qs('#thrive-toggle-register');
                        const nameFields = qs('#thrive-name-fields');
                        const feedback = qs('#thrive-email-feedback');
                        const submitBtn = qs('#thrive-email-submit');
                        let mode = 'login'; // or 'register'

                        function setMode(m) {
                            mode = m;
                            nameFields.style.display = mode === 'register' ? 'flex' : 'none';
                            toggle.textContent = mode === 'register' ? 'Have an account? Sign in' : 'Create account';
                            submitBtn.textContent = mode === 'register' ? 'Create account' : 'Sign in with Email';
                            toggle.setAttribute('aria-pressed', mode === 'register');
                        }

                        toggle.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));

                        form.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            feedback.style.display = 'none';
                            submitBtn.disabled = true;
                            submitBtn.textContent = 'Please wait...';

                            const payload = Object.fromEntries(new FormData(form).entries());
                            const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';

                            try {
                                const resp = await fetch(endpoint, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                });
                                const json = await resp.json().catch(() => ({}));
                                if (resp.ok && json.redirect) {
                                    // Dispatch login event before redirect
                                    window.dispatchEvent(new CustomEvent('thrive:auth:login'));
                                    window.location.href = json.redirect;
                                    return;
                                }
                                throw new Error(json.message || 'Request failed');
                            } catch (err) {
                                feedback.textContent = err.message;
                                feedback.style.display = 'block';
                            } finally {
                                submitBtn.disabled = false;
                                setMode(mode); // Reset button text
                            }
                        });
                        setMode('login');
                    }
                }
                // Defer script execution until the DOM is fully loaded.
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', init);
                } else {
                    init();
                }
            })();
        </script>
    <?php endif; ?>
</div>