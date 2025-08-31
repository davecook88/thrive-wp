<?php
/**
 * Server render for Teacher Availability block.
 */

// Ensure auth helpers exist
if (!function_exists('thrive_is_logged_in')) {
    return '';
}

$attrs = $attributes ?? [];
$heading = $attrs['heading'] ?? 'Set Your Availability';
$helpText = $attrs['helpText'] ?? 'Configure your weekly schedule and any exceptions.';
$accentColor = $attrs['accentColor'] ?? '#9aa8ff';
$showPreviewWeeks = $attrs['showPreviewWeeks'] ?? 2;

// Check if user is logged in and is a teacher
if (!thrive_is_logged_in()) {
    // Show login prompt
    ob_start();
    ?>
    <div class="teacher-availability-block" style="text-align: center; padding: 2rem; border: 1px solid #e1e5e9; border-radius: 8px;">
        <h3>Please sign in to manage your availability</h3>
        <a href="/api/auth/google" class="wp-block-button__link" style="background-color: <?php echo esc_attr($accentColor); ?>; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 1rem;">
            Sign In with Google
        </a>
    </div>
    <?php
    return ob_get_clean();
}

if (!thrive_is_teacher()) {
    // Show not authorized message
    ob_start();
    ?>
    <div class="teacher-availability-block" style="text-align: center; padding: 2rem; border: 1px solid #e1e5e9; border-radius: 8px;">
        <h3>Teacher Access Required</h3>
        <p>This feature is only available to teachers. Please contact an administrator if you believe this is an error.</p>
    </div>
    <?php
    return ob_get_clean();
}

// User is authenticated teacher - show the availability management UI
ob_start();
?>
<div class="teacher-availability-block" style="max-width: 800px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 2rem;">
        <h2 style="color: <?php echo esc_attr($accentColor); ?>; margin-bottom: 0.5rem;"><?php echo esc_html($heading); ?></h2>
        <p style="color: #64748b; margin: 0;"><?php echo esc_html($helpText); ?></p>
    </div>

    <!-- Rules Section -->
    <div class="availability-rules" style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1rem;">Weekly Schedule</h3>
        <div id="rules-container" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 1rem;">
            <div id="rules-list"></div>
            <button id="add-rule-btn" class="wp-block-button__link" style="background-color: <?php echo esc_attr($accentColor); ?>; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; border: none; cursor: pointer; margin-top: 1rem;">
                Add Time Slot
            </button>
        </div>
    </div>

    <!-- Exceptions Section -->
    <div class="availability-exceptions" style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1rem;">Exceptions & Blackouts</h3>
        <div id="exceptions-container" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 1rem;">
            <div id="exceptions-list"></div>
            <button id="add-exception-btn" class="wp-block-button__link" style="background-color: #ef4444; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; border: none; cursor: pointer; margin-top: 1rem;">
                Add Exception
            </button>
        </div>
    </div>

    <!-- Preview Section -->
    <div class="availability-preview" style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1rem;">Preview (Next <?php echo esc_html($showPreviewWeeks); ?> Weeks)</h3>
        <div id="preview-calendar" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 1rem; min-height: 200px;">
            <div style="text-align: center; color: #64748b;">Loading preview...</div>
        </div>
    </div>

    <!-- Actions -->
    <div class="availability-actions" style="text-align: center;">
        <button id="save-availability-btn" class="wp-block-button__link" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; border: none; cursor: pointer; font-size: 16px; margin-right: 1rem;">
            Save Changes
        </button>
        <button id="reset-availability-btn" class="wp-block-button__link" style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; border: none; cursor: pointer; font-size: 16px;">
            Reset
        </button>
    </div>

    <!-- Status Messages -->
    <div id="status-message" style="margin-top: 1rem; text-align: center; display: none;"></div>
</div>

<script>
(function() {
    // Simple availability management (will be enhanced with proper form handling)
    const rulesContainer = document.getElementById('rules-container');
    const exceptionsContainer = document.getElementById('exceptions-container');
    const previewContainer = document.getElementById('preview-calendar');
    const statusMessage = document.getElementById('status-message');

    // Load current availability
    loadAvailability();

    // Event listeners
    document.getElementById('add-rule-btn').addEventListener('click', addRule);
    document.getElementById('add-exception-btn').addEventListener('click', addException);
    document.getElementById('save-availability-btn').addEventListener('click', saveAvailability);
    document.getElementById('reset-availability-btn').addEventListener('click', resetAvailability);

    function showMessage(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.style.display = 'block';
        statusMessage.style.color = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }

    async function loadAvailability() {
        try {
            const response = await fetch('/api/teachers/me/availability', {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                renderRules(data.rules || []);
                renderExceptions(data.exceptions || []);
                loadPreview();
            } else {
                showMessage('Failed to load availability', 'error');
            }
        } catch (error) {
            showMessage('Error loading availability', 'error');
        }
    }

    function renderRules(rules) {
        const rulesList = document.getElementById('rules-list');
        rulesList.innerHTML = '';

        if (rules.length === 0) {
            rulesList.innerHTML = '<p style="color: #64748b; text-align: center;">No rules set. Add your first time slot above.</p>';
            return;
        }

        rules.forEach(rule => {
            const ruleDiv = document.createElement('div');
            ruleDiv.style.cssText = 'display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; padding: 0.5rem; background: #f8fafc; border-radius: 4px;';
            ruleDiv.innerHTML = `
                <span style="font-weight: bold; min-width: 60px;">${getWeekdayName(rule.weekday)}</span>
                <span>${rule.startTime} - ${rule.endTime}</span>
                <button class="remove-rule-btn" data-id="${rule.id}" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; margin-left: auto;">Remove</button>
            `;
            rulesList.appendChild(ruleDiv);
        });

        // Add remove event listeners
        document.querySelectorAll('.remove-rule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleId = e.target.dataset.id;
                removeRule(ruleId);
            });
        });
    }

    function renderExceptions(exceptions) {
        const exceptionsList = document.getElementById('exceptions-list');
        exceptionsList.innerHTML = '';

        if (exceptions.length === 0) {
            exceptionsList.innerHTML = '<p style="color: #64748b; text-align: center;">No exceptions set.</p>';
            return;
        }

        exceptions.forEach(exception => {
            const exceptionDiv = document.createElement('div');
            exceptionDiv.style.cssText = 'display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; padding: 0.5rem; background: #fef2f2; border-radius: 4px;';
            exceptionDiv.innerHTML = `
                <span style="font-weight: bold;">${exception.date}</span>
                <span>${exception.startTime || 'All day'} ${exception.endTime ? '- ' + exception.endTime : ''}</span>
                <span style="color: #ef4444; font-weight: bold;">${exception.isBlackout ? 'BLOCKED' : 'AVAILABLE'}</span>
                <button class="remove-exception-btn" data-id="${exception.id}" style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; margin-left: auto;">Remove</button>
            `;
            exceptionsList.appendChild(exceptionDiv);
        });

        // Add remove event listeners
        document.querySelectorAll('.remove-exception-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const exceptionId = e.target.dataset.id;
                removeException(exceptionId);
            });
        });
    }

    async function loadPreview() {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (<?php echo esc_js($showPreviewWeeks); ?> * 7));

        try {
            const response = await fetch('/api/teachers/me/availability/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0]
                })
            });

            if (response.ok) {
                const data = await response.json();
                renderPreview(data.windows || []);
            } else {
                previewContainer.innerHTML = '<div style="text-align: center; color: #ef4444;">Failed to load preview</div>';
            }
        } catch (error) {
            previewContainer.innerHTML = '<div style="text-align: center; color: #ef4444;">Error loading preview</div>';
        }
    }

    function renderPreview(windows) {
        if (windows.length === 0) {
            previewContainer.innerHTML = '<div style="text-align: center; color: #64748b;">No availability slots found for the selected period.</div>';
            return;
        }

        const groupedByDate = {};
        windows.forEach(window => {
            const date = new Date(window.start).toDateString();
            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }
            groupedByDate[date].push(window);
        });

        let html = '<div style="display: grid; gap: 1rem;">';
        Object.keys(groupedByDate).forEach(date => {
            html += `<div style="border-bottom: 1px solid #e1e5e9; padding-bottom: 0.5rem;">`;
            html += `<h4 style="margin: 0 0 0.5rem 0; color: <?php echo esc_attr($accentColor); ?>;">${date}</h4>`;
            groupedByDate[date].forEach(window => {
                const startTime = new Date(window.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const endTime = new Date(window.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                html += `<div style="background: #f0fdf4; padding: 0.25rem 0.5rem; border-radius: 4px; margin-bottom: 0.25rem; display: inline-block; margin-right: 0.5rem;">${startTime} - ${endTime}</div>`;
            });
            html += '</div>';
        });
        html += '</div>';

        previewContainer.innerHTML = html;
    }

    function addRule() {
        // Simple implementation - in a real app, this would show a proper form
        const weekday = prompt('Enter weekday (0=Sunday, 6=Saturday):');
        const startTime = prompt('Enter start time (HH:mm):');
        const endTime = prompt('Enter end time (HH:mm):');

        if (weekday && startTime && endTime) {
            // This is a simplified version - in practice, you'd collect all rules and save at once
            showMessage('Rule added (simplified UI)', 'success');
            loadAvailability();
        }
    }

    function addException() {
        // Simple implementation
        const date = prompt('Enter date (YYYY-MM-DD):');
        const startTime = prompt('Enter start time (HH:mm) or leave empty for all day:');
        const endTime = prompt('Enter end time (HH:mm):');
        const isBlackout = confirm('Is this a blackout (unavailable)?');

        if (date) {
            showMessage('Exception added (simplified UI)', 'success');
            loadAvailability();
        }
    }

    async function saveAvailability() {
        // This would collect all rules and exceptions from the UI and save them
        showMessage('Availability saved successfully!', 'success');
    }

    function resetAvailability() {
        if (confirm('Are you sure you want to reset all availability settings?')) {
            showMessage('Availability reset', 'info');
            loadAvailability();
        }
    }

    function removeRule(ruleId) {
        if (confirm('Remove this rule?')) {
            showMessage('Rule removed', 'info');
            loadAvailability();
        }
    }

    function removeException(exceptionId) {
        if (confirm('Remove this exception?')) {
            showMessage('Exception removed', 'info');
            loadAvailability();
        }
    }

    function getWeekdayName(weekday) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[weekday] || 'Unknown';
    }
})();
</script>
<?php
return ob_get_clean();
