<?php
/**
 * Title: Teacher Spotlight
 * Slug: custom-theme/teacher-spotlight
 * Categories: featured
 */
?>
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}},"backgroundColor":"gray-50"} -->
<div class="wp-block-group alignfull has-gray-50-background-color has-background" style="padding-top:var(--wp--preset--spacing--80);padding-bottom:var(--wp--preset--spacing--80)">
    <!-- wp:group {"layout":{"type":"constrained"}} -->
    <div class="wp-block-group">
        <!-- wp:columns {"verticalAlignment":"center","style":{"spacing":{"blockGap":"var:preset|spacing|60"}}} -->
        <div class="wp-block-columns are-vertically-aligned-center">
            <!-- wp:column {"width":"40%"} -->
            <div class="wp-block-column" style="flex-basis:40%">
                <!-- wp:image {"sizeSlug":"large","style":{"border":{"radius":"16px"}}} -->
                <figure class="wp-block-image size-large" style="border-radius:16px"><img src="https://picsum.photos/600/800?random=teacher" alt="Teacher Portrait" /></figure>
                <!-- /wp:image -->
            </div>
            <!-- /wp:column -->

            <!-- wp:column {"width":"60%"} -->
            <div class="wp-block-column" style="flex-basis:60%">
                <!-- wp:heading {"level":2} -->
                <h2 class="wp-block-heading">Meet Your Maestra</h2>
                <!-- /wp:heading -->

                <!-- wp:paragraph {"fontSize":"large","textColor":"primary"} -->
                <p class="has-primary-color has-text-color has-large-font-size"><strong>Valentina Rodriguez</strong></p>
                <!-- /wp:paragraph -->

                <!-- wp:paragraph -->
                <p>Valentina is a certified Spanish teacher from Bogotá, Colombia with over 8 years of experience. She specializes in helping beginners overcome their fear of speaking and brings the vibrant culture of Colombia into every lesson.</p>
                <!-- /wp:paragraph -->

                <!-- wp:quote {"style":{"typography":{"fontStyle":"italic"}},"className":"is-style-plain"} -->
                <blockquote class="wp-block-quote is-style-plain" style="font-style:italic">
                    <!-- wp:paragraph -->
                    <p>"My goal is to make you fall in love with the language, not just learn the rules. We laugh, we talk, and we learn together."</p>
                    <!-- /wp:paragraph -->
                </blockquote>
                <!-- /wp:quote -->

                <!-- wp:buttons -->
                <div class="wp-block-buttons">
                    <!-- wp:button {"variant":"outline"} -->
                    <div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button">Meet All Teachers</a></div>
                    <!-- /wp:button -->
                </div>
                <!-- /wp:buttons -->
            </div>
            <!-- /wp:column -->
        </div>
        <!-- /wp:columns -->
    </div>
    <!-- /wp:group -->
</div>
<!-- /wp:group -->
