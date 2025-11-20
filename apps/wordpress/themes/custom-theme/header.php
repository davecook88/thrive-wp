<?php
/**
 * Header template for block-based theme
 *
 * Called by get_header() - displays the site header with navigation
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo('charset'); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
	<?php wp_body_open(); ?>
	<header>
		<?php block_template_part('header'); ?>
	</header>
