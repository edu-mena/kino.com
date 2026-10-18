<?php

namespace App\Console\Commands;

use App\Services\SeededRestaurants\SeededRestaurantGenerator;
use Illuminate\Console\Command;

/**
 * Gera os 50 restaurantes do Catalog (30 em Luanda + 2 por província
 * noutras 10), visíveis e funcionais, com cardápio copiado dos importados.
 * Desativar/apagar: /sistema/gerados. Idempotente.
 *
 *   php artisan restaurants:seed-demo
 */
class SeedDemoRestaurants extends Command
{
    protected $signature = 'restaurants:seed-demo
        {--batch=lote-2026-10 : Nome do lote (para gerir em grupo)}
        {--password=Luku2026! : Senha de todas as contas de dono do lote}';

    protected $description = 'Cria os restaurantes gerados (cardápios dos importados) com contas de acesso simples';

    public function handle(SeededRestaurantGenerator $generator): int
    {
        $results = $generator->generate((string) $this->option('batch'), (string) $this->option('password'));

        $this->table(
            ['Restaurante', 'Província', 'Pratos', 'Email de acesso', 'Novo?'],
            collect($results)->map(fn ($r) => [
                $r['restaurant']->name,
                $r['restaurant']->city,
                $r['items'],
                $r['email'],
                $r['created'] ? 'sim' : 'já existia',
            ]),
        );

        $created = collect($results)->where('created', true)->count();
        $this->info("{$created} restaurantes criados. Senha de todas as contas: ".$this->option('password'));
        if (collect($results)->contains(fn ($r) => $r['items'] === 0)) {
            $this->warn('Alguns restaurantes ficaram sem pratos — não há restaurantes importados com essa cozinha.');
        }

        return self::SUCCESS;
    }
}
