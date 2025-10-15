# Monorepo Conversion Plan for Thrive WP

**Note: This migration has been completed.** This document is kept for historical reference.



## Current State Analysis

### Existing "Apps":
1. **NestJS** (`/nestjs`) - Backend API service
2. **WordPress** (`/wordpress`) - PHP/WordPress CMS with TypeScript plugins/themes
3. **Web Components** (`/web-components/thrive-calendar`) - Lit-based reusable calendar
4. **Shared** (`/shared`) - Shared TypeScript types and utilities

### Current Problems:
- Inconsistent import paths (`@shared/*`, `../../shared/`, `../../../../../shared/`)
- Manual TypeScript compilation (`build:shared`, `watch:shared` scripts)
- No centralized dependency management
- Duplicate dependencies across packages
- No workspace-level tooling or coordination
- Docker builds don't handle monorepo structure properly

---

## Recommended Solution: pnpm Workspaces + Turborepo

### Why pnpm + Turborepo?
- **pnpm workspaces**: Efficient dependency management, true symlinks, saves disk space
- **Turborepo**: Fast task orchestration, intelligent caching, perfect for mixed tech stacks
- **Docker-friendly**: Supports pruning/filtering for lean container builds
- **TypeScript-native**: Excellent path mapping and project references support

---

## Phase 1: Restructure Directory Layout

### New Structure:
```
thrive-wp/
├── package.json                        # Root workspace config
├── pnpm-workspace.yaml                # Workspace definition
├── turbo.json                         # Turborepo pipeline config
├── tsconfig.base.json                 # Base TS config for all packages
├── .npmrc                             # pnpm config
├── apps/
│   ├── nestjs/                        # Renamed from nestjs/
│   │   ├── package.json               # name: "@thrive/api"
│   │   ├── Dockerfile
│   │   └── ...
│   ├── wordpress/                     # Renamed from wordpress/
│   │   ├── package.json               # name: "@thrive/wordpress"
│   │   └── ...
│   └── web-calendar/                  # Renamed from web-components/thrive-calendar/
│       ├── package.json               # name: "@thrive/web-calendar"
│       └── ...
├── packages/
│   └── shared/                        # Renamed from shared/
│       ├── package.json               # name: "@thrive/shared"
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── types/
│       │   └── clients/
│       └── dist/                      # Built output
├── docker/
│   ├── nestjs.Dockerfile              # Monorepo-aware build
│   ├── wordpress.Dockerfile
│   └── .dockerignore
├── docker-compose.yml                 # Updated volume mounts
└── docs/
```

---

## Phase 2: Package Configuration

### 2.1 Root `package.json`
```json
{
  "name": "@thrive/monorepo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.4",
    "prettier": "^3.3.0",
    "eslint": "^9.0.0"
  }
}
```

### 2.2 `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 2.3 `.npmrc`
```ini
# Use symlinks for local workspace packages
node-linker=hoisted
prefer-workspace-packages=true
auto-install-peers=true
strict-peer-dependencies=false
```

### 2.4 `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## Phase 3: Shared Package Setup

### 3.1 `packages/shared/package.json`
```json
{
  "name": "@thrive/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types/*": {
      "types": "./dist/types/*.d.ts",
      "import": "./dist/types/*.js"
    },
    "./clients/*": {
      "types": "./dist/clients/*.d.ts",
      "import": "./dist/clients/*.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "rrule": "^2.8.1",
    "zod": "^4.1.12"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}
```

### 3.2 `packages/shared/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.3 Move files: `shared/` → `packages/shared/src/`
- All existing `.ts` files move to `src/`
- Update `index.ts` imports to remove `.js` extensions (handled by package exports)

---

## Phase 4: App Package Updates

### 4.1 NestJS (`apps/nestjs/package.json`)
```json
{
  "name": "@thrive/api",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@thrive/shared": "workspace:*",
    // ... existing dependencies
  },
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "test": "jest",
    "type-check": "tsc --noEmit"
    // Remove build:shared, watch:shared scripts
  }
}
```

### 4.2 Update `apps/nestjs/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": {
      "@thrive/shared": ["../../packages/shared/src"],
      "@thrive/shared/*": ["../../packages/shared/src/*"],
      "@/*": ["src/*"]
    }
  },
  "references": [
    { "path": "../../packages/shared" }
  ]
}
```

### 4.3 Replace all imports in NestJS:
```typescript
// Old:
import { PublicTeacherDto } from "@shared/types/teachers.js";
import { PublicTeacherDto } from "../../../shared/types/teachers.js";

// New:
import { PublicTeacherDto } from "@thrive/shared/types/teachers";
```

### 4.4 WordPress (`apps/wordpress/package.json`)
```json
{
  "name": "@thrive/wordpress",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@thrive/shared": "workspace:*",
    // ... existing dependencies
  },
  "scripts": {
    "build": "pnpm -r --filter './themes/*' --filter './plugins/*' build",
    "dev": "pnpm -r --filter './themes/*' --filter './plugins/*' start",
    "type-check": "tsc --noEmit"
  }
}
```

### 4.5 WordPress Theme (`apps/wordpress/themes/custom-theme/package.json`)
```json
{
  "name": "@thrive/wordpress-theme",
  "dependencies": {
    "@thrive/shared": "workspace:*"
  }
}
```

### 4.6 Update WordPress TypeScript configs:
```json
{
  "extends": "../../../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@thrive/shared": ["../../../../packages/shared/src"],
      "@thrive/shared/*": ["../../../../packages/shared/src/*"]
    }
  },
  "references": [
    { "path": "../../../../packages/shared" }
  ]
}
```

### 4.7 Web Calendar (`apps/web-calendar/package.json`)
```json
{
  "name": "@thrive/web-calendar",
  "dependencies": {
    "@thrive/shared": "workspace:*",
    "lit": "^3.1.0"
  }
}
```

---

## Phase 5: Docker Integration

### 5.1 Multi-stage Dockerfiles with pnpm

**`docker/nestjs.Dockerfile`:**
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS pruner
WORKDIR /app
COPY . .
RUN pnpm turbo prune --scope=@thrive/api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@thrive/api...

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/nestjs/dist ./dist
COPY --from=installer /app/apps/nestjs/node_modules ./node_modules
COPY --from=installer /app/packages/shared/dist ./packages/shared/dist
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```

**`docker/wordpress.Dockerfile`:**
```dockerfile
FROM wordpress:latest AS base

# Install Node.js for building assets
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS builder
WORKDIR /tmp/build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/wordpress ./apps/wordpress

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @thrive/shared build
RUN pnpm --filter @thrive/wordpress build

FROM wordpress:latest
COPY --from=builder /tmp/build/apps/wordpress/plugins /var/www/html/wp-content/plugins
COPY --from=builder /tmp/build/apps/wordpress/themes /var/www/html/wp-content/themes
```

### 5.2 Update `docker-compose.yml`:
```yaml
services:
  nestjs:
    build:
      context: .
      dockerfile: docker/nestjs.Dockerfile
    volumes:
      # For dev, mount source for hot reload
      - ./apps/nestjs:/app/apps/nestjs
      - ./packages/shared:/app/packages/shared
      - /app/node_modules
      - /app/apps/nestjs/node_modules

  wordpress:
    build:
      context: .
      dockerfile: docker/wordpress.Dockerfile
    volumes:
      - ./apps/wordpress/plugins:/var/www/html/wp-content/plugins
      - ./apps/wordpress/themes:/var/www/html/wp-content/themes
```

### 5.3 `.dockerignore`:
```
node_modules
**/node_modules
**/dist
**/build
**/.next
.git
.env*
!.env.example
.turbo
coverage
```

---

## Phase 6: Migration Steps (Execution Order)

### Step 1: Install pnpm and Turborepo
```bash
npm install -g pnpm@9.0.0
```

### Step 2: Create new structure (DO NOT delete old yet)
```bash
mkdir -p apps packages docker
```

### Step 3: Move packages
```bash
# Move shared FIRST
mv shared packages/shared
mkdir -p packages/shared/src
mv packages/shared/*.ts packages/shared/src/
mv packages/shared/types packages/shared/src/
mv packages/shared/clients packages/shared/src/

# Move apps
mv nestjs apps/nestjs
mv wordpress apps/wordpress
mv web-components/thrive-calendar apps/web-calendar
```

### Step 4: Create root configs
```bash
# Create files from Phase 2
touch pnpm-workspace.yaml
touch turbo.json
touch tsconfig.base.json
touch .npmrc
```

### Step 5: Update all package.json files
- Update names to `@thrive/*` scoped packages
- Add `@thrive/shared: "workspace:*"` dependencies
- Remove manual build scripts for shared

### Step 6: Update all tsconfig.json files
- Add project references to `packages/shared`
- Update path mappings to use workspace structure

### Step 7: Update all imports
```bash
# Run find/replace in VS Code:
# Find: from ["'](@shared|\.\.\/\.\..*shared)\/
# Replace with: from "@thrive/shared/

# Or use script:
find apps -name "*.ts" -o -name "*.tsx" | xargs sed -i '' \
  's/from ['\''"]@shared\//from "@thrive\/shared\//g' \
  's/from ['\''"]\.\.\/.*\/shared\//from "@thrive\/shared\//g'
```

### Step 8: Install dependencies
```bash
pnpm install
```

### Step 9: Build shared package
```bash
pnpm --filter @thrive/shared build
```

### Step 10: Test each app
```bash
pnpm --filter @thrive/api build
pnpm --filter @thrive/wordpress type-check
pnpm --filter @thrive/web-calendar build
```

### Step 11: Update Docker setup
- Move Dockerfiles to `docker/` directory
- Update docker-compose.yml with new paths
- Test Docker builds

### Step 12: Update CI/CD
- Update GitHub Actions workflows to use pnpm
- Add turbo caching configuration

---

## Phase 7: Benefits After Migration

### Development Experience:
- ✅ Single `pnpm install` for entire workspace
- ✅ `pnpm dev` runs all apps concurrently
- ✅ Type-safe imports with IntelliSense across packages
- ✅ Shared dependencies hoisted (smaller disk usage)
- ✅ Automatic rebuild of shared when changed

### Build Performance:
- ✅ Turborepo caching (2-100x faster repeated builds)
- ✅ Parallel task execution
- ✅ Only rebuild changed packages

### Type Safety:
- ✅ TypeScript project references for incremental compilation
- ✅ Breaking changes in shared types caught immediately
- ✅ No more manual `watch:shared` scripts

### Docker:
- ✅ Optimized layer caching with `turbo prune`
- ✅ Smaller production images (only needed dependencies)
- ✅ Consistent builds across environments

---

## Phase 8: Optional Enhancements

### 8.1 Add Changesets for versioning
```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

### 8.2 Add Biome or Prettier for formatting
```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

### 8.3 Add shared ESLint config
```
packages/
  └── eslint-config/
      ├── package.json
      └── index.js
```

### 8.4 Add shared TypeScript configs
```
packages/
  └── tsconfig/
      ├── base.json
      ├── nextjs.json
      └── node.json
```

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking existing dev workflow** | Keep old structure temporarily, test thoroughly |
| **Docker build failures** | Test Docker separately, use multi-stage builds |
| **Import path issues** | Use automated find/replace, add ESLint rules |
| **Deployment disruption** | Deploy to staging first, have rollback plan |
| **Team learning curve** | Document commands, create runbook |

---

## Timeline Estimate

- **Phase 1-2** (Structure + Root config): 2-4 hours
- **Phase 3** (Shared package): 2-3 hours
- **Phase 4** (App updates): 4-6 hours
- **Phase 5** (Docker): 3-4 hours
- **Phase 6** (Migration): 2-3 hours
- **Testing & fixes**: 4-8 hours

**Total: 2-3 days** (with buffer for unexpected issues)

---

## Success Criteria

- [ ] All apps build successfully with `pnpm turbo build`
- [ ] Dev environment starts with `pnpm dev`
- [ ] All imports resolve correctly (no red squiggles)
- [ ] Docker containers build and run
- [ ] Tests pass (`pnpm turbo test`)
- [ ] Type checking passes (`pnpm turbo type-check`)
- [ ] Hot reload works in dev mode
- [ ] Shared types update propagate to all apps

---

## Additional Notes

### Base TypeScript Configuration

Create `tsconfig.base.json` at the root:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["ES2020"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

### Common Commands Reference

```bash
# Install dependencies across all packages
pnpm install

# Run dev mode for all apps
pnpm dev

# Build all packages
pnpm build

# Build specific package
pnpm --filter @thrive/api build

# Run tests
pnpm test

# Run tests for specific package
pnpm --filter @thrive/api test

# Clean all build artifacts
pnpm clean

# Add dependency to specific package
pnpm --filter @thrive/api add express

# Add dev dependency to workspace root
pnpm add -Dw prettier

# Update shared package and rebuild dependents
pnpm --filter @thrive/shared build && pnpm --filter ...@thrive/shared build
```

---

This plan provides a complete, production-ready monorepo structure that will solve all current import path issues, improve build performance, and make the codebase more maintainable. The phased approach allows for incremental migration with minimal risk.
