<?php
/**
 * Teacher Profile Form Block
 * PHP registration for the teacher profile form block
 */

add_action('init', function () {
    register_block_type(__DIR__ . '/block.json');
});
