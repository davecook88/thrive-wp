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