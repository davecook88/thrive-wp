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

# Configure PHP for file uploads and image processing
# These should match or exceed the frontend constraints
RUN echo "upload_max_filesize = 50M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 50M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/uploads.ini

COPY --from=builder /tmp/build/apps/wordpress/plugins /var/www/html/wp-content/plugins
COPY --from=builder /tmp/build/apps/wordpress/themes /var/www/html/wp-content/themes