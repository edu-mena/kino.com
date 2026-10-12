<?php

namespace App\Services\MenusAo;

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantHour;
use App\Models\RestaurantImport;
use App\Models\RestaurantMenu;
use App\Services\MediaUploadService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Traz um restaurante do menus.ao para a Luku como PRÉ-CADASTRO: restaurante
 * invisível (`is_published = false`) com cardápio completo, à espera de um
 * operador o ativar em /sistema/importados.
 *
 * Idempotente por `source_slug`: correr de novo salta os já importados
 * (ou volta a sincronizar o cardápio com `refresh`), e NUNCA mexe num
 * restaurante já ativado ou descartado — esse passou a ser do dono.
 *
 * Fotos: copiadas para o armazenamento da Luku com caminho determinístico
 * (hash do URL de origem) — uma importação interrompida retoma sem voltar
 * a descarregar o que já está guardado.
 */
class MenusAoImporter
{
    public const MENU_NAME = 'Cardápio';

    public function __construct(
        private readonly MenusAoClient $client,
        private readonly MenusAoParser $parser,
        private readonly MediaUploadService $media,
        private readonly IngredientRecognizer $ingredients = new IngredientRecognizer,
    ) {}

    /**
     * Lê as 3 páginas de um restaurante e junta tudo.
     *
     * @param  array{name?: string, location?: ?string, image?: ?string}  $card  ficha da lista /restaurantes
     * @return array<string, mixed>
     */
    public function scrape(string $slug, array $card = []): array
    {
        $home = $this->parser->home($this->client->page($slug));
        $contacts = $this->parser->contacts($this->client->page("{$slug}/contactos"));
        $menu = $this->parser->menu($this->client->page("{$slug}/menu"));

        $address = $contacts['address'] ?? $card['location'] ?? null;

        return [
            'slug' => $slug,
            'sourceUrl' => MenusAoParser::BASE_URL.'/'.$slug,
            'name' => $home['name'] ?? $card['name'] ?? Str::headline($slug),
            'address' => $address,
            'location' => $card['location'] ?? null,
            'province' => $this->parser->province($address, $card['location'] ?? null),
            'lat' => $contacts['lat'],
            'lng' => $contacts['lng'],
            'phone' => $contacts['phone'] ?? $home['phone'],
            'email' => $contacts['email'] ?? $home['email'],
            'instagram' => $home['instagram'],
            'cover' => $home['cover'] ?? $card['image'] ?? null,
            'logo' => $home['logo'],
            'opensAt' => $home['opensAt'],
            'closesAt' => $home['closesAt'],
            'closedWeekdays' => $home['closedWeekdays'],
            'categories' => $menu['categories'],
            'skippedNoPrice' => $menu['skipped'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data  saída de scrape()
     * @return array{status: 'created'|'refreshed'|'skipped', reason?: string, import?: RestaurantImport}
     */
    public function import(array $data, bool $withImages = true, bool $refresh = false): array
    {
        $existing = RestaurantImport::query()
            ->where('source', RestaurantImport::SOURCE_MENUS_AO)
            ->where('source_slug', $data['slug'])
            ->first();

        if ($existing?->discarded_at) {
            return ['status' => 'skipped', 'reason' => 'descartado'];
        }
        if ($existing && ($existing->activated_at || $existing->restaurant?->is_published)) {
            return ['status' => 'skipped', 'reason' => 'já ativado'];
        }
        if ($existing && ! $refresh) {
            return ['status' => 'skipped', 'reason' => 'já importado'];
        }
        $itemCount = collect($data['categories'])->sum(fn ($c) => count($c['items']));
        if ($itemCount === 0) {
            return ['status' => 'skipped', 'reason' => 'cardápio vazio'];
        }

        // Fotos antes da transação: nunca prender a BD à espera da rede.
        $images = ['cover' => null, 'logo' => null, 'items' => []];
        $imageCount = 0;
        if ($withImages) {
            $images['cover'] = $this->storeImage($data['cover'], 'cover', $data['slug']);
            $images['logo'] = $this->storeImage($data['logo'], 'logo', $data['slug']);
            foreach ($data['categories'] as $category) {
                foreach ($category['items'] as $item) {
                    if ($item['image'] && ! isset($images['items'][$item['image']])) {
                        $images['items'][$item['image']] = $this->storeImage($item['image'], 'dish', $data['slug']);
                    }
                }
            }
            $imageCount = count(array_filter($images['items']));
        }

        $import = DB::transaction(function () use ($data, $existing, $images, $itemCount, $imageCount) {
            $restaurant = $existing?->restaurant ?? new Restaurant;
            $restaurant->fill([
                'name' => Str::limit($data['name'], 150, ''),
                'address' => $data['address'] ? Str::limit($data['address'], 255, '') : null,
                'neighborhood' => $data['province'],
                'city' => $data['province'],
                'lat' => $data['lat'],
                'lng' => $data['lng'],
                'cuisine' => $this->guessCuisine($data),
                'cover_image_url' => $images['cover'] ?? $restaurant->cover_image_url,
                'logo_url' => $images['logo'] ?? $restaurant->logo_url,
            ]);
            // Invisível até um operador ativar — fora do $fillable de propósito.
            $restaurant->forceFill(['is_published' => false]);
            $restaurant->save();

            $this->syncHours($restaurant, $data);
            $this->syncMenu($restaurant, $data, $images['items']);

            return RestaurantImport::query()->updateOrCreate(
                ['source' => RestaurantImport::SOURCE_MENUS_AO, 'source_slug' => $data['slug']],
                [
                    'restaurant_id' => $restaurant->id,
                    'source_url' => $data['sourceUrl'],
                    'contact_phone' => $data['phone'],
                    'contact_email' => $data['email'],
                    'source_location' => $data['location'] ? Str::limit($data['location'], 255, '') : null,
                    'stats' => [
                        'items' => $itemCount,
                        'categories' => count($data['categories']),
                        'images' => $imageCount,
                        'skippedNoPrice' => $data['skippedNoPrice'],
                        'instagram' => $data['instagram'],
                    ],
                    'synced_at' => now(),
                ],
            );
        });

        return ['status' => $existing ? 'refreshed' : 'created', 'import' => $import];
    }

    /** Guarda uma imagem do menus.ao (original + miniaturas) e devolve o
     * URL público; `null` sem imagem ou se falhar (nunca rebenta a
     * importação por causa de uma foto). */
    private function storeImage(?string $url, string $purpose, string $slug): ?string
    {
        if (! $url) {
            return null;
        }
        $ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION)) ?: 'jpg';
        $ext = in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true) ? $ext : 'jpg';
        $path = "{$purpose}/menus-ao/{$slug}/".sha1($url).".{$ext}";

        try {
            $disk = Storage::disk('r2');
            if ($disk->exists($path)) {
                return $disk->url($path);
            }
            $bytes = $this->client->image($url);

            return $bytes === null ? null : $this->media->putPublicImage($path, $this->shrink($bytes, $ext));
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }

    /** Lado maior das fotos guardadas — o painel redimensiona os uploads
     * normais para ~900 px; acima disto é só peso (e memória a gerar as
     * miniaturas: uma foto de 4000 px ocupa ~50 MB descomprimida). */
    private const MAX_IMAGE_SIDE = 1600;

    /** Reduz fotos maiores do que MAX_IMAGE_SIDE; as outras ficam iguais. */
    private function shrink(string $bytes, string $ext): string
    {
        $info = @getimagesizefromstring($bytes);
        if (! $info || $ext === 'gif' || max($info[0], $info[1]) <= self::MAX_IMAGE_SIDE || $info[0] * $info[1] > 40_000_000) {
            return $bytes;
        }
        $source = @imagecreatefromstring($bytes);
        if ($source === false) {
            return $bytes;
        }
        $scale = self::MAX_IMAGE_SIDE / max($info[0], $info[1]);
        $width = max(1, (int) round($info[0] * $scale));
        $height = max(1, (int) round($info[1] * $scale));
        $resized = imagecreatetruecolor($width, $height);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $source, 0, 0, 0, 0, $width, $height, $info[0], $info[1]);
        imagedestroy($source);

        ob_start();
        try {
            match ($ext) {
                'png' => imagepng($resized, null, 8),
                'webp' => imagewebp($resized, null, 85),
                default => imagejpeg($resized, null, 85),
            };
        } finally {
            $out = (string) ob_get_clean();
            imagedestroy($resized);
        }

        return $out !== '' ? $out : $bytes;
    }

    /** @param  array<string, mixed>  $data */
    private function syncHours(Restaurant $restaurant, array $data): void
    {
        if (! $data['opensAt'] || ! $data['closesAt']) {
            return;
        }
        $restaurant->hours()->delete();
        for ($weekday = 0; $weekday <= 6; $weekday++) {
            $open = ! in_array($weekday, $data['closedWeekdays'], true);
            /** @var RestaurantHour $hour */
            $hour = $restaurant->hours()->create(['weekday' => $weekday, 'is_open' => $open]);
            if ($open) {
                $hour->ranges()->create(['start_time' => $data['opensAt'], 'end_time' => $data['closesAt']]);
            }
        }
    }

    /**
     * Um cardápio "Cardápio" com todos os pratos; a categoria do menus.ao
     * fica na categoria do prato. Numa nova sincronização (pré-cadastro, sem
     * dono nem pedidos) os pratos são substituídos.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, ?string>  $imageMap  URL de origem → URL Luku
     */
    private function syncMenu(Restaurant $restaurant, array $data, array $imageMap): void
    {
        $menu = RestaurantMenu::query()->firstOrCreate(
            ['restaurant_id' => $restaurant->id, 'name' => self::MENU_NAME],
            ['is_active' => true],
        );
        // Pré-cadastro: sem pedidos nem favoritos — apaga de vez (MenuItem
        // tem soft delete; sem isto cada sincronização acumulava linhas).
        MenuItem::withTrashed()->where('restaurant_id', $restaurant->id)->forceDelete();

        foreach ($data['categories'] as $category) {
            foreach ($category['items'] as $item) {
                $menuItem = MenuItem::query()->create([
                    'restaurant_id' => $restaurant->id,
                    'menu_id' => $menu->id,
                    'name' => $item['name'],
                    'description' => $item['description'],
                    'price' => $item['price'],
                    'category' => Str::limit($category['name'], 80, ''),
                    'image_url' => $item['image'] ? ($imageMap[$item['image']] ?? null) : null,
                    'is_available' => true,
                ]);
                $this->attachIngredients($menuItem);
            }
        }
    }

    /**
     * Ingredientes reconhecidos na descrição (ver IngredientRecognizer) —
     * principais, sem preço. Devolve quantos gravou.
     */
    public function attachIngredients(MenuItem $item): int
    {
        $names = $this->ingredients->recognize($item->name, $item->description, $item->category);
        foreach ($names as $position => $name) {
            $item->ingredients()->create([
                'name' => $name,
                'removable' => true,
                'extra_price' => null,
                'position' => $position,
            ]);
        }

        return count($names);
    }

    /**
     * Tipo de cozinha a partir do nome — só um palpite para os filtros; o
     * dono corrige no perfil depois de ativar. (As categorias enganam: quase
     * todos têm uma secção de pizzas ou hambúrgueres.)
     *
     * @param  array<string, mixed>  $data
     */
    public function guessCuisine(array $data): string
    {
        $name = Str::lower(Str::ascii($data['name']));
        $rules = [
            'Pizza' => '/pizz/',
            'Japonês' => '/sushi|japon|temaki/',
            'Hambúrgueres' => '/burg(u)?er|hamburg/',
            'Grelhados' => '/churrasc|grill|grelh|parrilla|rodizio|assador|talho|steak|\bcarne\b/',
            'Angolana / Típica' => '/fuba|funge|muamba|calulu|kizaka|mufete|kitaba/',
            'Marisqueira' => '/marisq|\bmar\b|peixe|naval|beach|docas|ocean/',
            'Italiana' => '/italian|mamma mia|\botto\b|trattoria|tomato/',
            'Brasileira' => '/brasileir|kikuxi/',
            'Asiática' => '/\bpho\b|vietna|asia|chines|thai/',
            'Café / Pastelaria' => '/pastelaria|bakery|cake|cafe|coffee|padaria|doces|delicias|bolo/',
            'Bar / Lounge' => '/\bbar\b|lounge|club|pub|cigars/',
            'Hotel / Resort' => '/hotel|resort|aparthotel/',
        ];
        foreach ($rules as $cuisine => $pattern) {
            if (preg_match($pattern, $name)) {
                return $cuisine;
            }
        }

        return 'Restaurante';
    }
}
