<?php

use App\Services\MenusAo\MenusAoParser;

function menusAoFixture(string $name): string
{
    return (string) file_get_contents(__DIR__."/../fixtures/menus-ao/{$name}.html");
}

test('lista de restaurantes: slug, nome, localização e foto (sem imagens default nem páginas que não são restaurantes)', function () {
    $list = (new MenusAoParser)->directory(menusAoFixture('restaurantes'));

    expect(array_column($list, 'slug'))->toBe(['casa-exemplo', 'mar-azul', 'the-test-grill']);
    expect($list[0])->toMatchArray([
        'name' => 'Casa do Exemplo',
        'location' => 'Rua da Missão | Talatona',
        'image' => 'https://www.menus.ao/admin-panel/upload/photos/2025/06/thumb_01_capa_image.jpeg',
    ]);
    expect($list[1]['image'])->toBeNull();
});

test('página inicial: nome, capa, logótipo, contactos, horário e dia de fecho', function () {
    $home = (new MenusAoParser)->home(menusAoFixture('home'));

    expect($home)->toMatchArray([
        'name' => 'Casa do Exemplo',
        'cover' => 'https://www.menus.ao/admin-panel/upload/photos/2025/06/04_capa_image.jpeg',
        'logo' => 'https://www.menus.ao/admin-panel/upload/photos/2025/06/04_logo_image.png',
        'email' => 'dono.exemplo@gmail.com',
        'phone' => '+244 923 456 789',
        'opensAt' => '11:30',
        'closesAt' => '22:00',
        'closedWeekdays' => [1],
        'instagram' => 'casaexemplo.ao',
    ]);
});

test('contactos: morada sem "Angola", email, telefone e coordenadas do mapa', function () {
    $contacts = (new MenusAoParser)->contacts(menusAoFixture('contactos'));

    expect($contacts)->toMatchArray([
        'address' => 'Rua da Missão, 12 | Talatona',
        'email' => 'dono.exemplo@gmail.com',
        'phone' => '+244 923 456 789',
        'lat' => -8.9123,
        'lng' => 13.1876,
    ]);
});

test('cardápio: junta categorias repetidas, ignora duplicados e pratos sem preço', function () {
    $menu = (new MenusAoParser)->menu(menusAoFixture('menu'));

    expect(array_column($menu['categories'], 'name'))->toBe(['Carnes', 'Entradas', 'Bebidas']);
    expect($menu['skipped'])->toBe(1);

    $carnes = $menu['categories'][0]['items'];
    expect(array_column($carnes, 'name'))->toBe(['Picanha na Brasa', 'Bife à Casa']);
    expect($carnes[0])->toMatchArray([
        'description' => "Picanha grelhada & batata frita.\nImagem ilustrativa",
        'price' => 21735.0,
        'image' => 'https://www.menus.ao/admin-panel/upload/photos/2025/06/22_picanha_image.jpeg',
        'featured' => true,
    ]);

    $entradas = $menu['categories'][1]['items'];
    expect($entradas[1])->toMatchArray(['name' => 'Pastéis de Bacalhau (6 un.)', 'price' => 1500.0, 'image' => null, 'description' => null]);
    expect($menu['categories'][2]['items'])->toHaveCount(1);
});

test('preços e províncias', function () {
    $p = new MenusAoParser;

    expect($p->price('88 550,00'))->toBe(88550.0)
        ->and($p->price('1.500,00'))->toBe(1500.0)
        ->and($p->price('15.000'))->toBe(15000.0)
        ->and($p->price('12.50'))->toBe(12.5)
        ->and($p->price('0,00'))->toBeNull()
        ->and($p->price(''))->toBeNull();

    expect($p->province('Edifício one Metrópoles | Talatona'))->toBe('Luanda')
        ->and($p->province('Marginal | Lobito'))->toBe('Benguela')
        ->and($p->province('Rua X | Huila'))->toBe('Huíla')
        ->and($p->province(null, 'Centro | Huambo'))->toBe('Huambo');
});

test('horário: só um intervalo inequívoco é aceite', function () {
    $p = new MenusAoParser;

    expect($p->hours('12:00 / 23:00'))->toBe(['12:00', '23:00'])
        ->and($p->hours('das 11h às 23h'))->toBe(['11:00', '23:00'])
        ->and($p->hours('07H30 - 22H00'))->toBe(['07:30', '22:00'])
        ->and($p->hours('8 às 21'))->toBe(['08:00', '21:00'])
        ->and($p->hours('10/23'))->toBe(['10:00', '23:00'])
        ->and($p->hours('13-22h'))->toBe(['13:00', '22:00'])
        ->and($p->hours('12h as 22h:30m'))->toBe(['12:00', '22:30'])
        ->and($p->hours('07h as 21.30h'))->toBe(['07:00', '21:30'])
        ->and($p->hours('Das 11 horas ás 22:30 horas'))->toBe(['11:00', '22:30'])
        ->and($p->hours('Das 8h as 0h'))->toBe(['08:00', '00:00'])
        // Por dia, incompletos ou lixo: fica por definir.
        ->and($p->hours('Terça a Sábado das 12:00 às 22:00'))->toBe([null, null])
        ->and($p->hours('Semana 07:30 às 20:00 FDS 08:00 às 16:00'))->toBe([null, null])
        ->and($p->hours('Abertura as 08:00h'))->toBe([null, null])
        ->and($p->hours('0000'))->toBe([null, null])
        ->and($p->hours('07'))->toBe([null, null]);
});

test('dias de fecho: limpos, nenhum, ou ambíguos', function () {
    $p = new MenusAoParser;

    expect($p->closedDays('Segunda-Feira'))->toBe([1])
        ->and($p->closedDays('Sabado e Domingo'))->toBe([0, 6])
        ->and($p->closedDays('Não encerra'))->toBe([])
        ->and($p->closedDays('Nenhum'))->toBe([])
        ->and($p->closedDays('- Não'))->toBe([])
        ->and($p->closedDays('Abrimos todos os dias.'))->toBe([])
        ->and($p->closedDays('Domingo e Segunda-feira ao Jantar'))->toBeNull()
        ->and($p->closedDays('SEGUNDA- DAS 07H AS 12H00'))->toBeNull()
        ->and($p->closedDays('Temporariamente encerrado'))->toBeNull()
        ->and($p->closedDays('De 2º a 5º Feira'))->toBeNull();
});

test('telefone angolano em vários formatos; números estrangeiros e de enchimento ficam de fora', function () {
    $p = new MenusAoParser;
    $phone = fn (string $text) => $p->contacts("<div class='info-box'><h3>Contacto</h3><p>{$text}</p></div>")['phone'];

    expect($phone('+244917477356'))->toBe('+244 917 477 356')
        ->and($phone('925419077'))->toBe('+244 925 419 077')
        ->and($phone('+244 923 656 222'))->toBe('+244 923 656 222')
        ->and($phone('00351912639691'))->toBeNull()
        ->and($phone('999999999'))->toBeNull();
});
