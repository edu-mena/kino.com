<?php

namespace Database\Seeders;

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantSubscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Restaurantes de demonstração para testes end-to-end em rede local (não é
 * o seed de produção — DatabaseSeeder deliberadamente não inclui isto, ver
 * comentário lá). Nomes/estilo inspirados em INITIAL_RESTAURANTS do mock
 * (src/data/mockData.ts), sem ser um port 1:1 — só o suficiente para um
 * percurso real: navegar → ver menu → pedir/reservar → ver no painel.
 *
 * Cada restaurante já vem com conta de dono (senha "password", ver
 * UserFactory) para entrar em /admin/entrar sem depender de email.
 */
class DemoRestaurantSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedRestaurant(
            name: 'Bistrô Sabor & Arte',
            description: 'Gastronomia contemporânea com inspiração angolana e internacional.',
            cuisine: 'Angolana / Típica',
            ownerEmail: 'dono@saborearte.ao',
            items: [
                ['Muamba de Galinha', 'Frango estufado com quiabo e dendém, acompanhado de funge.', 6500],
                ['Calulu de Peixe', 'Peixe seco e fresco com quiabo e óleo de palma.', 7000],
                ['Kizaca com Camarão', 'Folhas de mandioca trituradas com camarão fresco.', 8500],
                ['Mousse de Maracujá', 'Sobremesa cremosa de maracujá angolano.', 2200],
            ],
        );

        $this->seedRestaurant(
            name: 'O Marisqueiro da Ilha',
            description: 'Especialista em marisco fresco da costa angolana.',
            cuisine: 'Marisqueira',
            ownerEmail: 'dono@marisqueiroilha.ao',
            items: [
                ['Lagosta Grelhada', 'Lagosta fresca grelhada com manteiga de alho.', 15000],
                ['Caldeirada de Peixe', 'Caldeirada tradicional com peixe do dia.', 9000],
                ['Gambas ao Alho', 'Gambas salteadas em azeite e alho.', 8000],
                ['Arroz de Marisco', 'Arroz malandrinho com marisco variado.', 9500],
            ],
        );

        $this->seedRestaurant(
            name: 'Talatona Burger House',
            description: 'Hambúrgueres artesanais, batatas fritas e milkshakes.',
            cuisine: 'Fast-food',
            ownerEmail: 'dono@talatonaburger.ao',
            items: [
                ['Burger Clássico', 'Carne de vaca, queijo cheddar, alface e tomate.', 4500],
                ['Burger Duplo Bacon', 'Duas carnes, bacon crocante e molho especial.', 6000],
                ['Batata Frita Grande', 'Porção grande de batata frita crocante.', 2000],
                ['Milkshake de Chocolate', 'Milkshake cremoso de chocolate.', 2500],
            ],
        );
    }

    private function seedRestaurant(string $name, string $description, string $cuisine, string $ownerEmail, array $items): void
    {
        $restaurant = Restaurant::factory()->create([
            'name' => $name,
            'description' => $description,
            'cuisine' => $cuisine,
            'phone' => '+244 923 000 000',
            'email' => $ownerEmail,
        ]);

        RestaurantSubscription::query()->create([
            'restaurant_id' => $restaurant->id,
            'plan' => 'plus',
            'started_at' => now(),
            'trial_ends_at' => now()->addDays(60),
            'status' => 'trial',
        ]);

        foreach ([['Mesa 1', 4], ['Mesa 2', 2], ['Mesa 3', 6]] as [$tableName, $seats]) {
            $restaurant->tables()->create(['name' => $tableName, 'seats' => $seats, 'area' => 'Interior']);
        }

        $menu = $restaurant->menus()->create(['name' => 'Cardápio Principal', 'is_active' => true]);

        foreach ($items as [$itemName, $itemDescription, $price]) {
            MenuItem::factory()->create([
                'restaurant_id' => $restaurant->id,
                'menu_id' => $menu->id,
                'name' => $itemName,
                'description' => $itemDescription,
                'price' => $price,
                'category' => 'Pratos principais',
            ]);
        }

        $owner = User::query()->firstOrCreate(
            ['email' => $ownerEmail],
            ['role' => 'restaurant_staff', 'name' => 'Dono '.$name, 'password' => Hash::make('password')],
        );
        $restaurant->staff()->attach($owner->id, ['role_in_restaurant' => 'owner']);
    }
}
