<?php

namespace App\Console\Commands;

use App\Models\RestaurantImport;
use App\Services\MediaUploadService;
use App\Services\MenusAo\MenusAoClient;
use App\Services\MenusAo\MenusAoImporter;
use App\Services\MenusAo\MenusAoParser;
use Illuminate\Console\Command;
use Throwable;

/**
 * Pré-cadastra na Luku os restaurantes do menus.ao (cardápio completo, fotos
 * e contactos privados), invisíveis até um operador os ativar em
 * /sistema/importados.
 *
 *   php artisan menus-ao:import --dry-run            # só lê e mostra o resumo
 *   php artisan menus-ao:import                      # importa todos os novos
 *   php artisan menus-ao:import pampa-grill mamma-mia
 *   php artisan menus-ao:import --refresh            # volta a sincronizar os por ativar
 *
 * Pode ser interrompido e corrido de novo: salta o que já está importado
 * (e as fotos já guardadas). Nunca mexe em restaurantes já ativados ou
 * descartados.
 */
class ImportMenusAo extends Command
{
    protected $signature = 'menus-ao:import
        {slugs?* : Só estes restaurantes (o endereço no menus.ao, ex.: pampa-grill)}
        {--limit=0 : No máximo N restaurantes}
        {--dry-run : Só lê e mostra o resumo, sem gravar nada}
        {--refresh : Volta a sincronizar os já importados que ainda não foram ativados}
        {--no-images : Não copia fotos (ex.: desenvolvimento sem armazenamento)}
        {--json= : Com --dry-run, grava os dados lidos neste ficheiro JSON}
        {--cache= : Pasta para guardar o HTML lido (só desenvolvimento)}
        {--delay=800 : Pausa entre pedidos ao menus.ao, em milissegundos}';

    protected $description = 'Pré-cadastra os restaurantes do menus.ao (invisíveis até serem ativados)';

    public function handle(MediaUploadService $media): int
    {
        $parser = new MenusAoParser;
        $client = new MenusAoClient(max(0, (int) $this->option('delay')), $this->option('cache') ?: null);
        $importer = new MenusAoImporter($client, $parser, $media);
        $dryRun = (bool) $this->option('dry-run');

        $this->info('A ler a lista de restaurantes do menus.ao…');
        $directory = collect($parser->directory($client->page('restaurantes')))
            // Fichas de teste do próprio menus.ao.
            ->reject(fn ($r) => preg_match('/(^|-)test(e)?(-|$)/', $r['slug']))
            ->keyBy('slug');

        $slugs = collect($this->argument('slugs'))->map(fn ($s) => strtolower(trim($s)))->filter();
        $targets = $slugs->isNotEmpty()
            ? $slugs->map(fn ($s) => $directory->get($s, ['slug' => $s]))
            : $directory->values();
        if ((int) $this->option('limit') > 0) {
            $targets = $targets->take((int) $this->option('limit'));
        }
        $this->info("{$targets->count()} restaurante(s) a processar.");

        $rows = [];
        $snapshot = [];
        $totals = ['created' => 0, 'refreshed' => 0, 'skipped' => 0, 'failed' => 0, 'items' => 0, 'images' => 0];

        foreach ($targets->values() as $index => $card) {
            $slug = $card['slug'];
            $prefix = sprintf('[%d/%d] %s', $index + 1, $targets->count(), $slug);
            // Já importado (sem --refresh), ativado ou descartado: salta logo,
            // sem voltar a pedir as 3 páginas ao menus.ao.
            if (! $dryRun && ! $this->option('refresh')
                && RestaurantImport::query()->where('source', RestaurantImport::SOURCE_MENUS_AO)->where('source_slug', $slug)->exists()) {
                $totals['skipped']++;
                $this->line("{$prefix}: saltado (já importado)");

                continue;
            }

            try {
                $data = $importer->scrape($slug, $card);
                $items = collect($data['categories'])->sum(fn ($c) => count($c['items']));
                $imagesFound = collect($data['categories'])->flatMap(fn ($c) => $c['items'])->whereNotNull('image')->count();

                if ($dryRun) {
                    $snapshot[] = $data;
                    $totals['items'] += $items;
                    $totals['images'] += $imagesFound;
                    $rows[] = [$slug, $data['name'], $data['province'], count($data['categories']), $items, $imagesFound, $data['phone'] ? 'sim' : '—', $data['opensAt'] ? "{$data['opensAt']}–{$data['closesAt']}" : '—'];
                    $this->line("{$prefix}: {$items} pratos, {$imagesFound} fotos");

                    continue;
                }

                $result = $importer->import($data, ! $this->option('no-images'), (bool) $this->option('refresh'));
                $totals[$result['status']]++;
                if ($result['status'] === 'skipped') {
                    $this->line("{$prefix}: saltado ({$result['reason']})");

                    continue;
                }
                $stats = $result['import']->stats;
                $totals['items'] += $stats['items'] ?? 0;
                $totals['images'] += $stats['images'] ?? 0;
                $this->info("{$prefix}: {$result['status']} — {$stats['items']} pratos, {$stats['images']} fotos");
            } catch (Throwable $e) {
                $totals['failed']++;
                $this->error("{$prefix}: falhou — {$e->getMessage()}");
                report($e);
            }
        }

        if ($dryRun) {
            $this->newLine();
            $this->table(['slug', 'nome', 'província', 'categorias', 'pratos', 'fotos', 'telefone', 'horário'], $rows);
            if ($path = $this->option('json')) {
                file_put_contents($path, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
                $this->info("Dados gravados em {$path}");
            }
        }

        $this->newLine();
        $this->info(sprintf(
            'Feito: %d novos, %d sincronizados, %d saltados, %d falhados · %d pratos · %d fotos.',
            $totals['created'], $totals['refreshed'], $totals['skipped'], $totals['failed'], $totals['items'], $totals['images'],
        ));

        return $totals['failed'] > 0 && $totals['created'] + $totals['refreshed'] === 0 && ! $dryRun
            ? self::FAILURE
            : self::SUCCESS;
    }
}
