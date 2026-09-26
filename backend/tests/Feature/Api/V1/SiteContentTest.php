<?php

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\RestaurantSubscription;
use App\Models\Review;
use App\Models\SiteFaq;
use App\Models\SiteSetting;
use App\Models\SiteTeamMember;
use App\Models\SiteTestimonial;
use App\Models\User;

test('conteúdo institucional é público e devolve os 4 blocos', function () {
    SiteSetting::current()->update(['contact_email' => 'ola@luku.ao']);
    SiteTeamMember::create(['name' => 'Eduardo Mena', 'role' => 'CTO', 'position' => 1]);
    SiteTestimonial::create(['name' => 'Carla Mendes', 'role' => 'Cliente', 'quote' => 'Ótimo!', 'position' => 1]);
    SiteFaq::create(['question' => 'É grátis?', 'answer' => 'Sim.', 'position' => 1]);

    $response = $this->getJson('/api/v1/site/content');

    $response->assertOk()
        ->assertJsonPath('data.settings.contactEmail', 'ola@luku.ao')
        ->assertJsonPath('data.team.0.name', 'Eduardo Mena')
        ->assertJsonPath('data.testimonials.0.name', 'Carla Mendes')
        ->assertJsonPath('data.faqs.0.question', 'É grátis?');
});

test('só system_operator edita as informações de contacto/sobre nós', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/site/settings', ['contact_email' => 'hack@example.com'])
        ->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/settings', ['contact_phone' => '+244 999 999 999'])
        ->assertOk()
        ->assertJsonPath('data.contactPhone', '+244 999 999 999');

    $this->getJson('/api/v1/site/content')
        ->assertJsonPath('data.settings.contactPhone', '+244 999 999 999');
});

test('operador de sistema gere equipa, testemunhos e FAQ (criar/editar/apagar)', function () {
    $operator = User::factory()->systemOperator()->create();

    $created = $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/team', ['name' => 'Nova Pessoa', 'role' => 'COO']);
    $created->assertStatus(201)->assertJsonPath('data.name', 'Nova Pessoa');
    $teamId = $created->json('data.id');

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/site/team/{$teamId}", [
            'role' => 'CFO', 'photo_url' => 'https://cdn.luku.com/team/nova-pessoa.jpg',
        ])
        ->assertOk()
        ->assertJsonPath('data.role', 'CFO')
        ->assertJsonPath('data.photoUrl', 'https://cdn.luku.com/team/nova-pessoa.jpg');

    $testimonial = $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/testimonials', [
            'name' => 'Novo Cliente', 'role' => 'Cliente', 'quote' => 'Muito bom.',
        ])
        ->assertStatus(201)
        ->json('data.id');

    $faq = $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/faqs', ['question' => 'Pergunta nova?', 'answer' => 'Resposta.'])
        ->assertStatus(201)
        ->json('data.id');

    $this->actingAs($operator, 'sanctum')->deleteJson("/api/v1/site/team/{$teamId}")->assertStatus(204);
    $this->actingAs($operator, 'sanctum')->deleteJson("/api/v1/site/testimonials/{$testimonial}")->assertStatus(204);
    $this->actingAs($operator, 'sanctum')->deleteJson("/api/v1/site/faqs/{$faq}")->assertStatus(204);

    $content = $this->getJson('/api/v1/site/content')->json('data');
    expect($content['team'])->toBeEmpty()
        ->and($content['testimonials'])->toBeEmpty()
        ->and($content['faqs'])->toBeEmpty();
});

test('restaurante não-operador não gere equipa/testemunhos/FAQ', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/site/team', ['name' => 'X', 'role' => 'Y'])
        ->assertForbidden();
    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/site/testimonials', ['name' => 'X', 'role' => 'Y', 'quote' => 'Z'])
        ->assertForbidden();
    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/site/faqs', ['question' => 'X', 'answer' => 'Y'])
        ->assertForbidden();
});

test('estatísticas do site são calculadas a partir dos dados reais, excluindo restaurante suspenso', function () {
    User::factory()->create(['role' => 'customer']);
    User::factory()->create(['role' => 'customer']);

    $active = Restaurant::factory()->create();
    RestaurantSubscription::create([
        'restaurant_id' => $active->id, 'plan' => 'pro', 'status' => 'active',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(14),
    ]);

    $suspended = Restaurant::factory()->create();
    RestaurantSubscription::create([
        'restaurant_id' => $suspended->id, 'plan' => 'pro', 'status' => 'suspended',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(14),
    ]);

    // MenuItem::factory() por omissão cria também um RestaurantMenu novo
    // (com o SEU PRÓPRIO Restaurant::factory()) — `for($active)` só associa
    // o `restaurant_id`, não o `menu_id`, e cada chamada acabava a criar um
    // restaurante extra "fantasma". `create()` direto evita a fábrica aqui.
    $menu = RestaurantMenu::create(['restaurant_id' => $active->id, 'name' => 'Cardápio', 'is_active' => true]);
    MenuItem::create([
        'restaurant_id' => $active->id, 'menu_id' => $menu->id, 'name' => 'Prato 1',
        'price' => 2500, 'category' => 'Pratos principais', 'is_available' => true,
    ]);
    MenuItem::create([
        'restaurant_id' => $active->id, 'menu_id' => $menu->id, 'name' => 'Prato 2',
        'price' => 3000, 'category' => 'Pratos principais', 'is_available' => true,
    ]);

    Review::create([
        'restaurant_id' => $active->id, 'customer_name' => 'Cliente Teste',
        'rating' => 4, 'date' => now(),
    ]);
    Review::create([
        'restaurant_id' => $active->id, 'customer_name' => 'Outro Cliente',
        'rating' => 5, 'date' => now(),
    ]);

    $response = $this->getJson('/api/v1/system/site-stats');

    $response->assertOk()
        ->assertJsonPath('data.activeCustomers', 2)
        ->assertJsonPath('data.partnerRestaurants', 1)
        ->assertJsonPath('data.menuDishes', 2)
        ->assertJsonPath('data.averageRating', 4.5);
});
