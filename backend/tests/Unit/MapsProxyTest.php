<?php

use App\Services\GoogleMapsService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/*
 * Proxy de mapas (GoogleMapsService + MapsController). Em `Unit` de
 * propósito: não toca na base de dados, só HTTP falso + cache `array`.
 */

beforeEach(function () {
    config(['services.google_maps.server_key' => 'test-server-key']);
});

function geocodeOk(): array
{
    return [
        'status' => 'OK',
        'results' => [[
            'formatted_address' => 'Rua Rainha Ginga 29, Luanda, Angola',
            'geometry' => ['location' => ['lat' => -8.8147, 'lng' => 13.2302]],
            'address_components' => [
                ['long_name' => 'Luanda', 'types' => ['locality', 'political']],
                ['long_name' => 'Província de Luanda', 'types' => ['administrative_area_level_1', 'political']],
            ],
        ]],
    ];
}

it('geocodifica, normaliza a província e manda a chave de servidor + restrição a Angola', function () {
    Http::fake(['maps.googleapis.com/*' => Http::response(geocodeOk())]);

    $this->getJson('/api/v1/maps/geocode?q=Rua Rainha Ginga 29')
        ->assertOk()
        ->assertExactJson([
            'point' => ['lat' => -8.8147, 'lng' => 13.2302],
            'formattedAddress' => 'Rua Rainha Ginga 29, Luanda, Angola',
            'province' => 'Luanda',
        ]);

    Http::assertSent(fn (Request $r) => $r['key'] === 'test-server-key'
        && $r['components'] === 'country:AO'
        && $r['region'] === 'ao');
});

it('guarda em cache: a mesma morada só vai à Google uma vez (e "sem resultado" também)', function () {
    Http::fake(['maps.googleapis.com/*' => Http::sequence()
        ->push(geocodeOk())
        ->push(['status' => 'ZERO_RESULTS', 'results' => []]),
    ]);

    $this->getJson('/api/v1/maps/geocode?q=Rua Rainha Ginga 29')->assertOk();
    $this->getJson('/api/v1/maps/geocode?q='.urlencode('  rua RAINHA ginga 29 '))->assertOk();
    $this->getJson('/api/v1/maps/geocode?q=Lugar Inexistente')->assertNoContent();
    $this->getJson('/api/v1/maps/geocode?q=Lugar Inexistente')->assertNoContent();

    Http::assertSentCount(2);
});

it('reverse-geocode devolve 204 sem resultado e valida coordenadas', function () {
    Http::fake(['maps.googleapis.com/*' => Http::response(['status' => 'ZERO_RESULTS', 'results' => []])]);

    $this->getJson('/api/v1/maps/reverse-geocode?lat=-8.8&lng=13.2')->assertNoContent();
    $this->getJson('/api/v1/maps/reverse-geocode?lat=200&lng=13.2')->assertUnprocessable();
});

it('calcula rota com trânsito (Routes API) no formato do frontend', function () {
    Http::fake(['routes.googleapis.com/*' => Http::response([
        'routes' => [[
            'distanceMeters' => 5230,
            'duration' => '960s',
            'staticDuration' => '720s',
            'polyline' => ['encodedPolyline' => 'abc123'],
        ]],
    ])]);

    $this->postJson('/api/v1/maps/route', [
        'from' => ['lat' => -8.81, 'lng' => 13.23],
        'to' => ['lat' => -8.84, 'lng' => 13.29],
    ])
        ->assertOk()
        ->assertExactJson([
            'distanceKm' => 5.23,
            'durationMin' => 12,
            'durationInTrafficMin' => 16,
            'polyline' => 'abc123',
        ]);

    Http::assertSent(fn (Request $r) => $r->header('X-Goog-Api-Key')[0] === 'test-server-key'
        && $r['travelMode'] === 'DRIVE'
        && $r['routingPreference'] === 'TRAFFIC_AWARE');
});

it('sem chave de servidor responde 503 sem chamar a Google', function () {
    config(['services.google_maps.server_key' => null]);
    Http::fake();

    $this->getJson('/api/v1/maps/geocode?q=Talatona')->assertStatus(503);
    Http::assertNothingSent();
});

it('falha da Google vira 502 (o frontend recai no cálculo local)', function () {
    Http::fake(['maps.googleapis.com/*' => Http::response(['status' => 'REQUEST_DENIED'])]);

    $this->getJson('/api/v1/maps/geocode?q=Talatona')->assertStatus(502);
});

it('normaliza nomes de província em pt e en', function (?string $in, ?string $out) {
    expect(GoogleMapsService::normalizeProvince($in))->toBe($out);
})->with([
    ['Província de Luanda', 'Luanda'],
    ['Provincia do Cuanza Sul', 'Cuanza Sul'],
    ['Benguela Province', 'Benguela'],
    ['Huíla', 'Huíla'],
    ['', null],
    [null, null],
]);
