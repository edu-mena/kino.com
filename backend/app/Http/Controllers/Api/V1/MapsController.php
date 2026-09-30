<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\OsmMapsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Geocoding / reverse-geocoding / rotas (OpenStreetMap, ver OsmMapsService)
 * — consumido pelo frontend quando `VITE_MAPS_API_BASE=<api>/api/v1/maps`.
 * Público (convidados também veem distância), com throttle próprio (`maps`):
 * as instâncias públicas gratuitas pedem uso moderado e a cache daqui é o
 * que o garante.
 *
 * 204 = sem resultado; 502 = o serviço de mapas falhou (o frontend recai no
 * cálculo local).
 */
class MapsController extends Controller
{
    public function __construct(private readonly OsmMapsService $maps) {}

    public function geocode(Request $request): JsonResponse|Response
    {
        $data = $request->validate(['q' => ['required', 'string', 'min:3', 'max:200']]);

        return $this->respond(fn () => $this->maps->geocode($data['q']));
    }

    public function reverseGeocode(Request $request): JsonResponse|Response
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        return $this->respond(fn () => $this->maps->reverseGeocode((float) $data['lat'], (float) $data['lng']));
    }

    public function route(Request $request): JsonResponse|Response
    {
        $data = $request->validate([
            'from.lat' => ['required', 'numeric', 'between:-90,90'],
            'from.lng' => ['required', 'numeric', 'between:-180,180'],
            'to.lat' => ['required', 'numeric', 'between:-90,90'],
            'to.lng' => ['required', 'numeric', 'between:-180,180'],
            'mode' => ['nullable', 'in:driving,walking,bicycling'],
        ]);

        return $this->respond(fn () => $this->maps->route(
            ['lat' => (float) $data['from']['lat'], 'lng' => (float) $data['from']['lng']],
            ['lat' => (float) $data['to']['lat'], 'lng' => (float) $data['to']['lng']],
            $data['mode'] ?? 'driving',
        ));
    }

    private function respond(callable $resolve): JsonResponse|Response
    {
        try {
            $result = $resolve();
        } catch (Throwable $e) {
            Log::warning('maps proxy falhou', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Serviço de mapas indisponível.'], 502);
        }

        return $result === null ? response()->noContent() : response()->json($result);
    }
}
