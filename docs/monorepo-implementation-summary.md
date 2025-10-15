# Monorepo Implementation Summary

## What Was Accomplished

Successfully converted the thrive-wp project to a **pnpm workspaces + Turborepo monorepo** with proper TypeScript workspace package resolution.

## Key Changes

### 1. Package Structure
- **Root**: Workspace configuration
- **apps/nestjs**: NestJS API (`@thrive/api`)
- **apps/wordpress**: WordPress CMS
- **packages/shared**: Shared TypeScript types and utilities (`@thrive/shared`)

### 2. Workspace Configuration

#### pnpm-workspace.yaml
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### .npmrc
```properties
node-linker=hoisted
prefer-workspace-packages=true
auto-install-peers=true
strict-peer-dependencies=false
```

### 3. Docker Solution

The critical fix for ESM module resolution in Docker:

**Problem**: When Node.js resolves imports from `/app/packages/shared/dist/`, it can't find dependencies like `zod` because there's no `node_modules` at that path.

**Solution**: Create a symlink in the Dockerfile development stage:
```dockerfile
# Development stage - keeps full monorepo with node_modules for hot reload
FROM builder AS development
WORKDIR /app
# Create node_modules symlink in packages/shared for ESM resolution
RUN ln -sfn /app/node_modules /app/packages/shared/node_modules
```

This allows Node's ESM resolver to find dependencies when following the `@thrive/shared` workspace symlink.

### 4. TypeScript Configuration

#### packages/shared/tsconfig.json
- Added `"emitDeclarationOnly": false` explicitly
- **Critical**: Delete stale `tsconfig.tsbuildinfo` files before builds

#### apps/nestjs/tsconfig.json
- Added `"exclude": ["node_modules", "dist", "test", "**/*.spec.ts", "**/*.e2e-spec.ts"]`
- Removed custom path mappings for `@thrive/shared` (uses standard Node resolution)

### 5. Single docker-compose.yml

Removed `docker-compose.override.yml` complexity. Now using a single `docker-compose.yml` with:

```yaml
nestjs:
  build:
    context: .
    dockerfile: docker/nestjs.Dockerfile
    target: development  # Use development stage
  command: sh -c "cd /app/apps/nestjs && pnpm exec nest start --watch"
  working_dir: /app
  volumes:
    # Mount source files for hot reload (NOT node_modules)
    - ./apps/nestjs/src:/app/apps/nestjs/src:cached
    - ./packages/shared/src:/app/packages/shared/src:cached
    - ./packages/shared/dist:/app/packages/shared/dist:cached
    # ... other source file mounts
  environment:
    NODE_ENV: development
```

**Key principle**: Mount source files, let Docker image's built `node_modules` (with workspace symlinks) handle dependencies.

### 6. Local Development Symlink

Created locally for consistency:
```bash
cd packages/shared
ln -sfn ../../node_modules node_modules
```

## Usage

### Development Mode
```bash
make dev
```

This starts all services with:
- ✅ Hot reload for source file changes
- ✅ Proper workspace package resolution
- ✅ ESM module resolution for shared dependencies

### Shared Package Changes
When modifying `packages/shared`:
1. Edit files in `packages/shared/src/`
2. Rebuild: `pnpm turbo build --filter=@thrive/shared`
3. Changes automatically picked up by watch mode

## Troubleshooting

### "Cannot find module '@thrive/shared'"
**Cause**: node_modules doesn't have workspace symlinks
**Fix**: Rebuild nestjs service:
```bash
docker-compose down
docker-compose build --no-cache nestjs
docker-compose up nestjs
```

### "Cannot find package 'zod'"
**Cause**: ESM resolution can't find shared package dependencies
**Fix**: Verify symlink exists in container:
```bash
docker-compose exec nestjs ls -la /app/packages/shared/node_modules
# Should show: lrwxrwxrwx ... node_modules -> /app/node_modules
```

### Stale TypeScript Build Cache
**Cause**: `tsconfig.tsbuildinfo` preventing recompilation
**Fix**: Already handled in Dockerfile:
```dockerfile
RUN find . -name "tsconfig.tsbuildinfo" -delete && \
    pnpm turbo build --filter=@thrive/shared
```

## Benefits Achieved

1. ✅ **Type Safety**: Shared types consistently used across NestJS and web components
2. ✅ **DRY**: Single source of truth for types, Zod schemas, utilities
3. ✅ **Hot Reload**: Fast development iteration
4. ✅ **Simple Configuration**: Single docker-compose.yml, no override complexity
5. ✅ **ESM Compatibility**: Proper module resolution with Node.js ESM
6. ✅ **Build Optimization**: Turborepo caching and parallel builds

## Architecture

```
thrive-wp/
├── apps/
│   ├── nestjs/          (@thrive/api)
│   │   └── node_modules/
│   │       └── @thrive/
│   │           └── shared -> ../../../../packages/shared (symlink)
│   └── wordpress/
├── packages/
│   └── shared/          (@thrive/shared)
│       ├── src/         (TypeScript source)
│       ├── dist/        (Compiled JS + .d.ts)
│       └── node_modules -> ../../node_modules (symlink for ESM resolution)
└── node_modules/        (Hoisted dependencies)
```

## Next Steps

Consider:
- [ ] Add `@thrive/shared` to web-calendar component
- [ ] Add shared validation schemas for WordPress plugin
- [ ] Set up Turborepo remote caching for CI/CD
- [ ] Add shared React components package if needed
