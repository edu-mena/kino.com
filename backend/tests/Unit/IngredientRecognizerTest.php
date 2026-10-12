<?php

use App\Services\MenusAo\IngredientRecognizer;
use App\Support\IngredientCatalog;

test('reconhece ingredientes do catálogo no nome e na descrição, pela ordem do texto', function () {
    $r = new IngredientRecognizer;

    expect($r->recognize('Thai de Camarão com Ananás', 'Camarão salteado, tomate, ananás e arroz basmati.'))
        ->toBe(['Camarão', 'Ananás', 'Tomate', 'Arroz Basmati']);
});

test('nome contido noutro mais comprido não se repete', function () {
    $r = new IngredientRecognizer;

    expect($r->recognize('Esparguete', 'Massa com molho de tomate e queijo ralado'))
        ->toBe(['Massa', 'Molho de Tomate', 'Queijo Ralado']);
});

test('o que vem depois de "sem" não conta; plurais simples sim; palavras parecidas não', function () {
    $r = new IngredientRecognizer;

    expect($r->recognize('Hambúrguer Novo', 'Pão caseiro, ovos, alface, sem cebola'))
        ->toBe(['Pão Caseiro', 'Ovo', 'Alface']);
});

test('bebidas ficam sem ingredientes', function () {
    $r = new IngredientRecognizer;

    expect($r->recognize('Vinho Tinto Reserva', 'Uvas Touriga Nacional', 'Vinhos Tintos'))->toBe([])
        ->and($r->recognize('Sumo Natural de Manga', 'Manga fresca', 'Sumos'))->toBe([])
        ->and($r->recognize('Salsichas Fritas', 'Salsicha com batata', 'Salsichas'))->toBe(['Salsicha', 'Batata']);
});

test('o catálogo do backend é igual ao do frontend', function () {
    $ts = __DIR__.'/../../../src/data/ingredient-catalog.ts';
    if (! is_file($ts)) {
        $this->markTestSkipped('frontend não disponível');
    }
    $src = (string) file_get_contents($ts);
    $body = substr($src, strpos($src, 'const PROTEINS'), strpos($src, 'export const INGREDIENT_CATALOG') - strpos($src, 'const PROTEINS'));
    preg_match_all('/"([^"]+)"/', $body, $m);

    expect(array_values(array_unique($m[1])))->toBe(IngredientCatalog::NAMES);
});
