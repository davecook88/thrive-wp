FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build deps
RUN apk add --no-cache python3 make g++

# Copy package manifests and install deps
COPY nestjs/package*.json ./
RUN npm ci

# Copy nest source and shared types from repo root into the build image
COPY nestjs/ ./
COPY shared/ ./shared/

# Build (produces dist)
RUN npm run build --prefix ./

#############################################
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Install runtime deps (only prod)
COPY nestjs/package*.json ./
RUN npm ci --production

# Copy built app and shared types from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/shared ./shared

ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "dist/main.js"]
FROM node:20-alpine

WORKDIR /usr/src/app

# Install build dependencies needed for native modules like bcrypt
RUN apk add --no-cache python3 make g++

# Copy only package manifests first to leverage cached layer
COPY package*.json ./

# Prefer clean, reproducible install
RUN npm ci

# Copy application source
COPY . .

CMD ["npm", "run", "start:dev"]