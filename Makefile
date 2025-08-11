# Makefile for Thrive WP (WordPress + NestJS Hybrid)

.PHONY: logs-nestjs logs-wp run stop build migrate-show migrate-run migrate-revert migrate-generate

logs-nestjs:
	docker-compose logs -f nestjs

logs-wp:
	docker-compose logs -f wordpress

logs-nginx:
	docker-compose logs -f web

build:
	docker compose build

run:
	(docker compose up &)
	(make watch-wp-themes &)
	wait

stop:
	docker compose down

# --- Database Migrations (executed inside nestjs container) ---
# Usage examples:
#   make migrate-show
#   make migrate-run
#   make migrate-revert
#   make migrate-generate NAME=AddNewTable

NESTJS?=nestjs
MIGRATIONS_DIR?=src/migrations

migrate-show:
	docker compose exec $(NESTJS) npm run typeorm -- migration:show

migrate-run:
	docker compose exec $(NESTJS) npm run typeorm -- migration:run

migrate-revert:
	docker compose exec $(NESTJS) npm run typeorm -- migration:revert

watch-wp-themes:
	cd wordpress/themes/custom-theme && npm run start

# Generate a new migration (pass NAME=DescriptiveName)
migrate-generate:
	@if [ -z "$(NAME)" ]; then echo "ERROR: provide NAME=YourMigrationName"; exit 1; fi; \
	docker compose exec $(NESTJS) npm run typeorm -- migration:generate $(MIGRATIONS_DIR)/$(NAME)