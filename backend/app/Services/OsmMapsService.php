<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Proxy de mapas sobre OpenStreetMap — gratuito, sem chave:
 *  - Photon (komoot) para geocoding / reverse geocoding;
 *  - OSRM para rotas por estrada (distância, tempo sem trânsito, traçado).
 * Contrato de saída = o que `src/lib/maps/osrm.ts` e o `MapsClient` esperam.
 *
 * Cache (Redis em produção) para respeitar o uso moderado das instâncias
 * públicas: moradas mudam raramente → 30 dias; rotas → 1 hora (o OSRM não
 * tem trânsito, a rota só muda com os dados do mapa). Coordenadas
 * arredondadas na chave (4 casas ≈ 11 m) para pedidos quase iguais
 * partilharem entrada.
 */
class OsmMapsService
{
    /** Angola (com Cabinda): minLon, minLat, maxLon, maxLat. */
    private const ANGOLA_BBOX = '11.6,-18.1,24.1,-4.3';

    private const GEOCODE_TTL_SECONDS = 60 * 60 * 24 * 30;

    private const ROUTE_TTL_SECONDS = 60 * 60;

    private const OSRM_PROFILES = [
        'driving' => 'driving',
        'walking' => 'foot',
        'bicycling' => 'bike',
    ];

    /**
     * @return array{point: array{lat: float, lng: float}, formattedAddress: string, province: ?string}|null
     */
    public function geocode(string $query): ?array
    {
        $key = 'maps:geocode:'.md5(Str::lower(trim($query)));

        return $this->rememberNullable($key, self::GEOCODE_TTL_SECONDS, fn () => $this->firstPhotonResult('/api/', [
            'q' => trim($query),
            'limit' => 1,
            'bbox' => self::ANGOLA_BBOX,
        ], false));
    }

    /**
     * @return array{point: array{lat: float, lng: float}, formattedAddress: string, province: ?string}|null
     */
    public function reverseGeocode(float $lat, float $lng): ?array
    {
        $key = sprintf('maps:reverse:%.5f,%.5f', $lat, $lng);

        return $this->rememberNullable($key, self::GEOCODE_TTL_SECONDS, fn () => $this->firstPhotonResult('/reverse', [
            'lat' => $lat,
            'lon' => $lng,
            'limit' => 1,
        ], true));
    }

    /**
     * @param  array{lat: float, lng: float}  $from
     * @param  array{lat: float, lng: float}  $to
     * @return array{distanceKm: float, durationMin: float, polyline?: string}
     */
    public function route(array $from, array $to, string $mode = 'driving'): array
    {
        $profile = self::OSRM_PROFILES[$mode] ?? 'driving';
        $key = sprintf(
            'maps:route:%.4f,%.4f:%.4f,%.4f:%s',
            $from['lat'], $from['lng'], $to['lat'], $to['lng'], $profile,
        );

        return Cache::remember($key, self::ROUTE_TTL_SECONDS, function () use ($from, $to, $profile) {
            $coords = sprintf('%.6f,%.6f;%.6f,%.6f', $from['lng'], $from['lat'], $to['lng'], $to['lat']);
            $response = $this->http()->get(
                rtrim((string) config('services.maps.routing_url'), '/')."/route/v1/{$profile}/{$coords}",
                ['overview' => 'full', 'geometries' => 'polyline'],
            );

            if ($response->failed() || $response->json('code') !== 'Ok') {
                throw new RuntimeException('OSRM '.$response->status().' '.$response->json('code'));
            }

            $route = $response->json('routes.0');
            if (! is_array($route)) {
                throw new RuntimeException('OSRM sem rota');
            }

            $result = [
                'distanceKm' => round($route['distance'] / 1000, 2),
                'durationMin' => round($route['duration'] / 60, 1),
            ];
            if (! empty($route['geometry'])) {
                $result['polyline'] = $route['geometry'];
            }

            return $result;
        });
    }

    /** "Província de Luanda" / "Luanda Province" → "Luanda". */
    public static function normalizeProvince(?string $name): ?string
    {
        if ($name === null || trim($name) === '') {
            return null;
        }
        $clean = preg_replace('/^(prov[íi]ncia\s+(de|do|da)\s+)|(\s+province)$/iu', '', trim($name));

        return trim((string) $clean) ?: null;
    }

    /**
     * @param  array<string, string|int|float>  $params
     * @return array{point: array{lat: float, lng: float}, formattedAddress: string, province: ?string}|null
     */
    private function firstPhotonResult(string $path, array $params, bool $preferStreet): ?array
    {
        $response = $this->http()->get(
            rtrim((string) config('services.maps.geocoder_url'), '/').$path,
            $params,
        );

        if ($response->failed()) {
            throw new RuntimeException('Photon '.$response->status());
        }

        foreach ($response->json('features') ?? [] as $feature) {
            $p = $feature['properties'] ?? [];
            if (isset($p['countrycode']) && strtoupper($p['countrycode']) !== 'AO') {
                continue;
            }
            [$lng, $lat] = $feature['geometry']['coordinates'];

            return [
                'point' => ['lat' => (float) $lat, 'lng' => (float) $lng],
                'formattedAddress' => self::formatAddress($p, $preferStreet),
                'province' => self::normalizeProvince($p['state'] ?? null),
            ];
        }

        return null;
    }

    /**
     * Mesma regra do frontend (`toSuggestion` em photon.ts): nome do local
     * ou rua + nº, seguido de localidade/bairro/cidade/província, sem
     * repetições. `$preferStreet` (reverse) põe a rua à frente do nome do
     * negócio vizinho.
     *
     * @param  array<string, mixed>  $p
     */
    public static function formatAddress(array $p, bool $preferStreet = false): string
    {
        $streetLine = isset($p['street'])
            ? trim($p['street'].' '.($p['housenumber'] ?? ''))
            : null;
        $candidates = $preferStreet
            ? [$streetLine, $p['name'] ?? null]
            : [$p['name'] ?? null, $streetLine];
        $candidates = array_merge($candidates, [
            $p['locality'] ?? null,
            $p['district'] ?? null,
            $p['city'] ?? null,
            $p['state'] ?? null,
        ]);
        if ($preferStreet && $streetLine !== null) {
            // No reverse, o nome é de um negócio vizinho — não entra na morada.
            $candidates = array_values(array_filter($candidates, fn ($c) => $c !== ($p['name'] ?? null)));
        }

        return implode(', ', array_values(array_unique(array_filter($candidates, fn ($c) => is_string($c) && $c !== ''))));
    }

    private function http(): PendingRequest
    {
        return Http::withHeaders(['User-Agent' => (string) config('services.maps.user_agent')])
            ->acceptJson()
            ->timeout(8);
    }

    /**
     * `Cache::remember` não guarda `null` (volta sempre a pedir) — embrulha o
     * resultado para "sem resultado" também ficar em cache.
     */
    private function rememberNullable(string $key, int $ttl, callable $resolve): ?array
    {
        $wrapped = Cache::remember($key, $ttl, fn () => ['value' => $resolve()]);

        return $wrapped['value'];
    }
}
