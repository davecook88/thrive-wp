NestJS Observability Setup

This document describes a low-cost, production-friendly observability stack for the NestJS app in this repository. It includes a recommended stack, Docker-compose service examples, config snippets, and minimal NestJS code examples for metrics, structured logs, and traces.

Goals
- Provide metrics, structured logs, error/exception monitoring, and distributed traces.
- Keep costs low (free OSS + optional hosted tiers for traces/errors).
- Work on a single VPS and within existing Docker networking used by the project.

Recommended stack (single-VPS friendly)
- Metrics: Prometheus (scrape /metrics)
- Dashboards/Alerting: Grafana
- Logs: Loki + promtail (or push directly via pino-loki)
- Tracing: OpenTelemetry (Node SDK) -> OTLP Collector -> Tempo / Jaeger or hosted backend (Grafana Cloud Tempo)
- Error tracking (optional): Sentry (easy setup, free tier)

High-level architecture
- NestJS app exposes /metrics (prom-client) and structured logs (pino).
- NestJS sends traces via OpenTelemetry OTLP to an OTEL Collector container.
- OTEL Collector exports traces to Jaeger/Tempo (self-hosted) or a hosted APM provider.
- Prometheus scrapes the NestJS /metrics endpoint.
- Loki receives logs from promtail (tailing container logs) or from pino-loki directly.
- Grafana reads from Prometheus (metrics) and Loki (logs) and Tempo/Jaeger (traces).

Docker Compose example (minimal services to add)
- prometheus
- grafana
- loki
- promtail
- otel-collector
- (optional) jaeger or tempo

Example Prometheus scrape config (prometheus.yml)
```
scrape_configs:
  - job_name: 'nestjs'
    static_configs:
      - targets: ['nestjs:3000']
```

OTEL Collector (basic) config notes
- Accept OTLP (gRPC or HTTP) from app on port 4317/4318.
- Export to jaeger/tempo or a hosted backend using appropriate exporter.
- Use batching and resource limits appropriate to VPS size.

Quick NestJS code snippets

1) Metrics - prom-client
- Install: `npm i prom-client`
- Add a simple controller that exposes /metrics and registers default metrics

2) Structured logs - pino -> Loki
- Install: `npm i pino pino-http pino-loki`
- In `main.ts` replace default logger with pino-http middleware or implement a NestJS Logger that writes to pino.

3) Traces - OpenTelemetry
- Install:
  - `npm i @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-collector`
- Create a bootstrap file (e.g. `src/otel-bootstrap.ts`) and initialize the Node SDK before the app imports other modules.
- Configure sampling for production (traceIdRatio < 1).

Sentry (optional): quick setup
- Install: `npm i @sentry/node @sentry/tracing`
- Init at app bootstrap: `Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.05 })`

Resource & retention recommendations for single VPS
- Prometheus: small block storage, retention 7-14 days, configure WAL settings.
- Loki: short retention (7-14 days) and compact indexes; use filesystem storage and rotate.
- Traces: sample aggressively (1-5%) to avoid high storage.

Phased rollout
1. Dev: Add prom-client and pino locally, run Grafana/Loki locally or use Grafana Cloud free tier.
2. Staging: Add OTEL Collector, test traces with low sampling, tune dashboards/alerts.
3. Prod: Tune retention, sampling, alerts; consider hosted trace backend if trace volume is large.

Next steps (todo)
- Add the Docker Compose service stanzas and example config files (prometheus.yml, otel-collector-config.yaml).
- Add `src/metrics.module.ts`, `src/otel-bootstrap.ts`, and `src/logger.ts` examples into `apps/nestjs/src/`.
- Optionally, create a small Grafana dashboard JSON with basic metrics.

References
- Prometheus: https://prometheus.io/
- Grafana: https://grafana.com/
- Loki: https://grafana.com/oss/loki/
- OpenTelemetry: https://opentelemetry.io/
- Sentry: https://sentry.io/

Document created for the Thrive WP repo on 2025-10-22.
