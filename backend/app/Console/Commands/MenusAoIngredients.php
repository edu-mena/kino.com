<?php

namespace App\Console\Commands;

use App\Models\MenuItem;
use App\Models\RestaurantImport;
use App\Services\MenusAo\IngredientRecognizer;
use App\Services\MenusAo\MenusAoImporter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Preenche os ingredientes dos pratos já importados do menus.ao a partir
 * das descrições (ver IngredientRecognizer). Só restaurantes por ativar e
 * só pratos ainda sem ingredientes — corre as vezes que for preciso.
 * Restaurantes já ativados são do dono: nunca lhes mexe.
 *
 *   php artisan menus-ao:ingredients --dry-run
 *   php artisan menus-ao:ingredients
 */
class MenusAoIngredients extends Command
{
    protected $signature = 'menus-ao:ingredients {--dry-run : Só conta, sem gravar}';

    protected $description = 'Reconhece ingredientes nas descrições dos pratos importados do menus.ao';

    public function handle(MenusAoImporter $importer, IngredientRecognizer $recognizer): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $imports = RestaurantImport::query()
            ->with('restaurant')
            ->where('source', RestaurantImport::SOURCE_MENUS_AO)
            ->whereNull('activated_at')
            ->whereNull('discarded_at')
            ->get()
            ->filter(fn (RestaurantImport $i) => $i->restaurant && ! $i->restaurant->trashed() && ! $i->restaurant->is_published);

        $totals = ['dishes' => 0, 'withIngredients' => 0, 'ingredients' => 0];
        foreach ($imports as $import) {
            $restaurant = $import->restaurant;
            $items = MenuItem::query()
                ->where('restaurant_id', $restaurant->id)
                ->whereDoesntHave('ingredients')
                ->get();

            $dishes = 0;
            $added = 0;
            DB::transaction(function () use ($items, $importer, $recognizer, $dryRun, &$dishes, &$added) {
                foreach ($items as $item) {
                    $count = $dryRun
                        ? count($recognizer->recognize($item->name, $item->description, $item->category))
                        : $importer->attachIngredients($item);
                    if ($count > 0) {
                        $dishes++;
                        $added += $count;
                    }
                }
            });

            if (! $dryRun) {
                $withIngredients = MenuItem::query()->where('restaurant_id', $restaurant->id)->whereHas('ingredients')->count();
                $import->update(['stats' => [...($import->stats ?? []), 'withIngredients' => $withIngredients]]);
            }

            $totals['dishes'] += $items->count();
            $totals['withIngredients'] += $dishes;
            $totals['ingredients'] += $added;
            $this->line("{$restaurant->name}: {$dishes} de {$items->count()} pratos com ingredientes ({$added})");
        }

        $this->newLine();
        $this->info(sprintf(
            '%s %d de %d pratos ficaram com ingredientes (%d no total).',
            $dryRun ? 'Ensaio:' : 'Feito:',
            $totals['withIngredients'],
            $totals['dishes'],
            $totals['ingredients'],
        ));

        return self::SUCCESS;
    }
}
