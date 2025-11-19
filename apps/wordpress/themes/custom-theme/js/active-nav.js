/**
 * Active Navigation Detection
 * Adds 'current-menu-item' class to navigation links that match the current page
 */
document.addEventListener('DOMContentLoaded', function () {
  const currentUrl = window.location.pathname;

  // Get all navigation links from both block-based and classic menus
  const navLinks = document.querySelectorAll('.wp-block-navigation a, .wp-block-navigation__container a');

  navLinks.forEach(function (link) {
    const linkUrl = new URL(link.href);
    const linkPath = linkUrl.pathname;

    // Check if the link path matches the current path
    if (linkPath === currentUrl) {
      // Add current-menu-item class to the parent <li> or .wp-block-navigation-item
      const parent = link.closest('li') || link.closest('.wp-block-navigation-item');
      if (parent) {
        parent.classList.add('current-menu-item');
      }
    }
  });
});
