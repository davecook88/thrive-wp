#!/bin/bash
# Custom WordPress entrypoint that installs WP CLI and flushes rewrite rules on first run
# This script wraps the original WordPress entrypoint

set +u  # Allow unset variables (needed for original entrypoint)

# Store the command that should be run (e.g., apache2-foreground)
CMD=("$@")

# Run the original WordPress entrypoint setup script
# This handles database initialization, plugin setup, etc.
source /usr/local/bin/docker-entrypoint.sh

# Now start the command in the background so we can run post-init hooks
"${CMD[@]}" &
CMD_PID=$!

# Give WordPress/Apache time to initialize
sleep 10

# Try to flush rewrite rules if WordPress is ready
if [ -f /var/www/html/wp-config.php ]; then
    echo "[Thrive] Flushing WordPress rewrite rules on startup..."
    
    # Try WP CLI (preferred method)
    if command -v wp &>/dev/null; then
        if wp rewrite flush --allow-root --quiet 2>/dev/null; then
            echo "[Thrive] ✓ Rewrite rules flushed successfully via WP CLI"
        else
            echo "[Thrive] WP CLI flush failed, trying PHP fallback..."
            # PHP fallback
            php -r "
            @require '/var/www/html/wp-load.php';
            if (function_exists('flush_rewrite_rules')) {
                @flush_rewrite_rules();
                echo \"[Thrive] ✓ Rewrite rules flushed via PHP\n\";
            }
            " 2>/dev/null || echo "[Thrive] Could not flush rewrite rules via PHP"
        fi
    else
        echo "[Thrive] WP CLI not available, trying PHP fallback..."
        # PHP fallback
        php -r "
        @require '/var/www/html/wp-load.php';
        if (function_exists('flush_rewrite_rules')) {
            @flush_rewrite_rules();
            echo \"[Thrive] ✓ Rewrite rules flushed via PHP\n\";
        }
        " 2>/dev/null || echo "[Thrive] Could not flush rewrite rules via PHP"
    fi
fi

# Keep the command running
wait $CMD_PID


