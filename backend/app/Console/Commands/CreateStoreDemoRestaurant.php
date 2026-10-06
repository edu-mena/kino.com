<?php

namespace App\Console\Commands;

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantHour;
use App\Models\RestaurantSubscription;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Restaurante + conta de dono para os REVISORES da App Store / Google Play
 * (testam o painel do restaurante e fazem pedidos de teste sem tocar em
 * restaurantes reais). Fica escondido da descoberta pública (`is_demo`, ver
 * Restaurant::scopeListed) — o revisor encontra-o pesquisando o nome exato.
 *
 * Idempotente: correr de novo atualiza dados e REDEFINE a senha (mostrada
 * uma única vez). Sem factories — em produção não há Faker (require-dev).
 *
 *   php artisan store:demo-restaurant
 */
class CreateStoreDemoRestaurant extends Command
{
    public const NAME = 'Luku Demo';

    protected $signature = 'store:demo-restaurant
        {--email=revisao@luku.ao : Email da conta de dono para os revisores}';

    protected $description = 'Cria/atualiza o restaurante de demonstração (escondido) e a conta dos revisores das lojas';

    private const MENU = [
        ['Muamba de Galinha', 'Frango estufado com quiabo e dendém, servido com funge.', 6500, 'Pratos principais'],
        ['Calulu de Peixe', 'Peixe seco e fresco com quiabo e óleo de palma.', 7000, 'Pratos principais'],
        ['Burger Clássico', 'Carne de vaca, queijo, alface e tomate.', 4500, 'Pratos principais'],
        ['Batata Frita', 'Porção de batata frita crocante.', 1500, 'Acompanhamentos'],
        ['Sumo Natural de Múcua', 'Sumo de múcua fresco.', 1200, 'Bebidas'],
        ['Mousse de Maracujá', 'Sobremesa cremosa de maracujá.', 2200, 'Sobremesas'],
    ];

    public function handle(): int
    {
        $email = strtolower((string) $this->option('email'));
        $existingUser = User::query()->where('email', $email)->first();
        if ($existingUser && $existingUser->role !== 'restaurant_staff') {
            $this->error("O email {$email} já pertence a uma conta de {$existingUser->role}. Use --email=outro@luku.ao.");

            return self::FAILURE;
        }

        $password = Str::password(16, symbols: false);

        DB::transaction(function () use ($email, $existingUser, $password) {
            $restaurant = Restaurant::query()->firstWhere(['name' => self::NAME, 'is_demo' => true])
                ?? new Restaurant;

            $restaurant->fill([
                'name' => self::NAME,
                'description' => 'Restaurante de demonstração da Luku, para testes. Os pedidos e reservas feitos aqui não são reais.',
                'cuisine' => 'Angolana',
                'address' => 'Rua de demonstração, Talatona',
                'neighborhood' => 'Talatona',
                'city' => 'Luanda',
                'lat' => -8.9175,
                'lng' => 13.1830,
                'phone' => '+244 900 000 000',
                'email' => $email,
                'is_delivery_available' => true,
                'fulfillment_modes' => ['delivery', 'takeaway', 'dinein'],
                'accepted_payment_methods' => ['multicaixa_express', 'cash'],
                'caution_modes_for_orders' => [],
                'delivery_fee' => 500,
                'estimated_delivery_minutes' => 30,
                'caution_amount' => 0,
                'accepts_reservations' => true,
                'orders_paused_manually' => false,
            ]);
            $restaurant->forceFill(['is_demo' => true])->save();

            // Sempre aberto — o revisor pode testar a qualquer hora (fuso de Luanda).
            foreach (range(0, 6) as $weekday) {
                $hour = RestaurantHour::query()->updateOrCreate(
                    ['restaurant_id' => $restaurant->id, 'weekday' => $weekday],
                    ['is_open' => true],
                );
                $hour->ranges()->delete();
                $hour->ranges()->create(['start_time' => '00:00', 'end_time' => '23:59']);
            }

            // Plano completo e ativo (nunca expira sozinho — não há trial).
            RestaurantSubscription::query()->updateOrCreate(
                ['restaurant_id' => $restaurant->id],
                ['plan' => 'plus', 'status' => 'active', 'started_at' => now(), 'trial_ends_at' => now(), 'last_payment_at' => now()],
            );

            if ($restaurant->tables()->doesntExist()) {
                foreach ([['Mesa 1', 4], ['Mesa 2', 2], ['Mesa 3', 6]] as [$name, $seats]) {
                    $restaurant->tables()->create(['name' => $name, 'seats' => $seats, 'area' => 'Interior']);
                }
            }

            $menu = $restaurant->menus()->firstOrCreate(['name' => 'Cardápio Principal'], ['is_active' => true]);
            foreach (self::MENU as [$name, $description, $price, $category]) {
                MenuItem::query()->updateOrCreate(
                    ['restaurant_id' => $restaurant->id, 'name' => $name],
                    ['menu_id' => $menu->id, 'description' => $description, 'price' => $price, 'category' => $category, 'is_available' => true],
                );
            }

            // Conta de dono: senha nova a cada execução e SEM 2FA (o revisor
            // não tem a app de autenticação de ninguém).
            $owner = $existingUser ?? new User(['role' => 'restaurant_staff', 'email' => $email]);
            $owner->forceFill([
                'name' => 'Revisão Luku',
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
            ])->save();
            $owner->tokens()->delete();

            if (! $restaurant->staff()->where('user_id', $owner->id)->exists()) {
                $restaurant->staff()->attach($owner->id, ['role_in_restaurant' => 'owner']);
            }
        });

        $this->info('Restaurante de demonstração pronto (escondido da descoberta pública).');
        $this->newLine();
        $this->line('Para as notas de revisão (App Store Connect → App Review Information; Play Console → App access):');
        $this->line("  Painel do restaurante — email: {$email}");
        $this->line("                          senha: {$password}");
        $this->line('  Pedidos de teste como cliente — entrar com qualquer conta Apple ou Google e');
        $this->line('  pesquisar "'.self::NAME.'" em Restaurantes (os pedidos aí não são reais).');
        $this->newLine();
        $this->warn('A senha só aparece agora. Correr o comando de novo gera outra.');

        return self::SUCCESS;
    }
}
