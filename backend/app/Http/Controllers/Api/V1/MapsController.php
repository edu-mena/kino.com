<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\MapsNotConfiguredException;
use App\Http\Controllers\Controller;
use App\Services\GoogleMapsService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Geocoding / reverse-geocoding / rotas — contrato consumido por
 * `src/lib/maps/google-client.ts` (`VITE_MAPS_API_BASE=<api>/api/v1/maps`).
 * Público (convidados também calculam distância/ETA), com throttle próprio
 * (`maps`) porque cada pedido sem cache custa dinheiro na Google.
 *
 * 204 = sem resultado; 503 = chave de servidor não configurada; 502 = a
 * Google falhou (o frontend recai no cálculo local nos dois casos).
 */
class MapsController extends Controller
{
    public function __construct(private readonly GoogleMapsService $maps) {}

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
            'departAt' => ['nullable', 'date'],
        ]);

        return $this->respond(fn () => $this->maps->route(
            ['lat' => (float) $data['from']['lat'], 'lng' => (float) $data['from']['lng']],
            ['lat' => (float) $data['to']['lat'], 'lng' => (float) $data['to']['lng']],
            $data['mode'] ?? 'driving',
            isset($data['departAt']) ? CarbonImmutable::parse($data['departAt']) : null,
        ));
    }

    private function respond(callable $resolve): JsonResponse|Response
    {
        try {
            $result = $resolve();
        } catch (MapsNotConfiguredException) {
            return response()->json(['message' => 'Serviço de mapas indisponível.'], 503);
        } catch (Throwable $e) {
            Log::warning('maps proxy falhou', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Serviço de mapas indisponível.'], 502);
        }

        return $result === null ? response()->noContent() : response()->json($result);
    }
}
