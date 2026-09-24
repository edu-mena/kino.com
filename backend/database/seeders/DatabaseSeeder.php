<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed de fundação — catálogos/singletons da plataforma + conteúdo
     * institucional Luku. Seeds de restaurantes de demonstração (equivalente
     * ao `INITIAL_RESTAURANTS` do mock) ficam para a Fase 1 (migração de
     * Restaurant+MenuItem), fora do escopo desta Fase 0.
     */
    public function run(): void
    {
        $this->call([
            PaymentMethodSeeder::class,
            DeliveryPolicySeeder::class,
            OperatorSeeder::class,
            LukuInstitutionalSeeder::class,
            PackageTypeSeeder::class,
        ]);
    }
}
