<?php

namespace App\Services;

use App\Exceptions\MapsNotConfiguredException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Proxy para a Google Maps Platform (Geocoding API + Routes API) — a chave
 * de SERVIDOR vive só aqui (`GOOGLE_MAPS_SERVER_KEY`), nunca no cliente.
 * Contrato de saída = o que `src/lib/maps/google-client.ts` espera.
 *
 * Cache (Redis em produção): geocoding muda raramente → 30 dias; rotas
 * dependem do trânsito → 10 min, chave por (origem, destino, modo, hora).
 * Coordenadas arredondadas na chave para pedidos quase iguais partilharem
 * entrada (4 casas ≈ 11 m).
 */
class GoogleMapsService
{
    private const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

    private const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    private const GEOCODE_TTL_SECONDS = 60 * 60 * 24 * 30;

    private const ROUTE_TTL_SECONDS = 60 * 10;

    private const TRAVEL_MODES = [
        'driving' => 'DRIVE',
        'walking' => 'WALK',
        'bicycling' => 'BICYCLE',
    ];

    /**
     * @return array{point: array{lat: float, lng: float}, formattedAddress: string, province: ?string}|null
     */
    public function geocode(string $query): ?array
    {
        $key = 'maps:geocode:'.md5(Str::lower(trim($query)));

        return $this->rememberNullable($key, self::GEOCODE_TTL_SECONDS, fn () => $this->firstGeocodeResult([
            'address' => $query,
            'components' => 'country:'.strtoupper($this->region()),
        ]));
    }

    /**
     * @return array{point: array{lat: float, lng: float}, formattedAddress: string, province: ?string}|null
     */
    public function reverseGeocode(float $lat, float $lng): ?array
    {
        $key = sprintf('maps:reverse:%.5f,%.5f', $lat, $lng);

        return $this->rememberNullable($key, self::GEOCODE_TTL_SECONDS, fn () => $this->firstGeocodeResult([
            'latlng' => sprintf('%.6f,%.6f', $lat, $lng),
        ]));
    }

    /**
     * @param  array{lat: float, lng: float}  $from
     * @param  array{lat: float, lng: float}  $to
     * @return array{distanceKm: float, durationMin: float, durationInTrafficMin?: float, polyline?: string}
     */
    public function route(array $from, array $to, string $mode = 'driving', ?CarbonImmutable $departAt = null): array
    {
        $travelMode = self::TRAVEL_MODES[$mode] ?? 'DRIVE';
        $hourBucket = ($departAt ?? CarbonImmutable::now())->format('YmdH');
        $key = sprintf(
            'maps:route:%.4f,%.4f:%.4f,%.4f:%s:%s',
            $from['lat'], $from['lng'], $to['lat'], $to['lng'], $travelMode, $hourBucket,
        );

        return Cache::remember($key, self::ROUTE_TTL_SECONDS, function () use ($from, $to, $travelMode, $departAt) {
            $body = [
                'origin' => ['location' => ['latLng' => ['latitude' => $from['lat'], 'longitude' => $from['lng']]]],
                'destination' => ['location' => ['latLng' => ['latitude' => $to['lat'], 'longitude' => $to['lng']]]],
                'travelMode' => $travelMode,
                'languageCode' => $this->language(),
                'regionCode' => $this->region(),
                'units' => 'METRIC',
            ];
            // Trânsito só existe para condução; `departureTime` tem de ser
            // futuro para a Routes API aceitar.
            if ($travelMode === 'DRIVE') {
                $body['routingPreference'] = 'TRAFFIC_AWARE';
                if ($departAt && $departAt->isFuture()) {
                    $body['departureTime'] = $departAt->toIso8601ZuluString();
                }
            }

            $response = Http::withHeaders([
                'X-Goog-Api-Key' => $this->serverKey(),
                'X-Goog-FieldMask' => 'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline',
            ])->timeout(8)->post(self::ROUTES_URL, $body);

            if ($response->failed()) {
                throw new RuntimeException('Routes API '.$response->status());
            }

            $route = $response->json('routes.0');
            if (! is_array($route) || ! isset($route['distanceMeters'])) {
                throw new RuntimeException('Routes API sem rota');
            }

            $static = $this->durationSeconds($route['staticDuration'] ?? $route['duration'] ?? '0s');
            $result = [
                'distanceKm' => round($route['distanceMeters'] / 1000, 2),
                'durationMin' => round($static / 60, 1),
            ];
            if ($travelMode === 'DRIVE' && isset($route['duration'])) {
                $result['durationInTrafficMin'] = round($this->durationSeconds($route['duration']) / 60, 1);
            }
            if (isset($route['polyline']['encodedPolyline'])) {
                $result['polyline'] = $route['polyline']['encodedPolyline'];
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
     * @param  array<string, string>  $params
     * @return array{point: array{lat: float, lng: float}, formattedAddress: string, province: ?string}|null
     */
    private function firstGeocodeResult(array $params): ?array
    {
        $response = Http::timeout(8)->get(self::GEOCODE_URL, [
            ...$params,
            'region' => $this->region(),
            'language' => $this->language(),
            'key' => $this->serverKey(),
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Geocoding API '.$response->status());
        }

        $status = $response->json('status');
        if ($status === 'ZERO_RESULTS') {
            return null;
        }
        if ($status !== 'OK') {
            throw new RuntimeException('Geocoding API '.$status);
        }

        $first = $response->json('results.0');
        $province = null;
        foreach ($first['address_components'] ?? [] as $component) {
            if (in_array('administrative_area_level_1', $component['types'] ?? [], true)) {
                $province = self::normalizeProvince($component['long_name'] ?? null);
                break;
            }
        }

        return [
            'point' => [
                'lat' => (float) $first['geometry']['location']['lat'],
                'lng' => (float) $first['geometry']['location']['lng'],
            ],
            'formattedAddress' => (string) ($first['formatted_address'] ?? ''),
            'province' => $province,
        ];
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

    private function durationSeconds(string $duration): int
    {
        return (int) rtrim($duration, 's');
    }

    private function serverKey(): string
    {
        $key = (string) config('services.google_maps.server_key');
        if ($key === '') {
            throw new MapsNotConfiguredException;
        }

        return $key;
    }

    private function region(): string
    {
        return (string) config('services.google_maps.region', 'ao');
    }

    private function language(): string
    {
        return (string) config('services.google_maps.language', 'pt');
    }
}
