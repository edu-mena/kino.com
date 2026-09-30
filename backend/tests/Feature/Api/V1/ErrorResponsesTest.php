<?php

test('404 de route model binding não expõe nomes de classes internas', function () {
    $this->getJson('/api/v1/restaurants/00000000-0000-0000-0000-000000000000')
        ->assertNotFound()
        ->assertExactJson(['message' => 'Recurso não encontrado.']);
});

test('404 de rota inexistente continua a ser 404 JSON', function () {
    $this->getJson('/api/v1/rota-que-nao-existe')->assertNotFound();
});
