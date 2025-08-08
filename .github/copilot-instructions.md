# Copilot Instructions - Thrive WP (WordPress + NestJS Hybrid)

## Architecture Overview
This is a **hybrid WordPress + NestJS application** running in Docker containers. WordPress serves as the frontend/CMS, while NestJS provides modern backend API capabilities. Communication between services happens via HTTP calls within the Docker network.

## Infra - Important!
This entire app must be able to be deployed to a single VPC. This means all services must be accessible within the VPC without relying on public IPs or external DNS.

### Key Services & Ports
- **WordPress**: `localhost:8080` (PHP/Apache container)
- **NestJS API**: `localhost:3000` (Node.js container) 
- **MariaDB**: Internal port 3306 (database container)
- **Network**: All services communicate on `wordpress_net` bridge network

## Critical Patterns

### WordPress-NestJS Bridge Communication
- WordPress calls NestJS via `http://nestjs:3000/` (Docker internal hostname)
- Example in `wordpress/plugins/nodejs-bridge/includes/class-nodejs-bridge.php`:
  ```php
  $url = 'http://nestjs:3000/' . $endpoint;  // Use 'nestjs' hostname, not localhost
  $response = wp_remote_request($url, $args);
  ```
- NestJS endpoints follow REST conventions in `nestjs/src/app.controller.ts`
- Test bridge with shortcode: `[test_nodejs_bridge]`

### Docker Development Workflow
```bash
# Start entire environment
docker-compose --env-file .env.local up --build

# Rebuild specific service
docker-compose build wordpress  # or nestjs
docker-compose up -d wordpress

# View logs
docker-compose logs -f nestjs
docker-compose logs -f wordpress
```

### Plugin Development Pattern
- WordPress plugins mounted as volumes: `./wordpress/plugins/nodejs-bridge:/var/www/html/wp-content/plugins/nodejs-bridge`
- Live reload: Changes to PHP files reflect immediately (no container rebuild)
- Debug logs accessible in `_logs_wp/` directory
- Plugin structure follows WordPress conventions with main file + `includes/` directory

### NestJS Development Pattern  
- Standard NestJS structure in `nestjs/` directory
- Hot reload available via `npm run start:dev` (run inside container)
- Add new endpoints in `app.controller.ts` for WordPress integration
- Use Docker internal hostnames for service-to-service communication

## Environment Configuration
- Copy `.env.example` to `.env.local` before first run
- WordPress debug enabled by default in docker-compose.yml
- Site URLs configured via environment variables (not WordPress admin)

## Testing Integration Points
1. **WordPress Installation**: Visit `localhost:8080`, complete setup
2. **API Health Check**: Visit `localhost:3000` (should show "Hello World!")  
3. **Bridge Test**: Activate NodeJS Bridge plugin, use `[test_nodejs_bridge]` shortcode
4. **Verify Communication**: Check container logs for HTTP requests between services

## File Organization
- `wordpress/plugins/`: WordPress-specific code (PHP)
- `nestjs/src/`: NestJS API code (TypeScript)
- `docker-compose.yml`: Service orchestration (primary config)
- `GEMINI.md`: Architecture decisions and requirements (keep updated)

## Local WP Database
Credentials:
"MYSQL_HOST": "localhost",
"MYSQL_USER": "wordpress",
"MYSQL_PASSWORD": "wordpress",
"MYSQL_DATABASE": "wordpress"

You are able to query the database using the CLI like so: docker-compose exec db mysql -u wordpress -p wordpress wordpress.

Remember that page content is stored in the wp_posts table.

You will be required to update the WP site by making changes to the database. You should open the page at http://localhost:8080/ in your browser to check that the changes have been applied.

The page displayed at http://localhost:8080/ is the homepage of the WordPress site. This is the record with ID 5 in the wp_posts table.