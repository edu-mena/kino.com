<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\QrCodes\UpdateQrStyleRequest;
use App\Models\QrCode;
use App\Models\Restaurant;
use App\Models\RestaurantTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * QR impressos do restaurante. `resolve` é público (é o que o telemóvel do
 * cliente chama ao abrir `luku.ao/q/{code}`); o resto é do staff.
 */
class QrCodeController extends Controller
{
    /**
     * Um só pedido devolve o essencial para pintar a página logo (nome,
     * capa, logótipo, mesa) — cada ida à API custa ~1 s a partir de Angola
     * (ver notas de desempenho), e esta é a primeira impressão de quem
     * ainda não conhece a Luku.
     */
    public function resolve(Request $request, string $code): JsonResponse
    {
        $qr = QrCode::query()
            ->with(['restaurant', 'table'])
            ->where('code', QrCode::normalize($code))
            ->first();

        // Restaurante apagado (soft delete) → relação nula → 404.
        abort_if(! $qr || ! $qr->restaurant, 404, 'qr_not_found');
        abort_if(
            ! $qr->restaurant->is_published && ! $request->user('sanctum')?->isSystemOperator(),
            404,
            'qr_not_found',
        );

        if (! $request->boolean('preview')) {
            $qr->increment('scans', 1, ['last_scanned_at' => now()]);
        }

        $restaurant = $qr->restaurant;
        $table = $qr->table;

        return response()->json(['data' => [
            'code' => $qr->code,
            'kind' => $qr->kind,
            'restaurant' => [
                'id' => $restaurant->uuid,
                'name' => $restaurant->name,
                'cuisine' => $restaurant->cuisine,
                'coverImageUrl' => $restaurant->cover_image_url,
                'logoUrl' => $restaurant->logo_url,
                'rating' => $restaurant->rating === null ? null : (float) $restaurant->rating,
                'reviewCount' => $restaurant->review_count,
            ],
            'table' => $table ? [
                'id' => $table->uuid,
                'name' => $table->name,
                'area' => $table->area,
                'seats' => $table->seats,
            ] : null,
            // Junta hoje a outras mesas? O cliente vê "Mesa 3 + 4".
            'combinedWith' => $table ? $this->combinedToday($table) : [],
        ]]);
    }

    /** Código geral do restaurante (criado se faltar) + estilo guardado.
     * Os códigos das mesas vêm com as próprias mesas (GET .../tables). */
    public function index(Restaurant $restaurant): JsonResponse
    {
        $this->authorize('manageOperations', $restaurant);

        $qr = QrCode::forRestaurant($restaurant);

        return response()->json(['data' => [
            'restaurant' => [
                'code' => $qr->code,
                'scans' => $qr->scans,
                'lastScannedAt' => $qr->last_scanned_at?->toIso8601String(),
            ],
            // Leituras de códigos de mesas já apagadas continuam a contar
            // para o total do restaurante.
            'totalScans' => (int) $restaurant->qrCodes()->sum('scans'),
            'style' => $restaurant->qr_style ?? (object) [],
        ]]);
    }

    public function updateStyle(UpdateQrStyleRequest $request, Restaurant $restaurant): JsonResponse
    {
        $restaurant->forceFill(['qr_style' => $request->style()])->save();

        return response()->json(['data' => ['style' => $restaurant->qr_style]]);
    }

    /** @return array<int, string> */
    private function combinedToday(RestaurantTable $table): array
    {
        $combination = $table->combinations()
            ->wherePivot('date', now('Africa/Luanda')->toDateString())
            ->with('tables')
            ->first();

        if (! $combination) {
            return [];
        }

        return $combination->tables
            ->reject(fn (RestaurantTable $t) => $t->id === $table->id)
            ->pluck('name')
            ->values()
            ->all();
    }
}
