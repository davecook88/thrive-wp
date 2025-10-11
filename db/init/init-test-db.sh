#!/bin/bash
set -e

mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<-EOSQL
    CREATE DATABASE IF NOT EXISTS wordpress_test;
    GRANT ALL PRIVILEGES ON wordpress_test.* TO 'wordpress'@'%';
EOSQL
