<?php
/**
 * Title: Self-Paced Learning Section
 * Slug: custom-theme/self-paced-section
 * Categories: featured
 */
?>
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"4rem","bottom":"4rem"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:4rem;padding-bottom:4rem">
    <!-- wp:columns {"align":"wide","verticalAlignment":"center","style":{"spacing":{"blockGap":"3rem"}}} -->
    <div class="wp-block-columns alignwide are-vertically-aligned-center">
        <!-- wp:column {"width":"40%"} -->
        <div class="wp-block-column" style="flex-basis:40%">
            <!-- wp:image {"sizeSlug":"large","style":{"border":{"radius":"20px"}}} -->
            <figure class="wp-block-image size-large has-custom-border">
                <img src="https://picsum.photos/400/300?random=study" alt="People studying on terrace"
                    style="border-radius:20px" />
            </figure>
            <!-- /wp:image -->
        </div>
        <!-- /wp:column -->

        <!-- wp:column {"verticalAlignment":"center","width":"60%"} -->
        <div class="wp-block-column is-vertically-aligned-center" style="flex-basis:60%">
            <!-- wp:paragraph {"style":{"typography":{"textTransform":"uppercase","letterSpacing":"2px","fontWeight":"600"}},"textColor":"accent","fontSize":"small"} -->
            <p class="has-accent-color has-text-color has-small-font-size"
                style="font-weight:600;letter-spacing:2px;text-transform:uppercase">SELF-PACED COURSES</p>
            <!-- /wp:paragraph -->

            <!-- wp:heading {"level":2,"style":{"typography":{"fontSize":"2.5rem","fontWeight":"700"},"spacing":{"margin":{"top":"1rem","bottom":"1.5rem"}}}} -->
            <h2 class="wp-block-heading" style="font-size:2.5rem;font-weight:700;margin-top:1rem;margin-bottom:1.5rem">
                Learn Spanish online at your own pace</h2>
            <!-- /wp:heading -->

            <!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"2rem"}}},"textColor":"gray-600"} -->
            <p class="has-gray-600-color has-text-color" style="margin-bottom:2rem">Learn the exact Spanish you need to
                confidently live in Mexico. Navigate daily life, make local friends, and feel at home without language
                anxiety.</p>
            <!-- /wp:paragraph -->

            <!-- wp:buttons -->
            <div class="wp-block-buttons">
                <!-- wp:button {"backgroundColor":"foreground","textColor":"background","style":{"border":{"radius":"50px"},"spacing":{"padding":{"top":"15px","bottom":"15px","left":"30px","right":"30px"}}}} -->
                <div class="wp-block-button"><a
                        class="wp-block-button__link has-background-color has-foreground-background-color has-text-color has-background wp-element-button"
                        style="border-radius:50px;padding-top:15px;padding-bottom:15px;padding-left:30px;padding-right:30px">Start
                        your learning</a></div>
                <!-- /wp:button -->
            </div>
            <!-- /wp:buttons -->
        </div>
        <!-- /wp:column -->
    </div>
    <!-- /wp:columns -->
</div>
<!-- /wp:group -->