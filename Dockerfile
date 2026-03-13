FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_sqlite

WORKDIR /var/www/html

COPY . /var/www/html

# Usa o front controller do backend em produção
RUN rm -f /var/www/html/index.html || true
RUN ln -s backend/public/index.php /var/www/html/index.php

