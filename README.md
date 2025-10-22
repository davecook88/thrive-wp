# Thrive WP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

A cutting-edge hybrid web application that seamlessly integrates WordPress's robust CMS capabilities with NestJS's modern API framework, designed for educational institutions to manage classes, bookings, and student interactions. Built with scalability, performance, and developer experience in mind.

## ✨ Features

- **Hybrid Architecture**: Leverages WordPress for content management and NestJS for powerful backend APIs
- **Class Management**: Support for private sessions, group classes, and multi-session courses
- **User Authentication**: Secure Google OAuth integration with JWT-based session management
- **Payment Integration**: Stripe-powered payment processing for seamless transactions
- **Interactive Calendar**: Reusable calendar components for scheduling and booking
- **Admin Dashboard**: Comprehensive admin tools for managing teachers, students, and classes
- **Docker Orchestration**: Fully containerized environment for easy deployment and development
- **Monorepo Structure**: Efficient development with pnpm workspaces and Turborepo
- **Type Safety**: Full TypeScript support across all services

## 🛠 Tech Stack

- **Frontend/CMS**: WordPress with custom themes and plugins
- **Backend API**: NestJS with TypeScript and Zod validation
- **Database**: MariaDB with TypeORM entities
- **Authentication**: Google OAuth 2.0 with JWT sessions
- **Payments**: Stripe API integration
- **Containerization**: Docker & Docker Compose
- **Build Tools**: Turborepo, pnpm, ESLint
- **Testing**: Vitest for unit tests
- **Reverse Proxy**: Nginx for unified access

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- pnpm (v9.0.0+)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/davecook88/thrive-wp.git
   cd thrive-wp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Launch the application**
   ```bash
   docker-compose --env-file .env.local up --build
   ```

5. **Access the application**
   - WordPress Site: [http://localhost:8080](http://localhost:8080)
   - API Health Check: [http://localhost:8080/api/health](http://localhost:8080/api/health)

## 🧪 Testing

1. Complete WordPress installation at `http://localhost:8080`
2. Verify API connectivity via health endpoint
3. Activate the NodeJS Bridge plugin in WordPress admin
4. Test authentication flow with Google OAuth

## 📁 Project Structure

```
thrive-wp/
├── apps/
│   ├── nestjs/          # NestJS API server
│   └── web-calendar/    # React calendar component
├── wordpress/           # WordPress CMS with custom plugins/themes
├── packages/
│   └── shared/          # Shared TypeScript utilities
├── docs/                # Documentation and guides
├── nginx/               # Reverse proxy configuration
└── docker-compose.yml   # Service orchestration
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

- [Service Types System](docs/service-types-system.md)
- [Reusable Calendar Plan](docs/reusable-calendar-plan.md)
- [Gutenberg Calendar Block](docs/gutenberg-calendar-block.md)
- [Thrive Modal Architecture](docs/thrive-modal-architecture.md)
- [API Types & Endpoints](docs/api-types-endpoints.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions or support, please open an issue on GitHub or contact the maintainers.

---

*Built with ❤️ for educational excellence*
