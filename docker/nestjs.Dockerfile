# Base image with pnpm
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Prune the monorepo to only include @thrive/api and its dependencies
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
# Debug: Check what turbo prune includes
RUN turbo prune --scope=@thrive/api --docker && \
    echo "=== Pruned packages ===" && \
    ls -la out/full/packages/ || echo "No packages" && \
    ls -la out/full/apps/ || echo "No apps"

# Build stage
FROM base AS builder
WORKDIR /app
# Copy pruned package files and source code
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/ .
# Install dependencies
RUN pnpm install --frozen-lockfile
# Clean any stale tsbuildinfo files and build shared package
RUN find . -name "tsconfig.tsbuildinfo" -delete && \
    pnpm turbo build --filter=@thrive/shared
# Build NestJS app
WORKDIR /app/apps/nestjs
RUN pnpm run build

# Development stage - keeps full monorepo with node_modules for hot reload
FROM builder AS development
WORKDIR /app
# Create node_modules symlink in packages/shared for ESM resolution
RUN ln -sfn /app/node_modules /app/packages/shared/node_modules
# No CMD - will be overridden by docker-compose

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/apps/nestjs/dist ./dist
COPY --from=builder /app/apps/nestjs/package.json ./package.json

# Copy node_modules (with proper pnpm structure)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/nestjs/node_modules ./node_modules

# Copy built shared package
COPY --from=builder /app/packages/shared/dist ./node_modules/@thrive/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@thrive/shared/package.json

CMD ["node", "dist/main.js"]
