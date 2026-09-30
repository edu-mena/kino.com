<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Trava de segurança antes de qualquer trait (RefreshDatabase faz
     * `migrate:fresh`): as `<env>` do phpunit.xml NÃO se sobrepõem a
     * variáveis já definidas no ambiente — dentro do container `app` do
     * docker-compose (DB_DATABASE=luku) os testes corriam contra a BD de
     * desenvolvimento e apagavam-na (aconteceu a 2026-09-30). Qualquer BD
     * cujo nome não comece por `luku_test` (luku_test, luku_test_engage...)
     * aborta a suite antes de tocar em nada.
     */
    protected function setUpTraits()
    {
        $connection = config('database.default');
        $database = (string) config("database.connections.{$connection}.database");

        if (! str_starts_with($database, 'luku_test')) {
            throw new RuntimeException(
                "Testes recusados: a BD \"{$database}\" não é de teste (esperado luku_test*). "
                .'Corra os testes no host (php vendor/bin/pest), não dentro do container app.'
            );
        }

        $traits = parent::setUpTraits();

        // Documentos privados (comprovativos/faturas) nunca tocam num
        // bucket real em teste — mesmo nos testes que não os usam de
        // propósito (um Observer/Resource pode gerar URL assinado).
        Storage::fake(config('filesystems.documents_disk'));

        return $traits;
    }
}
