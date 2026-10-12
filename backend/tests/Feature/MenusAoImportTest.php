<?php

use App\Models\MenuItem;
use App\Models\MenuItemIngredient;
use App\Models\Restaurant;
use App\Models\RestaurantImport;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;

function menusAoPage(string $name): string
{
    return (string) file_get_contents(__DIR__."/../fixtures/menus-ao/{$name}.html");
}

function fakeJpeg(): string
{
    $img = imagecreatetruecolor(40, 30);
    imagefill($img, 0, 0, imagecolorallocate($img, 200, 120, 40));
    ob_start();
    imagejpeg($img);

    return (string) ob_get_clean();
}

/** HTML do cardápio servido pelo falso menus.ao — mudável a meio de um
 * teste (um segundo Http::fake() não substitui o primeiro). */
function menusAoMenuHtml(?string $set = null): string
{
    static $html = null;
    if ($set !== null) {
        $html = $set;
    }

    return $html ?? menusAoPage('menu');
}

function fakeMenusAo(): void
{
    Http::fake([
        'www.menus.ao/restaurantes' => Http::response(menusAoPage('restaurantes')),
        'www.menus.ao/casa-exemplo/contactos' => Http::response(menusAoPage('contactos')),
        'www.menus.ao/casa-exemplo/menu' => fn () => Http::response(menusAoMenuHtml()),
        'www.menus.ao/casa-exemplo' => Http::response(menusAoPage('home')),
        'www.menus.ao/admin-panel/*' => Http::response(fakeJpeg(), 200, ['Content-Type' => 'image/jpeg']),
        '*' => Http::response('erro', 500),
    ]);
}

function importedRestaurant(): Restaurant
{
    return RestaurantImport::query()->where('source_slug', 'casa-exemplo')->firstOrFail()->restaurant;
}

beforeEach(function () {
    Storage::fake('r2');
    menusAoMenuHtml(menusAoPage('menu'));
});

test('importa como pré-cadastro invisível: cardápio, fotos, horário e contactos privados', function () {
    fakeMenusAo();

    $this->artisan('menus-ao:import', ['--delay' => 0])->assertSuccessful();

    $restaurant = importedRestaurant();
    expect($restaurant->is_published)->toBeFalse()
        ->and($restaurant->name)->toBe('Casa do Exemplo')
        ->and($restaurant->address)->toBe('Rua da Missão, 12 | Talatona')
        ->and($restaurant->neighborhood)->toBe('Luanda')
        ->and((float) $restaurant->lat)->toBe(-8.9123)
        ->and($restaurant->cover_image_url)->not->toBeNull()
        ->and($restaurant->logo_url)->not->toBeNull()
        // Contactos recolhidos NÃO vão para o perfil (público após ativar).
        ->and($restaurant->phone)->toBeNull()
        ->and($restaurant->email)->toBeNull();

    $import = $restaurant->import;
    expect($import->contact_phone)->toBe('+244 923 456 789')
        ->and($import->contact_email)->toBe('dono.exemplo@gmail.com')
        ->and($import->stats)->toMatchArray(['items' => 5, 'categories' => 3, 'images' => 3, 'skippedNoPrice' => 1]);

    $items = MenuItem::query()->where('restaurant_id', $restaurant->id)->orderBy('id')->get();
    expect($items)->toHaveCount(5)
        ->and($items->pluck('category')->unique()->values()->all())->toBe(['Carnes', 'Entradas', 'Bebidas'])
        ->and((float) $items->firstWhere('name', 'Picanha na Brasa')->price)->toBe(21735.0)
        ->and($items->firstWhere('name', 'Picanha na Brasa')->image_url)->toContain('dish/menus-ao/casa-exemplo/');

    // Segunda-feira fechado, resto 11:30–22:00.
    $hours = $restaurant->hours()->with('ranges')->get()->keyBy('weekday');
    expect($hours)->toHaveCount(7)
        ->and($hours[1]->is_open)->toBeFalse()
        ->and(substr((string) $hours[3]->ranges->first()->start_time, 0, 5))->toBe('11:30');

    // Ficha de teste do menus.ao fica de fora; a que falhou não impede as outras.
    expect(RestaurantImport::query()->where('source_slug', 'the-test-grill')->exists())->toBeFalse();
    expect(RestaurantImport::query()->count())->toBe(1);
});

test('o público nunca vê um pré-cadastro; o operador vê e pré-visualiza', function () {
    fakeMenusAo();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])->assertSuccessful();
    $restaurant = importedRestaurant();
    $dish = MenuItem::query()->where('restaurant_id', $restaurant->id)->first();
    $customer = User::factory()->create();
    $operator = User::factory()->systemOperator()->create();

    $this->getJson('/api/v1/restaurants?filter[search]=Casa do Exemplo')
        ->assertOk()->assertJsonCount(0, 'data');
    $this->getJson("/api/v1/restaurants/{$restaurant->uuid}")->assertNotFound();
    $this->getJson("/api/v1/restaurants/{$restaurant->uuid}/menu-items")->assertNotFound();
    $this->getJson("/api/v1/menu-items/{$dish->uuid}")->assertNotFound();
    $this->getJson('/api/v1/menu-items')->assertOk()->assertJsonMissing(['name' => 'Picanha na Brasa']);
    $this->actingAs($customer, 'sanctum')->getJson("/api/v1/restaurants/{$restaurant->uuid}")->assertNotFound();
    $this->getJson('/api/v1/system/site-stats')->assertOk()->assertJsonPath('data.partnerRestaurants', 0);

    $this->actingAs($operator, 'sanctum')
        ->getJson('/api/v1/system/imported-restaurants')
        ->assertOk()
        ->assertJsonPath('counts.pending', 1)
        ->assertJsonPath('data.0.name', 'Casa do Exemplo')
        ->assertJsonPath('data.0.contactEmail', 'dono.exemplo@gmail.com')
        ->assertJsonPath('data.0.itemCount', 5);

    $this->actingAs($operator, 'sanctum')
        ->getJson("/api/v1/system/imported-restaurants/{$restaurant->uuid}")
        ->assertOk()
        ->assertJsonPath('data.categories.0.name', 'Carnes')
        ->assertJsonPath('data.categories.0.items.0.name', 'Picanha na Brasa')
        ->assertJsonCount(7, 'data.hours');
});

test('correr de novo salta os importados; --refresh sincroniza só os que estão por ativar', function () {
    fakeMenusAo();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])->assertSuccessful();

    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])
        ->expectsOutputToContain('já importado')
        ->assertSuccessful();

    menusAoMenuHtml(str_replace('21 735,00', '23 000,00', menusAoPage('menu')));
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--refresh' => true, '--delay' => 0])->assertSuccessful();

    $restaurant = importedRestaurant();
    expect(MenuItem::withTrashed()->where('restaurant_id', $restaurant->id)->count())->toBe(5)
        ->and((float) MenuItem::query()->where('name', 'Picanha na Brasa')->value('price'))->toBe(23000.0);

    // Depois de ativado, é do dono — a importação nunca mais lhe mexe.
    $restaurant->forceFill(['is_published' => true])->save();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--refresh' => true, '--delay' => 0])
        ->expectsOutputToContain('já ativado')
        ->assertSuccessful();
});

test('--dry-run não grava nada', function () {
    fakeMenusAo();

    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--dry-run' => true, '--delay' => 0])
        ->assertSuccessful();

    expect(Restaurant::query()->count())->toBe(0);
    Storage::disk('r2')->assertDirectoryEmpty('dish');
});

test('ativar: fica público, cria a conta do dono com convite e o período grátis', function () {
    Password::shouldReceive('sendResetLink')->once()->andReturn('reset-link-sent');
    fakeMenusAo();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])->assertSuccessful();
    $restaurant = importedRestaurant();
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/system/imported-restaurants/{$restaurant->uuid}/activate", [
            'owner_name' => 'Dono Exemplo',
            'owner_email' => 'Dono.Exemplo@gmail.com',
            'public_phone' => '+244 923 456 789',
        ])
        ->assertOk()
        ->assertJsonPath('data.isPublished', true);

    $restaurant->refresh();
    $owner = User::query()->where('email', 'dono.exemplo@gmail.com')->firstOrFail();
    expect($restaurant->is_published)->toBeTrue()
        ->and($restaurant->phone)->toBe('+244 923 456 789')
        ->and($restaurant->email)->toBeNull()
        ->and($restaurant->subscription->status)->toBe('trial')
        ->and($restaurant->tables()->count())->toBe(3)
        ->and($owner->role)->toBe('restaurant_staff')
        ->and($restaurant->staff()->whereKey($owner->id)->exists())->toBeTrue()
        ->and($restaurant->import->activated_at)->not->toBeNull();

    // Agora sim, público — com o cardápio importado.
    $this->getJson("/api/v1/restaurants/{$restaurant->uuid}")->assertOk();
    $this->getJson('/api/v1/restaurants')->assertJsonFragment(['name' => 'Casa do Exemplo']);

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/system/imported-restaurants/{$restaurant->uuid}/activate", [
            'owner_name' => 'Outro', 'owner_email' => 'outro@example.com',
        ])
        ->assertStatus(422);
});

test('ativar com email de cliente é recusado com mensagem clara', function () {
    fakeMenusAo();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])->assertSuccessful();
    $restaurant = importedRestaurant();
    $operator = User::factory()->systemOperator()->create();
    User::factory()->create(['email' => 'cliente@example.com']);

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/system/imported-restaurants/{$restaurant->uuid}/activate", [
            'owner_name' => 'X', 'owner_email' => 'cliente@example.com',
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', fn ($m) => str_contains($m, 'cliente'));

    expect($restaurant->fresh()->is_published)->toBeFalse();
});

test('descartar tira da lista e da reimportação; repor volta a pô-lo por ativar', function () {
    fakeMenusAo();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])->assertSuccessful();
    $restaurant = importedRestaurant();
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($operator, 'sanctum')
        ->deleteJson("/api/v1/system/imported-restaurants/{$restaurant->uuid}")
        ->assertStatus(204);

    $this->actingAs($operator, 'sanctum')
        ->getJson('/api/v1/system/imported-restaurants?status=discarded')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('counts.pending', 0);

    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--refresh' => true, '--delay' => 0])
        ->expectsOutputToContain('descartado')
        ->assertSuccessful();

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/system/imported-restaurants/{$restaurant->uuid}/restore")
        ->assertOk();
    expect(Restaurant::query()->whereKey($restaurant->id)->exists())->toBeTrue();
});

test('só operadores de sistema mexem nos pré-cadastros', function () {
    fakeMenusAo();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])->assertSuccessful();
    $restaurant = importedRestaurant();
    $staff = ownerOf(Restaurant::factory()->create());

    $this->actingAs($staff, 'sanctum')->getJson('/api/v1/system/imported-restaurants')->assertForbidden();
    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/system/imported-restaurants/{$restaurant->uuid}/activate", [
            'owner_name' => 'X', 'owner_email' => 'x@example.com',
        ])
        ->assertNotFound();
});

test('pratos importados ganham ingredientes reconhecidos na descrição (bebidas não)', function () {
    fakeMenusAo();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])->assertSuccessful();
    $restaurant = importedRestaurant();
    $ingredientsOf = fn (string $dish) => MenuItem::query()
        ->where('restaurant_id', $restaurant->id)->where('name', $dish)->firstOrFail()
        ->ingredients()->orderBy('position')->get();

    $picanha = $ingredientsOf('Picanha na Brasa');
    expect($picanha->pluck('name')->all())->toBe(['Picanha', 'Batata'])
        ->and($picanha->every(fn ($i) => $i->removable && $i->extra_price === null))->toBeTrue();
    expect($ingredientsOf('Couvert')->pluck('name')->all())->toBe(['Pão Caseiro', 'Manteiga']);
    expect($ingredientsOf('Sumo Natural'))->toHaveCount(0);

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')
        ->getJson("/api/v1/system/imported-restaurants/{$restaurant->uuid}")
        ->assertJsonPath('data.categories.0.items.0.ingredients', ['Picanha', 'Batata']);
});

test('menus-ao:ingredients preenche os já importados sem ingredientes e nunca mexe nos ativados', function () {
    fakeMenusAo();
    $this->artisan('menus-ao:import', ['slugs' => ['casa-exemplo'], '--delay' => 0])->assertSuccessful();
    $restaurant = importedRestaurant();
    $itemIds = MenuItem::query()->where('restaurant_id', $restaurant->id)->pluck('id');
    MenuItemIngredient::query()->whereIn('menu_item_id', $itemIds)->delete();

    $this->artisan('menus-ao:ingredients', ['--dry-run' => true])->assertSuccessful();
    expect(MenuItemIngredient::query()->whereIn('menu_item_id', $itemIds)->count())->toBe(0);

    $this->artisan('menus-ao:ingredients')->expectsOutputToContain('3 de 5 pratos')->assertSuccessful();
    expect(MenuItemIngredient::query()->whereIn('menu_item_id', $itemIds)->count())->toBe(5)
        ->and($restaurant->import->fresh()->stats['withIngredients'])->toBe(3);

    // Correr de novo não duplica.
    $this->artisan('menus-ao:ingredients')->assertSuccessful();
    expect(MenuItemIngredient::query()->whereIn('menu_item_id', $itemIds)->count())->toBe(5);

    // Ativado é do dono.
    MenuItemIngredient::query()->whereIn('menu_item_id', $itemIds)->delete();
    $restaurant->forceFill(['is_published' => true])->save();
    $restaurant->import->update(['activated_at' => now()]);
    $this->artisan('menus-ao:ingredients')->assertSuccessful();
    expect(MenuItemIngredient::query()->whereIn('menu_item_id', $itemIds)->count())->toBe(0);
});
