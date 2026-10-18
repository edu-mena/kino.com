<?php

namespace App\Services\SeededRestaurants;

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantHour;
use App\Models\RestaurantMenu;
use App\Models\RestaurantSubscription;
use App\Models\User;
use App\Support\RestaurantIndexCache;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Cria os restaurantes do Catalog com cardápio copiado de um restaurante
 * importado do menus.ao com cozinha parecida — só nomes, descrições,
 * categorias e preços (ligeiramente variados); nunca as fotos, que são
 * desses restaurantes. Idempotente: um restaurante do lote que já existe
 * (mesmo nome) é saltado.
 */
class SeededRestaurantGenerator
{
    public const EMAIL_DOMAIN = 'demo.luku.ao';

    private const MAX_ITEMS = 30;

    /** Origem do cardápio → cozinhas dos restaurantes importados. */
    private const SOURCES = [
        'angolana' => ['Angolana / Típica', 'Restaurante'],
        'grelhados' => ['Grelhados'],
        'marisco' => ['Marisqueira'],
        'italiana' => ['Italiana', 'Pizza'],
        'portuguesa' => ['Restaurante'],
        'fastfood' => ['Hambúrgueres', 'Restaurante', 'Café / Pastelaria'],
        'cafe' => ['Café / Pastelaria'],
        'brasileira' => ['Brasileira', 'Grelhados'],
        'bar' => ['Bar / Lounge'],
        'restaurante' => ['Restaurante', 'Hotel / Resort'],
    ];

    /** Bebidas alcoólicas e tabaco ficam de fora — cardápio de comida. */
    private const EXCLUDED = '/aguardente|bagaceira|brandy|cognac|conhaque|champa|espumante|vinho|wine|whisk|gin\b|vodka|smirnoff|gordon|cacha|licor|digestiv|cocktail|cerveja|beer|cidra|destilad|rum\b|tequila|cigarro|tabaco|shisha|narguil/i';

    /** @var array<string, Collection<int, MenuItem>> */
    private array $poolCache = [];

    /**
     * @return list<array{restaurant: Restaurant, email: string, created: bool, items: int}>
     */
    public function generate(string $batch, string $password): array
    {
        $results = [];
        foreach (Catalog::all() as $index => $entry) {
            $results[] = $this->createOne($batch, $password, $index, $entry);
        }
        RestaurantIndexCache::forget();

        return $results;
    }

    /**
     * @param  array{name: string, cuisine: string, source: string, province: string, neighborhood: string, lat: float, lng: float, profile: string, hours: string, description: string}  $entry
     * @return array{restaurant: Restaurant, email: string, created: bool, items: int}
     */
    private function createOne(string $batch, string $password, int $index, array $entry): array
    {
        $email = Str::slug(str_replace("'", '', $entry['name'])).'@'.self::EMAIL_DOMAIN;
        $existing = Restaurant::query()->where('seed_batch', $batch)->where('name', $entry['name'])->first();
        if ($existing) {
            return ['restaurant' => $existing, 'email' => $email, 'created' => false, 'items' => $existing->menuItems()->count()];
        }

        $profile = Catalog::PROFILES[$entry['profile']];
        $delivers = in_array('delivery', $profile['modes'], true);
        $seed = crc32($entry['name']);

        return DB::transaction(function () use ($batch, $password, $index, $entry, $email, $profile, $delivers, $seed) {
            $restaurant = new Restaurant;
            $restaurant->fill([
                'name' => $entry['name'],
                'description' => $entry['description'],
                'cuisine' => $entry['cuisine'],
                'address' => "Rua {$this->street($seed)}, {$entry['neighborhood']}",
                'neighborhood' => $entry['neighborhood'],
                'city' => $entry['province'],
                'lat' => $entry['lat'],
                'lng' => $entry['lng'],
                'phone' => sprintf('+244 9%02d %03d %03d', 20 + $seed % 80, $seed % 1000, intdiv($seed, 1000) % 1000),
                'is_delivery_available' => $delivers,
                'fulfillment_modes' => $profile['modes'],
                'accepted_payment_methods' => Catalog::PAYMENTS[$index % count(Catalog::PAYMENTS)],
                'caution_modes_for_orders' => [],
                'delivery_fee' => $delivers ? 500 + ($seed % 5) * 250 : 0,
                'estimated_delivery_minutes' => $delivers ? 25 + ($seed % 5) * 5 : null,
                'caution_amount' => 0,
                'accepts_reservations' => $profile['reservations'],
                'orders_paused_manually' => false,
            ]);
            $restaurant->forceFill(['is_published' => true, 'is_demo' => false, 'seed_batch' => $batch])->save();

            $this->createHours($restaurant, Catalog::HOURS[$entry['hours']]);

            RestaurantSubscription::query()->create([
                'restaurant_id' => $restaurant->id,
                'plan' => 'plus',
                'status' => 'active',
                'started_at' => now(),
                'trial_ends_at' => now(),
                'last_payment_at' => now(),
            ]);

            if (in_array('dinein', $profile['modes'], true)) {
                $tables = 4 + $seed % 7;
                for ($t = 1; $t <= $tables; $t++) {
                    $restaurant->tables()->create(['name' => "Mesa {$t}", 'seats' => [2, 4, 4, 6][$t % 4], 'area' => $t > $tables - 2 ? 'Esplanada' : 'Interior']);
                }
            }

            $items = $this->copyMenu($restaurant, $entry['source'], $seed);

            $owner = User::query()->firstOrNew(['email' => $email]);
            $owner->forceFill([
                'role' => 'restaurant_staff',
                'name' => "Gestão {$entry['name']}",
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ])->save();
            $restaurant->staff()->syncWithoutDetaching([$owner->id => ['role_in_restaurant' => 'owner']]);

            return ['restaurant' => $restaurant, 'email' => $email, 'created' => true, 'items' => $items];
        });
    }

    /** @param array{ranges: list<array{0: string, 1: string}>, closed: list<int>} $hours */
    private function createHours(Restaurant $restaurant, array $hours): void
    {
        foreach (range(0, 6) as $weekday) {
            $open = ! in_array($weekday, $hours['closed'], true);
            $hour = RestaurantHour::query()->create(['restaurant_id' => $restaurant->id, 'weekday' => $weekday, 'is_open' => $open]);
            if ($open) {
                foreach ($hours['ranges'] as [$start, $end]) {
                    $hour->ranges()->create(['start_time' => $start, 'end_time' => $end]);
                }
            }
        }
    }

    private function copyMenu(Restaurant $restaurant, string $source, int $seed): int
    {
        $pool = $this->pool($source);
        if ($pool->isEmpty()) {
            return 0;
        }

        // Cada restaurante gerado pega uma fatia diferente da mesma origem.
        $picked = $pool
            ->sortBy(fn (MenuItem $item) => crc32($item->id.'|'.$seed))
            ->unique(fn (MenuItem $item) => mb_strtolower($item->name))
            ->take(self::MAX_ITEMS);

        $menu = RestaurantMenu::query()->create(['restaurant_id' => $restaurant->id, 'name' => 'Cardápio Principal', 'is_active' => true]);
        foreach ($picked as $item) {
            $factor = 0.9 + (crc32($item->name.$seed) % 26) / 100; // 0.90 – 1.15
            MenuItem::query()->create([
                'restaurant_id' => $restaurant->id,
                'menu_id' => $menu->id,
                'name' => $item->name,
                'description' => $item->description,
                'price' => max(100, (int) (round($item->price * $factor / 50) * 50)),
                'category' => $this->category((string) $item->category),
                'image_url' => null,
                'is_available' => true,
                'portion_info' => $item->portion_info,
                'prep_time_minutes' => $item->prep_time_minutes,
            ]);
        }

        return $picked->count();
    }

    /** @return Collection<int, MenuItem> */
    private function pool(string $source): Collection
    {
        return $this->poolCache[$source] ??= MenuItem::query()
            ->whereHas('restaurant', fn ($q) => $q
                ->whereHas('import')
                ->whereIn('cuisine', self::SOURCES[$source] ?? ['Restaurante']))
            ->where('price', '>', 0)
            ->get(['id', 'name', 'description', 'price', 'category', 'portion_info', 'prep_time_minutes'])
            ->reject(fn (MenuItem $item) => preg_match(self::EXCLUDED, $item->name.' '.$item->category) === 1)
            ->values();
    }

    /** "CARNES ( CORTE PRIME )" → "Carnes (corte prime)". */
    private function category(string $category): string
    {
        $category = trim(preg_replace('/\s+/', ' ', str_replace(['( ', ' )'], ['(', ')'], $category)) ?? '');
        if ($category === '') {
            return 'Pratos';
        }
        if (mb_strtoupper($category) === $category) {
            $category = mb_strtolower($category);
        }

        return mb_strtoupper(mb_substr($category, 0, 1)).mb_substr($category, 1);
    }

    private function street(int $seed): string
    {
        $streets = ['Rainha Ginga', 'Amílcar Cabral', 'Comandante Gika', 'Major Kanhangulo', 'Direita da Samba', 'Che Guevara', 'Ho Chi Minh', 'da Missão', 'Deolinda Rodrigues', 'Kwame Nkrumah', 'Fernando Pessoa', 'Lueji A\'Nkonde'];

        return $streets[$seed % count($streets)].', n.º '.(1 + $seed % 240);
    }
}
