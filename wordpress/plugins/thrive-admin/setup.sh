#!/bin/bash

# Thrive Admin Vue Islands Setup Script
# This script sets up the Vue.js development environment for the Thrive Admin plugin

echo "🚀 Setting up Thrive Admin Vue Islands Architecture..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the thrive-admin plugin directory"
    echo "   cd wordpress/plugins/thrive-admin && ./setup.sh"
    exit 1
fi

echo "📦 Installing Node.js dependencies..."
npm install

echo "✅ Dependencies installed successfully!"

echo ""
echo "🎯 Next steps:"
echo "1. Make sure WP_DEBUG is set to true in your wp-config.php"
echo "2. Run 'make run' from the project root to start development"
echo "3. Visit WordPress admin to see the Vue-powered interface"
echo ""

echo "📚 For detailed documentation, see VUE_ISLANDS_README.md"

echo ""
echo "🔧 Available commands:"
echo "  npm run dev     - Start Vite development server"
echo "  npm run build   - Build for production"
echo "  make run        - Start all services (Docker + watchers)"
echo ""

echo "🎉 Setup complete! Happy coding! 🎉"
