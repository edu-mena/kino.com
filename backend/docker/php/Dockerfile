FROM php:8.3-fpm-alpine

# Pacotes do sistema num passo próprio (o maior descarregamento, ~900 MB com
# o ffmpeg): fica em cache e não se repete quando só muda a lista de
# extensões PHP abaixo, nem quando um passo seguinte falha. Antes era tudo
# um RUN só — qualquer falha de rede a meio obrigava a descarregar tudo.
RUN apk add --no-cache \
        postgresql-dev \
        $PHPIZE_DEPS \
        oniguruma-dev \
        libzip-dev \
        libpng-dev \
        freetype-dev \
        libjpeg-turbo-dev \
        libwebp-dev \
        ffmpeg

# pcntl: exigido pelo Horizon (worker da fila) — sem ele o `composer install`
# recusa o lock file. Já estava no Dockerfile.prod; faltava aqui.
# --with-webp: miniaturas das imagens (MediaUploadService::storeThumbnails).
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        mbstring \
        zip \
        gd \
        opcache \
        pcntl \
        bcmath

RUN pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

COPY . .
RUN composer dump-autoload --optimize

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

CMD ["php-fpm"]
