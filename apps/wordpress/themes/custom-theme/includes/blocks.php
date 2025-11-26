<?php
/**
 * Register built block JS for the editor and frontend view scripts.
 */

add_action('enqueue_block_editor_assets', function () {
    $build = get_template_directory() . '/build/index.ts.js';
    if (file_exists($build)) {
        wp_enqueue_script(
            'custom-theme-blocks',
            get_template_directory_uri() . '/build/index.ts.js',
            array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-i18n'),
            filemtime($build)
        );
    }
});

add_action('wp_enqueue_scripts', function () {
    $view = get_template_directory() . '/build/view.index.ts.js';
    if (file_exists($view)) {
        wp_enqueue_script(
            'custom-theme-blocks-view',
            get_template_directory_uri() . '/build/view.index.ts.js',
            array('wp-element', 'wp-components'),
            filemtime($view),
            true
        );
        if (wp_style_is('wp-components', 'registered')) {
            wp_enqueue_style('wp-components');
        }
    }

    // Enqueue compiled CSS for blocks
    $view_css = get_template_directory() . '/build/view.index.ts.css';
    if (file_exists($view_css)) {
        wp_enqueue_style(
            'custom-theme-blocks-view',
            get_template_directory_uri() . '/build/view.index.ts.css',
            array(),
            filemtime($view_css)
        );
    }
});

// Register all block.json in blocks/* directories
add_action('init', function () {
    $blocks_dir = get_template_directory() . '/blocks';
    foreach (glob($blocks_dir . '/*/block.json') as $block_json) {
        register_block_type(dirname($block_json));
    }
});

// Register custom block category for Thrive blocks
add_filter('block_categories_all', function ($categories) {
    return array_merge(
        [
            [
                'slug' => 'thrive',
                'title' => __('Thrive in Spanish', 'custom-theme'),
                'icon' => 'star-filled',
            ],
        ],
        $categories
    );
});

?>