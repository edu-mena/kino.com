<?php

use App\Services\OsmMapsService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/*
 * Proxy de mapas OpenStreetMap (OsmMapsService + MapsController). Em `Unit`
 * de propósito: não toca na base de dados, só HTTP falso + cache `array`.
 */

beforeEach(function () {
    config([
        'services.maps.geocoder_url' => 'https://photon.test',
        'services.maps.routing_url' => 'https://osrm.test',
        'services.maps.user_agent' => 'Luku-test/1.0',
    ]);
});

function photonBank(): array
{
    return ['features' => [[
        'geometry' => ['coordinates' => [13.2390609, -8.8100279]],
        'properties' => [
            'type' => 'house',
            'name' => 'Banco Económico - Agência Rainha Ginga',
            'street' => 'Rua Rainha Jinga',
            'locality' => 'Mutamba',
            'city' => 'Luanda',
            'state' => 'Luanda',
            'countrycode' => 'AO',
        ],
    ]]];
}

it('geocodifica via Photon, restrito a Angola e com User-Agent identificável', function () {
    Http::fake(['photon.test/*' => Http::response(photonBank())]);

    $this->getJson('/api/v1/maps/geocode?q='.urlencode('Banco Económico Rainha Ginga'))
        ->assertOk()
        ->assertExactJson([
            'point' => ['lat' => -8.8100279, 'lng' => 13.2390609],
            'formattedAddress' => 'Banco Económico - Agência Rainha Ginga, Rua Rainha Jinga, Mutamba, Luanda',
            'province' => 'Luanda',
        ]);

    Http::assertSent(fn (Request $r) => $r['bbox'] === '11.6,-18.1,24.1,-4.3'
        && $r->header('User-Agent')[0] === 'Luku-test/1.0');
});

it('reverse põe a rua à frente do negócio vizinho', function () {
    Http::fake(['photon.test/*' => Http::response(photonBank())]);

    $this->getJson('/api/v1/maps/reverse-geocode?lat=-8.81&lng=13.239')
        ->assertOk()
        ->assertJsonPath('formattedAddress', 'Rua Rainha Jinga, Mutamba, Luanda');
});

it('guarda em cache: a mesma morada só vai ao Photon uma vez (e "sem resultado" também)', function () {
    Http::fake(['photon.test/*' => Http::sequence()
        ->push(photonBank())
        ->push(['features' => []]),
    ]);

    $this->getJson('/api/v1/maps/geocode?q=Rainha+Ginga')->assertOk();
    $this->getJson('/api/v1/maps/geocode?q='.urlencode('  RAINHA ginga '))->assertOk();
    $this->getJson('/api/v1/maps/geocode?q=Lugar+Inexistente')->assertNoContent();
    $this->getJson('/api/v1/maps/geocode?q=Lugar+Inexistente')->assertNoContent();

    Http::assertSentCount(2);
});

it('ignora resultados fora de Angola', function () {
    $foreign = photonBank();
    $foreign['features'][0]['properties']['countrycode'] = 'PT';
    Http::fake(['photon.test/*' => Http::response($foreign)]);

    $this->getJson('/api/v1/maps/geocode?q=Rua+Augusta')->assertNoContent();
});

it('reverse-geocode valida coordenadas', function () {
    Http::fake();

    $this->getJson('/api/v1/maps/reverse-geocode?lat=200&lng=13.2')->assertUnprocessable();
    Http::assertNothingSent();
});

it('calcula rota por estrada (OSRM) no formato do frontend', function () {
    Http::fake(['osrm.test/*' => Http::response([
        'code' => 'Ok',
        'routes' => [['distance' => 14070.3, 'duration' => 1399.5, 'geometry' => 'abc123']],
    ])]);

    $this->postJson('/api/v1/maps/route', [
        'from' => ['lat' => -8.8147, 'lng' => 13.2302],
        'to' => ['lat' => -8.916, 'lng' => 13.183],
    ])
        ->assertOk()
        ->assertExactJson([
            'distanceKm' => 14.07,
            'durationMin' => 23.3,
            'polyline' => 'abc123',
        ]);

    // OSRM usa "lng,lat" — trocar a ordem dava rotas no meio do oceano.
    Http::assertSent(fn (Request $r) => str_contains(
        $r->url(),
        '/route/v1/driving/13.230200,-8.814700;13.183000,-8.916000',
    ));
});

it('falha do serviço de mapas vira 502 (o frontend recai no cálculo local)', function () {
    Http::fake(['osrm.test/*' => Http::response(['code' => 'NoRoute'], 400)]);

    $this->postJson('/api/v1/maps/route', [
        'from' => ['lat' => -8.81, 'lng' => 13.23],
        'to' => ['lat' => -8.84, 'lng' => 13.29],
    ])->assertStatus(502);
});

it('normaliza nomes de província em pt e en', function (?string $in, ?string $out) {
    expect(OsmMapsService::normalizeProvince($in))->toBe($out);
})->with([
    ['Província de Luanda', 'Luanda'],
    ['Provincia do Cuanza Sul', 'Cuanza Sul'],
    ['Benguela Province', 'Benguela'],
    ['Huíla', 'Huíla'],
    ['', null],
    [null, null],
]);
