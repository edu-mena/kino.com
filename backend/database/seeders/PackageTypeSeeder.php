<?php

namespace Database\Seeders;

use App\Models\PackageType;
use Illuminate\Database\Seeder;

/** Tipos de pacote iniciais (ver plano Fase L3) — o restaurante escolhe
 * quais oferece em `restaurant_packages` (Fase L3b); a equipa Luku pode
 * adicionar mais tipos depois em `/sistema/pacotes`, sem deploy. */
class PackageTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Aniversário', 'icon' => 'cake', 'position' => 1],
            ['name' => 'Reunião de Negócios', 'icon' => 'briefcase', 'position' => 2],
            ['name' => 'Amigos', 'icon' => 'users', 'position' => 3],
            ['name' => 'Feriados', 'icon' => 'party-popper', 'position' => 4],
        ];

        foreach ($types as $type) {
            PackageType::query()->updateOrCreate(['name' => $type['name']], $type);
        }
    }
}
