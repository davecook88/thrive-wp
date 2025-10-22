<?php
/**
 * Package Selection Block
 * 
 * @param array $attributes Block attributes.
 */

// Get block attributes
$show_credits = $attributes['showCredits'] ?? true;
$show_duration = $attributes['showDuration'] ?? true;
$show_expiry = $attributes['showExpiry'] ?? true;
$loading_message = $attributes['loadingMessage'] ?? 'Loading available packages...';
$error_message = $attributes['errorMessage'] ?? 'Unable to load packages at this time. Please refresh and try again.';
$no_packages_message = $attributes['noPackagesMessage'] ?? 'No packages are currently available.';

// Check if user is logged in
$is_logged_in = function_exists('thrive_is_logged_in') && thrive_is_logged_in();

// Get wrapper attributes
$bookingStart = '';
$bookingEnd = '';
$teacherId = '';
$initialPackageId = '';
$initialPriceId = '';
$initialPackageName = '';

// Consume block context if provided by an ancestor provider
if (isset($block) && is_object($block)) {
    $vars = get_object_vars($block);
    /** @var array $ctx */
    $ctx = isset($vars['context']) && is_array($vars['context']) ? $vars['context'] : [];
    $bookingStart = isset($ctx['custom-theme/bookingStart']) ? (string) $ctx['custom-theme/bookingStart'] : '';
    $bookingEnd = isset($ctx['custom-theme/bookingEnd']) ? (string) $ctx['custom-theme/bookingEnd'] : '';
    $teacherId = isset($ctx['custom-theme/teacherId']) ? (string) $ctx['custom-theme/teacherId'] : '';
    $initialPackageId = isset($ctx['custom-theme/selectedPackageId']) ? (string) $ctx['custom-theme/selectedPackageId'] : '';
    $initialPriceId = isset($ctx['custom-theme/selectedPriceId']) ? (string) $ctx['custom-theme/selectedPriceId'] : '';
    $initialPackageName = isset($ctx['custom-theme/selectedPackageName']) ? (string) $ctx['custom-theme/selectedPackageName'] : '';
}

$wrapper_attributes = get_block_wrapper_attributes([
    'class' => 'package-selection-block'
]);

?>
<div <?php echo $wrapper_attributes; ?>>
    <?php if ($is_logged_in): ?>
        <div class="package-selection-container">
            <div id="packages-container" data-loading-message="<?php echo esc_attr($loading_message); ?>"
                data-error-message="<?php echo esc_attr($error_message); ?>"
                data-no-packages-message="<?php echo esc_attr($no_packages_message); ?>"
                data-show-credits="<?php echo $show_credits ? '1' : '0'; ?>"
                data-show-duration="<?php echo $show_duration ? '1' : '0'; ?>"
                data-show-expiry="<?php echo $show_expiry ? '1' : '0'; ?>">
                <div class="loading-spinner" style="text-align:center;padding:20px;color:#6b7280;">
                    <?php echo esc_html($loading_message); ?>
                </div>
            </div>
        </div>

        <style>
            .package-card {
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 16px;
                cursor: pointer;
                transition: all 0.2s;
                background: #fff;
            }

            .package-card:hover {
                border-color: #3b82f6;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }

            .package-card.selected {
                border-color: #3b82f6;
                background: #f0f9ff;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }

            .package-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .package-name {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
            }

            .package-price {
                font-size: 20px;
                font-weight: 700;
                color: #059669;
            }

            .package-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                font-size: 14px;
                color: #6b7280;
            }

            .package-detail {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .package-detail-label {
                font-weight: 500;
            }
        </style>

        <script>
            (function () {
                const container = document.getElementById('packages-container');
                if (!container) return;

                const loadingMessage = container.dataset.loadingMessage;
                const errorMessage = container.dataset.errorMessage;
                const noPackagesMessage = container.dataset.noPackagesMessage;
                const showCredits = container.dataset.showCredits === '1';
                const showDuration = container.dataset.showDuration === '1';
                const showExpiry = container.dataset.showExpiry === '1';
                const initialPackageId = <?php echo wp_json_encode($initialPackageId); ?>;
                const initialPriceId = <?php echo wp_json_encode($initialPriceId); ?>;
                const initialPackageName = <?php echo wp_json_encode($initialPackageName); ?>;

                // Get service type from URL if present
                const urlParams = new URLSearchParams(window.location.search);
                const serviceType = urlParams.get('serviceType');
                const sessionId = urlParams.get('sessionId');

                // Selected package storage
                let selectedPackage = null;

                const url = new URL("/api/packages", window.location.origin);
                if (sessionId) {
                    url.searchParams.append('sessionId', sessionId);
                }

                // Fetch packages from public API
                fetch(url.toString())
                    .then(response => {
                        if (!response.ok) throw new Error('Failed to fetch packages');
                        return response.json();
                    })
                    .then(packages => {
                        // Filter packages by service type if specified
                        const filteredPackages = serviceType
                            ? packages.filter(pkg => pkg.serviceType === serviceType)
                            : packages;

                        if (filteredPackages.length === 0) {
                            container.innerHTML = `<div style="text-align:center;padding:20px;color:#6b7280;">${noPackagesMessage}</div>`;
                            return;
                        }

                        container.innerHTML = filteredPackages.map(pkg => {
                            const currency = pkg.stripe?.currency || 'usd';
                            const unitAmount = pkg.stripe?.unitAmount || 0;
                            const price = new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currency.toUpperCase()
                            }).format(unitAmount / 100);

                            let detailsHtml = '';
                            if (showCredits) {
                                detailsHtml += `
                                <div class="package-detail">
                                    <span class="package-detail-label">Credits:</span>
                                    <span>${pkg.credits}</span>
                                </div>`;
                            }
                            if (showDuration) {
                                detailsHtml += `
                                <div class="package-detail">
                                    <span class="package-detail-label">Duration:</span>
                                    <span>${pkg.creditUnitMinutes} min sessions</span>
                                </div>`;
                            }
                            if (showExpiry && pkg.expiresInDays) {
                                detailsHtml += `
                                <div class="package-detail">
                                    <span class="package-detail-label">Expires:</span>
                                    <span>${pkg.expiresInDays} days</span>
                                </div>`;
                            }

                            const isPreselected = (initialPackageId && pkg.id === initialPackageId) || (initialPriceId && pkg?.stripe?.priceId === initialPriceId);
                            return `
                            <div class="package-card ${isPreselected ? 'selected' : ''}" data-package-id="${pkg.id}" data-price-id="${pkg.stripe.priceId}">
                                <div class="package-header">
                                    <div class="package-name">${pkg.name}</div>
                                    <div class="package-price">${price}</div>
                                </div>
                                <div class="package-details">
                                    ${detailsHtml}
                                </div>
                            </div>`;
                        }).join('');

                        // Add click handlers for filtered packages
                        container.querySelectorAll('.package-card').forEach(card => {
                            card.addEventListener('click', () => {
                                // Remove selection from other cards
                                container.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
                                // Select this card
                                card.classList.add('selected');

                                selectedPackage = {
                                    id: card.dataset.packageId,
                                    priceId: card.dataset.priceId,
                                    name: card.querySelector('.package-name').textContent
                                };

                                // Dispatch custom event for payment component and any consumers
                                document.dispatchEvent(new CustomEvent('custom-theme:packageSelected', { detail: selectedPackage }));
                            });
                        });

                        // If initial selection provided, announce it
                        const pre = container.querySelector('.package-card.selected');
                        if (pre) {
                            selectedPackage = {
                                id: pre.getAttribute('data-package-id'),
                                priceId: pre.getAttribute('data-price-id'),
                                name: pre.querySelector('.package-name')?.textContent || initialPackageName || ''
                            };
                            document.dispatchEvent(new CustomEvent('custom-theme:packageSelected', { detail: selectedPackage }));
                        }
                    })
                    .catch(error => {
                        console.error('Failed to load packages:', error);
                        container.innerHTML = `<div style="text-align:center;padding:20px;color:#dc2626;">${errorMessage}</div>`;
                    });
            })();
        </script>
    <?php else: ?>
        <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:12px;padding:16px 18px;">
            <p style="margin:0;">Please sign in to view available packages.</p>
        </div>
    <?php endif; ?>
</div>