<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\TableCombinations\StoreTableCombinationRequest;
use App\Http\Requests\Api\V1\TableCombinations\UpdateTableCombinationRequest;
use App\Http\Resources\Api\V1\TableCombinationResource;
use App\Models\Restaurant;
use App\Models\TableCombination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Junções de mesas por dia ("Sala do dia" em /admin/mesas e a planta de
 * /admin/reservas). Uma junção vale só para a sua data.
 */
class TableCombinationController extends Controller
{
    /** `?from=&to=` (Y-m-d). Por omissão, de hoje a +90 dias — o que a
     * planta e os conflitos de reservas futuras precisam. */
    public function index(Request $request, Restaurant $restaurant): AnonymousResourceCollection
    {
        $this->authorize('manageOperations', $restaurant);

        $request->validate([
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
        ]);

        $from = $request->filled('from') ? Carbon::parse((string) $request->input('from')) : now('Africa/Luanda')->startOfDay();
        $to = $request->filled('to') ? Carbon::parse((string) $request->input('to')) : $from->clone()->addDays(90);
        if ($to->lessThan($from)) {
            $to = $from->clone();
        }
        if ($from->diffInDays($to) > 366) {
            $to = $from->clone()->addDays(366);
        }

        $combinations = $restaurant->tableCombinations()
            ->with('tables')
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $to->toDateString())
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        return TableCombinationResource::collection($combinations);
    }

    public function store(StoreTableCombinationRequest $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validated();
        $tables = $restaurant->tables()->whereIn('uuid', $data['table_ids'])->get()->keyBy('uuid');
        // Mantém a ordem pedida — a 1.ª é a âncora.
        $ordered = collect($data['table_ids'])->map(fn ($uuid) => $tables[$uuid]);

        $combination = DB::transaction(function () use ($restaurant, $data, $ordered) {
            $combination = $restaurant->tableCombinations()->create([
                'date' => $data['date'],
                'seats' => $data['seats'] ?? $ordered->sum('seats'),
                'label' => $data['label'] ?? null,
            ]);
            $combination->syncTables($ordered->pluck('id')->all());

            return $combination;
        });

        return (new TableCombinationResource($combination->load('tables')))
            ->response()->setStatusCode(201);
    }

    public function update(UpdateTableCombinationRequest $request, TableCombination $combination): TableCombinationResource
    {
        $data = $request->validated();

        DB::transaction(function () use ($combination, $data) {
            if (isset($data['table_ids'])) {
                $tables = $combination->restaurant->tables()->whereIn('uuid', $data['table_ids'])->get()->keyBy('uuid');
                $ordered = collect($data['table_ids'])->map(fn ($uuid) => $tables[$uuid]);
                $combination->syncTables($ordered->pluck('id')->all());
                // Mudou a composição sem dizer a capacidade → volta à soma.
                if (! array_key_exists('seats', $data)) {
                    $data['seats'] = $ordered->sum('seats');
                }
            }
            $combination->update(collect($data)->only(['seats', 'label'])->all());
        });

        return new TableCombinationResource($combination->load('tables'));
    }

    /** "Separar" — as reservas atribuídas à junção ficam na mesa âncora. */
    public function destroy(TableCombination $combination): JsonResponse
    {
        $this->authorize('manageOperations', $combination->restaurant);

        $combination->delete();

        return response()->json(status: 204);
    }
}
