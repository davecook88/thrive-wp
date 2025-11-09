<?php
/**
 * Template Name: Enrollment Success
 * Description: Success page after course enrollment with session booking wizard
 */

get_header();

// Get stripe session ID from URL
$session_id = isset($_GET['session_id']) ? sanitize_text_field($_GET['session_id']) : '';
?>

<main id="primary" class="site-main enrollment-success" style="max-width:860px;margin:0 auto;padding:24px;">
    <?php if (have_posts()): ?>
        <?php while (have_posts()):
            the_post(); ?>
            <div class="entry-content">
                <?php the_content(); ?>
            </div>
        <?php endwhile; ?>
    <?php else: ?>
        <!-- Fallback content if no page content -->
        <div class="enrollment-status-fallback">
            <?php if (!empty($session_id)): ?>
                <div class="enrollment-status enrollment-status-success">
                    <div class="enrollment-status-icon">✅</div>
                    <h1 class="enrollment-status-title">Enrollment Successful!</h1>
                    <p class="enrollment-status-message">Thank you for enrolling in your course. Let's book your sessions now.</p>

                    <div id="enrollment-session-info" data-session-id="<?php echo esc_attr($session_id); ?>">
                        <p>Loading your enrollment details...</p>
                    </div>
                </div>
            <?php else: ?>
                <div class="enrollment-status enrollment-status-error">
                    <div class="enrollment-status-icon">❌</div>
                    <h1 class="enrollment-status-title">Session Not Found</h1>
                    <p class="enrollment-status-message">We couldn't find your enrollment session. If you completed payment, please check your email or contact support.</p>

                    <div style="margin-top: 2rem; text-align: center;">
                        <a href="<?php echo esc_url(home_url('/student')); ?>" class="button button-primary">Go to Dashboard</a>
                        <a href="<?php echo esc_url(home_url('/courses')); ?>" class="button" style="margin-left: 8px;">Browse Courses</a>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    <?php endif; ?>
</main>

<style>
    .enrollment-success {
        min-height: 60vh;
    }

    .enrollment-status {
        text-align: center;
        padding: 3rem 2rem;
        border-radius: 12px;
        margin: 2rem 0;
    }

    .enrollment-status-success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
    }

    .enrollment-status-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
    }

    .enrollment-status-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        line-height: 1;
    }

    .enrollment-status-title {
        margin: 0 0 1rem 0;
        font-size: 2rem;
        font-weight: 700;
        line-height: 1.2;
    }

    .enrollment-status-message {
        margin: 0 0 2rem 0;
        font-size: 1.125rem;
        line-height: 1.6;
    }

    #enrollment-session-info {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 2px solid rgba(22, 101, 52, 0.2);
    }

    .button {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s;
    }

    .button-primary {
        background: #2563eb;
        color: white;
    }

    .button-primary:hover {
        background: #1d4ed8;
    }

    .button:not(.button-primary) {
        background: #e5e7eb;
        color: #374151;
    }

    .button:not(.button-primary):hover {
        background: #d1d5db;
    }
</style>

<script>
    (function() {
        const sessionInfoElement = document.getElementById('enrollment-session-info');
        if (!sessionInfoElement) return;

        const sessionId = sessionInfoElement.dataset.sessionId;
        if (!sessionId) return;

        // Fetch enrollment session info
        fetch(`/api/course-programs/enrollment/session/${sessionId}`, {
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch enrollment details');
            }
            return response.json();
        })
        .then(data => {
            // Display enrollment info
            sessionInfoElement.innerHTML = `
                <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
                    <h2 style="margin: 0 0 1rem 0; font-size: 1.5rem; color: #166534;">Course Details</h2>
                    <div style="text-align: left; color: #166534;">
                        <p style="margin: 0.5rem 0;"><strong>Course:</strong> ${data.courseCode || 'Loading...'}</p>
                        <p style="margin: 0.5rem 0;"><strong>Cohort:</strong> ${data.cohortName || 'Loading...'}</p>
                    </div>
                </div>
                <div style="margin-top: 2rem; text-align: center;">
                    <p style="font-size: 1rem; margin-bottom: 1rem;">Ready to book your sessions?</p>
                    <a href="/student" class="button button-primary" style="color: white; text-decoration: none;">
                        Go to Dashboard to Book Sessions
                    </a>
                    <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.8;">
                        <em>You can book your sessions now or later from your dashboard.</em>
                    </p>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error fetching enrollment details:', error);
            sessionInfoElement.innerHTML = `
                <div style="background: #fef2f2; padding: 1.5rem; border-radius: 8px; border: 1px solid #fecaca; color: #991b1b;">
                    <p>We're still processing your enrollment. Please check your dashboard in a few moments.</p>
                    <div style="margin-top: 1rem;">
                        <a href="/student" class="button button-primary" style="color: white; text-decoration: none;">Go to Dashboard</a>
                    </div>
                </div>
            `;
        });
    })();
</script>

<?php get_footer(); ?>
