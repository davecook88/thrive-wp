<?php
/**
 * Title: Hero Section
 * Slug: custom-theme/hero-section
 * Categories: featured, call-to-action
 */
?>
<!-- wp:group {"style":{"spacing":{"padding":{"top":"4rem","bottom":"4rem"}}},"backgroundColor":"gray-50","layout":{"type":"constrained"}} -->
<div class="wp-block-group has-gray-50-background-color has-background" style="padding-top:4rem;padding-bottom:4rem">
    <!-- wp:columns {"verticalAlignment":"center"} -->
    <div class="wp-block-columns are-vertically-aligned-center">
        <!-- wp:column {"verticalAlignment":"center","width":"60%"} -->
        <div class="wp-block-column is-vertically-aligned-center" style="flex-basis:60%">
            <!-- wp:heading {"level":1,"style":{"typography":{"fontSize":"3.5rem","lineHeight":"1.1"}},"textColor":"foreground"} -->
            <h1 class="wp-block-heading has-foreground-color has-text-color" style="font-size:3.5rem;line-height:1.1">
                <strong>Speak Spanish Like a Local, Not a Textbook.</strong>
            </h1>
            <!-- /wp:heading -->

            <!-- wp:paragraph {"style":{"spacing":{"margin":{"top":"1.5rem","bottom":"2rem"}}},"textColor":"gray-600","fontSize":"large"} -->
            <p class="has-gray-600-color has-text-color has-large-font-size"
                style="margin-top:1.5rem;margin-bottom:2rem">Join small, interactive cohorts led by native teachers. Move from 'Hola' to deep conversations in just 12 weeks.</p>
            <!-- /wp:paragraph -->

            <!-- wp:buttons -->
            <div class="wp-block-buttons">
                <!-- wp:button {"backgroundColor":"primary","textColor":"background","style":{"spacing":{"padding":{"top":"1rem","bottom":"1rem","left":"2rem","right":"2rem"}}}} -->
                <div class="wp-block-button"><a
                        class="wp-block-button__link has-background-color has-primary-background-color has-text-color wp-element-button"
                        style="padding-top:1rem;padding-bottom:1rem;padding-left:2rem;padding-right:2rem">Find Your Level</a></div>
                <!-- /wp:button -->

                <!-- wp:button {"backgroundColor":"background","textColor":"primary","style":{"spacing":{"padding":{"top":"1rem","bottom":"1rem","left":"2rem","right":"2rem"}},"border":{"color":"#E5E7EB","width":"1px"}}} -->
                <div class="wp-block-button"><a
                        class="wp-block-button__link has-primary-color has-background-background-color has-text-color has-border-color wp-element-button"
                        style="border-color:#E5E7EB;border-width:1px;padding-top:1rem;padding-bottom:1rem;padding-left:2rem;padding-right:2rem">View
                        Cohorts</a></div>
                <!-- /wp:button -->
            </div>
            <!-- /wp:buttons -->
            
            <!-- wp:paragraph {"fontSize":"small","textColor":"gray-600","style":{"spacing":{"margin":{"top":"1rem"}}}} -->
            <p class="has-gray-600-color has-text-color has-small-font-size" style="margin-top:1rem">⭐ Trusted by 500+ Students</p>
            <!-- /wp:paragraph -->
        </div>
        <!-- /wp:column -->

        <!-- wp:column {"width":"40%"} -->
        <div class="wp-block-column" style="flex-basis:40%">
            <!-- wp:image {"sizeSlug":"large","style":{"border":{"radius":"16px"}}} -->
            <figure class="wp-block-image size-large" style="border-radius:16px">
                <img src="https://picsum.photos/500/400?random=hero_new" alt="Happy students learning Spanish" />
            </figure>
            <!-- /wp:image -->
        </div>
        <!-- /wp:column -->
    </div>
    <!-- /wp:columns -->
</div>
<!-- /wp:group -->