FROM wordpress:latest

# Configure PHP for file uploads and image processing
RUN echo "upload_max_filesize = 50M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 50M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/uploads.ini

# Install WP CLI
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && \
    chmod +x wp-cli.phar && \
    mv wp-cli.phar /usr/local/bin/wp

# Copy entrypoint script
COPY docker/wp-entrypoint.sh /wp-entrypoint-custom.sh
RUN chmod +x /wp-entrypoint-custom.sh

# Replace the default entrypoint with our custom one
ENTRYPOINT ["/wp-entrypoint-custom.sh"]
CMD ["apache2-foreground"]
