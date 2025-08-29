---
applyTo: 'wordpress/plugins/thrive-admin/**'
---

# Thrive Admin Vue Islands Architecture

## Overview

The Thrive Admin plugin has been restructured to use Vue.js islands architecture with Tailwind CSS for modern, maintainable frontend development. This approach provides:

- **Server-Side Rendering**: PHP handles initial page rendering for SEO and performance
- **Vue Islands**: Interactive components are hydrated client-side for rich user experiences
- **Hot Reloading**: Development server with live updates during development
- **Tailwind CSS**: Utility-first CSS framework for consistent, maintainable styling
- **Modular Architecture**: Separated concerns with templates, components, and assets

## Architecture

### Directory Structure

```
wordpress/plugins/thrive-admin/
├── src/                    # Vue source files
│   ├── components/        # Vue components
│   │   ├── Dashboard.vue
│   │   ├── Users.vue
│   │   └── Settings.vue
│   ├── main.js           # Vue app entry point
│   └── style.css         # Global styles with Tailwind
├── templates/            # PHP templates with Vue islands
│   ├── dashboard.php
│   ├── users.php
│   └── settings.php
├── includes/             # PHP backend logic
│   ├── class-thrive-admin-bridge.php
│   └── class-thrive-admin-bridge-admin.php
├── dist/                 # Built assets (generated)
├── package.json          # Node dependencies and scripts
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
├── postcss.config.js     # PostCSS configuration
└── thrive-admin.php      # Main plugin file
```

### Vue Islands Pattern

Each admin page uses PHP for server-side rendering of the basic structure, with Vue components embedded as "islands" for interactivity:

```php
<!-- PHP Template (templates/dashboard.php) -->
<div class="wrap">
    <h1><?php _e('Thrive Admin Dashboard', 'thrive-admin-bridge'); ?></h1>
    <!-- Vue Island -->
    <div data-vue-component="dashboard" data-title="Welcome to Thrive Admin"></div>
</div>
```

```javascript
// Vue Component (src/components/Dashboard.vue)
<template>
  <div class="thrive-admin-dashboard">
    <div class="wp-admin-card mb-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-3">{{ title }}</h2>
      <p class="text-gray-600">{{ description }}</p>
    </div>
    <!-- Interactive content -->
  </div>
</template>
```

## Development Workflow

### Prerequisites

1. **Node.js** (v16+)
2. **Docker** and **Docker Compose**
3. **WordPress** with the thrive-admin plugin activated
4. **WP_DEBUG** enabled in `wp-config.php` for development mode

### Setup

1. **Install Dependencies**:
   ```bash
   cd wordpress/plugins/thrive-admin
   npm install
   ```

2. **Start Development**:
   ```bash
   # From project root
   make run
   # This starts:
   # - Docker containers
   # - WordPress theme watcher
   # - Vue dev server (hot reloading)
   ```

3. **Access Admin**:
   - WordPress Admin: http://localhost:8080/wp-admin
   - Vue Dev Server: http://localhost:5173 (for debugging)

### Development vs Production

The plugin automatically detects the environment:

- **Development** (`WP_DEBUG = true`):
  - Uses Vite dev server for hot reloading
  - Assets served from `http://localhost:5173`
  - Source maps enabled

- **Production** (`WP_DEBUG = false`):
  - Uses built assets from `/dist/` directory
  - Assets cached with versioning
  - Optimized for performance

## Component Development

### Creating New Components

1. **Create Vue Component**:
   ```bash
   # src/components/NewComponent.vue
   <template>
     <div class="new-component">
       <!-- Your template -->
     </div>
   </template>

   <script>
   export default {
     name: 'NewComponent',
     props: {
       // Define props
     },
     data() {
       return {
         // Component data
       }
     },
     methods: {
       // Component methods
     }
   }
   </script>
   ```

2. **Register in Main App**:
   ```javascript
   // src/main.js
   import NewComponent from './components/NewComponent.vue'

   // Add to island creation
   createVueIsland('[data-vue-component="new-component"]', NewComponent)
   ```

3. **Create PHP Template**:
   ```php
   <!-- templates/new-page.php -->
   <div class="wrap">
     <h1>New Page</h1>
     <div data-vue-component="new-component" data-prop="value"></div>
   </div>
   ```

4. **Add Admin Menu**:
   ```php
   // includes/class-thrive-admin-bridge-admin.php
   add_submenu_page(
     'thrive-admin-dashboard',
     'New Page',
     'New Page',
     'manage_options',
     'thrive-admin-new',
     [$this, 'thrive_admin_new_page']
   );
   ```

### AJAX Communication

Components communicate with WordPress via AJAX:

```javascript
// In Vue component
async loadData() {
  const response = await fetch(window.thriveAdminBridgeAjax.ajax_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'thrive_admin_custom_action',
      nonce: window.thriveAdminBridgeAjax.nonce,
      data: JSON.stringify(params)
    })
  })

  const result = await response.json()
  // Handle response
}
```

```php
// In PHP class
public function thrive_admin_custom_action_ajax() {
  // Verify nonce and permissions
  if (!wp_verify_nonce($_POST['nonce'], 'thrive_admin_bridge_users_nonce')) {
    wp_die(__('Security check failed'));
  }

  // Process request
  $data = json_decode(stripslashes($_POST['data']), true);

  // Return response
  wp_send_json_success($result);
}
```

## Styling with Tailwind

### Utility Classes

Use Tailwind's utility-first approach:

```vue
<template>
  <div class="max-w-4xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">Title</h2>
      <p class="text-gray-600 mb-4">Description</p>
      <button class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200">
        Action
      </button>
    </div>
  </div>
</template>
```

### Custom Components

Add reusable component classes in `src/style.css`:

```css
@layer components {
  .wp-admin-card {
    @apply bg-white border border-gray-300 rounded-lg p-6 shadow-sm transition-shadow duration-200;
  }

  .wp-admin-card:hover {
    @apply shadow-md;
  }

  .wp-admin-button-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200;
  }
}
```

## Building for Production

### Automatic Build

The plugin automatically builds assets when `WP_DEBUG = false`. For manual builds:

```bash
cd wordpress/plugins/thrive-admin
npm run build
```

### Build Output

Built assets are placed in the `dist/` directory:
- `dist/css/main.css` - Compiled styles
- `dist/js/main.js` - Compiled Vue app
- `dist/manifest.json` - Asset manifest for WordPress

## WordPress Integration

### Enqueueing Assets

Assets are automatically enqueued based on environment:

```php
// Development mode
wp_enqueue_script('vite-client', 'http://localhost:5173/@vite/client', [], null, true);
wp_enqueue_script('thrive-admin-vue', 'http://localhost:5173/src/main.js', ['vite-client'], null, true);

// Production mode
$manifest = json_decode(file_get_contents($assets_dir . 'manifest.json'), true);
wp_enqueue_script('thrive-admin-vue', $assets_dir . $manifest['src/main.js']['file'], [], $version, true);
```

### Security

- All AJAX requests verify WordPress nonces
- User capabilities are checked before processing
- Data is sanitized and validated
- Vue components receive data via HTML attributes (server-rendered)

## Troubleshooting

### Common Issues

1. **Vue components not loading**:
   - Check browser console for JavaScript errors
   - Ensure Vite dev server is running (`make run`)
   - Verify `WP_DEBUG = true` in `wp-config.php`

2. **Styling issues**:
   - Clear browser cache
   - Rebuild assets: `npm run build`
   - Check Tailwind configuration

3. **AJAX requests failing**:
   - Verify nonce is valid
   - Check user permissions
   - Review PHP error logs

### Development Tips

- Use browser dev tools to inspect Vue components
- Enable Vue DevTools extension for debugging
- Check WordPress debug logs for PHP errors
- Use `npm run dev` for manual Vite server control

## Future Enhancements

### Planned Features

- [ ] Component library with shared UI components
- [ ] TypeScript support for better type safety
- [ ] Vue Router for client-side navigation
- [ ] Pinia for state management
- [ ] Automated testing with Vitest
- [ ] Storybook for component documentation

### Best Practices

1. **Keep components small and focused**
2. **Use composition over inheritance**
3. **Leverage Vue's reactivity system**
4. **Follow WordPress coding standards for PHP**
5. **Use semantic HTML and ARIA attributes**
6. **Optimize for accessibility**

## Contributing

When adding new features:

1. Create Vue components in `src/components/`
2. Add corresponding PHP templates in `templates/`
3. Register AJAX handlers in the admin class
4. Update this documentation
5. Test in both development and production modes

---

*This architecture provides a modern, maintainable foundation for the Thrive Admin plugin while preserving WordPress integration and performance.*
