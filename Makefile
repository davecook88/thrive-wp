# Makefile for Thrive WP (WordPress + NestJS Hybrid)

.PHONY: logs-nestjs logs-wp

logs-nestjs:
	docker-compose logs -f nestjs

logs-wp:
	docker-compose logs -f wordpress
