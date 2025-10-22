# Makefile for Thrive WP (WordPress + NestJS Hybrid Monorepo)

.PHONY: logs-nestjs logs-wp logs-nginx run stop build test lint type-check clean migrate-show migrate-run migrate-revert migrate-generate dev prod-deploy watch-wp-themes watch-admin-plugin

logs-nestjs:
	docker-compose logs -f nestjs

logs-wp:
	docker-compose logs -f wordpress

logs-nginx:
	docker-compose logs -f web

# Monorepo commands using turbo
build:
	pnpm run build

test:
	pnpm run test

lint:
	pnpm run lint

type-check:
	pnpm run type-check

clean:
	pnpm run clean

run:
	docker compose up

stop:
	docker compose down

nest-pnpmi:
	docker compose exec nestjs pnpm install

# --- Database Migrations (executed inside nestjs container) ---
# Usage examples:
#   make migrate-show
#   make migrate-run
#   make migrate-revert
#   make migrate-generate NAME=AddNewTable

NESTJS?=nestjs
MIGRATIONS_DIR?=src/migrations

# Run pnpm inside the apps/nestjs directory so workspace package.json scripts
# are available to the container process.
migrate-show:
	docker compose exec $(NESTJS) sh -lc "cd apps/nestjs && pnpm run migration:show"

migrate-run:
	docker compose exec $(NESTJS) sh -lc "cd apps/nestjs && pnpm run migration:run"

migrate-revert:
	docker compose exec $(NESTJS) sh -lc "cd apps/nestjs && pnpm run migration:revert"

watch-wp-themes:
	cd apps/wordpress/themes/custom-theme && pnpm run start

watch-admin-plugin:
	cd apps/wordpress/plugins/thrive-admin && pnpm run dev

# Start development with hot-reload (source files mounted for live updates)
dev:
	docker-compose up --build

# Build and deploy production containers (detached)
prod-deploy:
	docker-compose up --build -d

# Generate a new migration (pass NAME=DescriptiveName)
migrate-generate:
	@if [ -z "$(NAME)" ]; then echo "ERROR: provide NAME=YourMigrationName"; exit 1; fi; \
	docker compose exec $(NESTJS) pnpm run typeorm -- migration:generate $(MIGRATIONS_DIR)/$(NAME)