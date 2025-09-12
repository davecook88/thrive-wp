<?php
/**
 * Conditional Stripe Payment Block
 * 
 * @param array $attributes Block attributes.
 */

// Get block attributes
$heading = $attributes['heading'] ?? 'Complete Your Payment';
$select_package_message = $attributes['selectPackageMessage'] ?? 'Please select a package above to continue with payment.';
$confirm_button_text = $attributes['confirmButtonText'] ?? 'Confirm and Pay';
$cancel_button_text = $attributes['cancelButtonText'] ?? 'Cancel';
$loading_text = $attributes['loadingText'] ?? 'Preparing secure payment...';
$show_back_link = $attributes['showBackLink'] ?? true;
$back_link_url = $attributes['backLinkUrl'] ?? '/booking';
$back_link_text = $attributes['backLinkText'] ?? 'Back to Calendar';

// Check if user is logged in
$is_logged_in = function_exists('thrive_is_logged_in') && thrive_is_logged_in();

// Get booking params for the payment session
$start = isset($_GET['start']) ? sanitize_text_field(wp_unslash($_GET['start'])) : '';
$end = isset($_GET['end']) ? sanitize_text_field(wp_unslash($_GET['end'])) : '';
$teacher = isset($_GET['teacher']) ? sanitize_text_field(wp_unslash($_GET['teacher'])) : '';

// Get wrapper attributes
$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'conditional-stripe-payment-block'
]);

?>
<div <?php echo $wrapper_attributes; ?>>
    <?php if ($is_logged_in): ?>
        <div class="stripe-payment-container">
            <h3 style="margin:0 0 12px 0;"><?php echo esc_html($heading); ?></h3>
            
            <!-- Package not selected state -->
            <div id="no-package-selected" class="payment-state" style="display:block;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:16px 18px;text-align:center;">
                    <p style="margin:0;"><?php echo esc_html($select_package_message); ?></p>
                </div>
            </div>
            
            <!-- Payment form state -->
            <div id="payment-form" class="payment-state" style="display:none;">
                <div style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
                    <div id="selected-package-info" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-bottom:16px;">
                        <div style="font-weight:600;color:#0c4a6e;">Selected Package:</div>
                        <div id="selected-package-name" style="color:#0c4a6e;"></div>
                    </div>
                    
                    <div id="payment-element"><!-- Stripe Payment Element injects here --></div>
                    <div id="payment-messages" role="alert" style="margin-top:10px;color:#991b1b;display:none;"></div>
                    
                    <div style="display:flex;gap:10px;align-items:center;margin-top:14px;">
                        <button id="thrive-pay-button" class="button button-primary" disabled>
                            <?php echo esc_html($confirm_button_text); ?>
                        </button>
                        <?php if ($show_back_link): ?>
                            <a href="<?php echo esc_url($back_link_url); ?>" class="button">
                                <?php echo esc_html($cancel_button_text); ?>
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
                <p id="thrive-payment-loader" style="margin-top:10px;color:#6b7280;">
                    <?php echo esc_html($loading_text); ?>
                </p>
            </div>
        </div>

        <script>
        (function() {
            let stripe = null;
            let elements = null;
            let selectedPackage = null;
            let paymentElement = null;
            
            const noPackageDiv = document.getElementById('no-package-selected');
            const paymentFormDiv = document.getElementById('payment-form');
            const selectedPackageNameEl = document.getElementById('selected-package-name');
            const payButton = document.getElementById('thrive-pay-button');
            const loader = document.getElementById('thrive-payment-loader');
            const messages = document.getElementById('payment-messages');
            
            // Listen for package selection events
            document.addEventListener('packageSelected', async (event) => {
                selectedPackage = event.detail;
                
                // Update UI to show payment form
                noPackageDiv.style.display = 'none';
                paymentFormDiv.style.display = 'block';
                selectedPackageNameEl.textContent = selectedPackage.name;
                
                // Initialize Stripe if not already done
                if (!stripe) {
                    try {
                        const stripeKeyResponse = await fetch('/api/payments/stripe-key');
                        const { publishableKey } = await stripeKeyResponse.json();
                        
                        stripe = Stripe(publishableKey);
                    } catch (error) {
                        console.error('Failed to initialize Stripe:', error);
                        showMessage('Failed to initialize payment system.');
                        return;
                    }
                }
                
                // Create payment session
                try {
                    const sessionResponse = await fetch('/api/payments/create-session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            priceId: selectedPackage.priceId,
                            bookingData: {
                                start: '<?php echo esc_js($start); ?>',
                                end: '<?php echo esc_js($end); ?>',
                                teacher: '<?php echo esc_js($teacher); ?>'
                            }
                        }),
                    });
                    
                    if (!sessionResponse.ok) {
                        throw new Error('Failed to create payment session');
                    }
                    
                    const { clientSecret } = await sessionResponse.json();
                    
                    // Create elements instance with clientSecret
                    elements = stripe.elements({
                        clientSecret: clientSecret
                    });
                    
                    // Create payment element
                    paymentElement = elements.create('payment', {
                        layout: 'tabs',
                    });
                    
                    paymentElement.mount('#payment-element');
                    paymentElement.on('ready', () => {
                        loader.style.display = 'none';
                        payButton.disabled = false;
                    });
                    
                    // Handle payment submission
                    payButton.onclick = async () => {
                        payButton.disabled = true;
                        payButton.textContent = 'Processing...';
                        
                        const { error } = await stripe.confirmPayment({
                            elements,
                            confirmParams: {
                                return_url: `${window.location.origin}/booking-success?session_start=${encodeURIComponent('<?php echo esc_js($start); ?>')}&session_end=${encodeURIComponent('<?php echo esc_js($end); ?>')}&teacher=${encodeURIComponent('<?php echo esc_js($teacher); ?>')}`
                            }
                        });
                        
                        if (error) {
                            showMessage(error.message);
                            payButton.disabled = false;
                            payButton.textContent = '<?php echo esc_js($confirm_button_text); ?>';
                        }
                    };
                    
                } catch (error) {
                    console.error('Payment session error:', error);
                    showMessage('Failed to initialize payment. Please try again.');
                    loader.style.display = 'none';
                }
            });
            
            function showMessage(messageText) {
                messages.textContent = messageText;
                messages.style.display = 'block';
                setTimeout(() => {
                    messages.style.display = 'none';
                }, 5000);
            }
        })();
        </script>
    <?php else: ?>
        <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:16px 18px;">
            <p style="margin:0;">Please sign in to complete payment.</p>
        </div>
    <?php endif; ?>
</div>