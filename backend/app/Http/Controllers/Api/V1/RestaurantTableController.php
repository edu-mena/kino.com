<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RestaurantTables\BulkStoreRestaurantTablesRequest;
use App\Http\Requests\Api\V1\RestaurantTables\ReorderRestaurantTablesRequest;
use App\Http\Requests\Api\V1\RestaurantTables\StoreRestaurantTableRequest;
use App\Http\Requests\Api\V1\RestaurantTables\UpdateRestaurantTableRequest;
use App\Http\Resources\Api\V1\RestaurantTableResource;
use App\Models\QrCode;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use App\Models\TableCombination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class RestaurantTableController extends Controller
{
    public function index(Restaurant $restaurant): AnonymousResourceCollection
    {
        $this->authorize('manageOperations', $restaurant);

        $tables = $restaurant->tables()->with('qrCode')->orderBy('sort_order')->orderBy('id')->get();

        // Mesas anteriores aos QR (ou criadas fora do Eloquent) ganham o
        // código aqui — o painel nunca vê uma mesa sem QR.
        foreach ($tables as $table) {
            if (! $table->qrCode) {
                $table->setRelation('qrCode', QrCode::forTable($table));
            }
        }

        return RestaurantTableResource::collection($tables);
    }

    public function store(StoreRestaurantTableRequest $request, Restaurant $restaurant): JsonResponse
    {
        $table = $restaurant->tables()->create([
            ...$request->validated(),
            'sort_order' => $this->nextSortOrder($restaurant),
        ]);

        return (new RestaurantTableResource($table->load('qrCode')))->response()->setStatusCode(201);
    }

    /** Cria `count` mesas "{prefix} {n}" a partir de `start`. Nomes que já
     * existem são saltados (não duplica "Mesa 3" se já houver uma). */
    public function bulkStore(BulkStoreRestaurantTablesRequest $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validated();
        $existing = $restaurant->tables()->pluck('name')->map(fn ($n) => mb_strtolower(trim($n)))->all();
        $order = $this->nextSortOrder($restaurant);

        $created = DB::transaction(function () use ($data, $restaurant, $existing, &$order) {
            $created = collect();
            for ($i = 0; $i < $data['count']; $i++) {
                $name = trim($data['prefix']).' '.($data['start'] + $i);
                if (in_array(mb_strtolower($name), $existing, true)) {
                    continue;
                }
                $created->push($restaurant->tables()->create([
                    'name' => $name,
                    'seats' => $data['seats'],
                    'area' => $data['area'] ?? null,
                    'shape' => $data['shape'] ?? 'square',
                    'sort_order' => $order++,
                ]));
            }

            return $created;
        });

        return RestaurantTableResource::collection($created->each->load('qrCode'))
            ->response()->setStatusCode(201);
    }

    public function update(UpdateRestaurantTableRequest $request, RestaurantTable $table): RestaurantTableResource
    {
        $table->update($request->validated());

        // Uma mesa que deixa de poder ser junta (ou sai de serviço) sai das
        // junções de hoje em diante — senão a planta mostrava uma junção
        // que já não é possível.
        $leftCombinable = $table->wasChanged('is_combinable') && ! $table->is_combinable;
        $leftService = $table->wasChanged('is_active') && ! $table->is_active;
        if ($leftCombinable || $leftService) {
            $this->detachFromUpcomingCombinations($table);
        }

        return new RestaurantTableResource($table->load('qrCode'));
    }

    public function reorder(ReorderRestaurantTablesRequest $request, Restaurant $restaurant): JsonResponse
    {
        $ids = $request->validated('ids');

        DB::transaction(function () use ($restaurant, $ids) {
            foreach ($ids as $index => $uuid) {
                $restaurant->tables()->where('uuid', $uuid)->update(['sort_order' => $index + 1]);
            }
            // As que não vieram na lista ficam depois, pela ordem que tinham.
            $rest = $restaurant->tables()->whereNotIn('uuid', $ids)->orderBy('sort_order')->orderBy('id')->get();
            foreach ($rest as $offset => $table) {
                $table->update(['sort_order' => count($ids) + $offset + 1]);
            }
        });

        return response()->json(status: 204);
    }

    /** Apagar uma mesa desatribui-a de qualquer reserva (FK
     * nullOnDelete) — nunca bloqueado, mesmo padrão de assignTable. O QR
     * impresso dela continua a abrir o cardápio do restaurante (ver
     * migração dos qr_codes). Junções que ficariam com uma mesa só são
     * desfeitas. */
    public function destroy(RestaurantTable $table): JsonResponse
    {
        $this->authorize('manageOperations', $table->restaurant);

        DB::transaction(function () use ($table) {
            $combinationIds = $table->combinations()->pluck('table_combinations.id');
            $table->delete();
            $this->dropUndersizedCombinations($combinationIds->all());
        });

        return response()->json(status: 204);
    }

    private function nextSortOrder(Restaurant $restaurant): int
    {
        return (int) $restaurant->tables()->max('sort_order') + 1;
    }

    private function detachFromUpcomingCombinations(RestaurantTable $table): void
    {
        $combinationIds = $table->combinations()
            ->wherePivot('date', '>=', now()->toDateString())
            ->pluck('table_combinations.id')
            ->all();
        if ($combinationIds === []) {
            return;
        }
        $table->combinations()->detach($combinationIds);
        $this->dropUndersizedCombinations($combinationIds);
    }

    /** @param  array<int, int>  $combinationIds */
    private function dropUndersizedCombinations(array $combinationIds): void
    {
        if ($combinationIds === []) {
            return;
        }
        TableCombination::query()
            ->whereIn('id', $combinationIds)
            ->withCount('tables')
            ->get()
            ->filter(fn (TableCombination $c) => $c->tables_count < 2)
            ->each->delete();
    }
}
