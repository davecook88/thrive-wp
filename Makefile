# Makefile for Thrive WP (WordPress + NestJS Hybrid)

.PHONY: logs-nestjs logs-wp run stop build

logs-nestjs:
	docker-compose logs -f nestjs

logs-wp:
	docker-compose logs -f wordpress

build:
	docker compose build

run:
	docker compose up --build

stop:
	docker compose down