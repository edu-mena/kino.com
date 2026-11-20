<?php

namespace App\Console\Commands;

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Services\MenusAo\IngredientRecognizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Cadastra o cardápio de um restaurante a partir de um JSON
 * ({categories: [{name, items: [[nome, preço, descrição?]]}]}), p.ex. um
 * menu em PDF transcrito. Idempotente: pratos que já existem (mesmo nome e
 * categoria) não são tocados, para nunca pisar edições do dono.
 *
 *   php artisan menu:import-file gep database/data/menus/gep.json --dry-run
 *   php artisan menu:import-file gep database/data/menus/gep.json
 */
class ImportMenuFile extends Command
{
    protected $signature = 'menu:import-file {restaurant : id ou parte do nome} {file : caminho do JSON} {--dry-run}';

    protected $description = 'Cadastra o cardápio de um restaurante a partir de um ficheiro JSON';

    public function handle(IngredientRecognizer $recognizer): int
    {
        $file = base_path($this->argument('file'));
        $data = is_file($file) ? json_decode(file_get_contents($file), true) : null;
        if (! is_array($data) || ! isset($data['categories'])) {
            $this->error("Ficheiro inválido ou inexistente: {$file}");

            return self::FAILURE;
        }

        $key = (string) $this->argument('restaurant');
        $matches = Restaurant::query()
            ->where(fn ($q) => ctype_digit($key) ? $q->where('id', (int) $key) : $q->where('name', 'ilike', "%{$key}%"))
            ->get();
        if ($matches->count() !== 1) {
            $this->error($matches->isEmpty() ? 'Nenhum restaurante encontrado.' : 'Vários restaurantes encontrados — usa o id:');
            foreach ($matches as $r) {
                $this->line("  #{$r->id} — {$r->name}");
            }

            return self::FAILURE;
        }
        /** @var Restaurant $restaurant */
        $restaurant = $matches->first();
        $this->info("Restaurante: #{$restaurant->id} {$restaurant->name}, criado em {$restaurant->created_at}");

        $dry = (bool) $this->option('dry-run');
        $created = $skipped = $ingredients = 0;

        DB::transaction(function () use ($restaurant, $data, $recognizer, $dry, &$created, &$skipped, &$ingredients) {
            $menu = $dry ? null : $restaurant->menus()->firstOrCreate(['name' => 'Cardápio Principal'], ['is_active' => true]);

            foreach ($data['categories'] as $category) {
                foreach ($category['items'] as $row) {
                    [$name, $price] = $row;
                    $description = $row[2] ?? null;

                    $exists = MenuItem::query()->where('restaurant_id', $restaurant->id)
                        ->where('category', $category['name'])->where('name', $name)->exists();
                    if ($exists) {
                        $skipped++;

                        continue;
                    }
                    $created++;
                    if ($dry) {
                        continue;
                    }

                    $item = MenuItem::query()->create([
                        'restaurant_id' => $restaurant->id,
                        'menu_id' => $menu->id,
                        'name' => $name,
                        'description' => $description,
                        'price' => $price,
                        'category' => $category['name'],
                        'is_available' => true,
                    ]);
                    foreach ($recognizer->recognize($name, $description, $category['name']) as $position => $ing) {
                        $item->ingredients()->create(['name' => $ing, 'removable' => true, 'extra_price' => null, 'position' => $position]);
                        $ingredients++;
                    }
                }
            }
        });

        $this->info(($dry ? '[dry-run] ' : '')."Pratos novos: {$created} · já existiam: {$skipped} · ingredientes: {$ingredients}");
        foreach ($data['skipped'] ?? [] as $s) {
            $this->line("  não cadastrado: {$s}");
        }

        return self::SUCCESS;
    }
}
