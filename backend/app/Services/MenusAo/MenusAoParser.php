<?php

namespace App\Services\MenusAo;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Str;

/**
 * Lê o HTML público do menus.ao (sem estado, sem rede — testável com
 * fixtures). Estrutura de cada restaurante: `/{slug}` (nome, capa,
 * logótipo, horário, contactos no topo), `/{slug}/contactos` (morada, email,
 * telefone, coordenadas do mapa) e `/{slug}/menu` (categorias + pratos com
 * `data-nome`/`data-descricao`/`data-preco`/`data-imagem`).
 *
 * Imagens "default" do menus.ao (sem foto/logótipo) são ignoradas.
 */
class MenusAoParser
{
    public const BASE_URL = 'https://www.menus.ao';

    /** Caminhos do menus.ao que não são restaurantes. */
    private const NOT_RESTAURANTS = ['aderir', 'restaurantes', 'pagina', 'admin-panel', 'themes'];

    /** Províncias como a app as escreve (src/data/restaurant-coordinates.ts). */
    private const PROVINCES = [
        'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango', 'Cuanza Norte', 'Cuanza Sul',
        'Cunene', 'Huambo', 'Huíla', 'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico',
        'Namibe', 'Uíge', 'Zaire',
    ];

    /** Cidades/zonas frequentes que não têm o nome da província no texto. */
    private const CITY_PROVINCE = [
        'lubango' => 'Huíla', 'lobito' => 'Benguela', 'catumbela' => 'Benguela', 'soyo' => 'Zaire',
        'mbanza' => 'Zaire', 'sumbe' => 'Cuanza Sul', 'porto amboim' => 'Cuanza Sul',
        'ndalatando' => 'Cuanza Norte', 'saurimo' => 'Lunda Sul', 'dundo' => 'Lunda Norte',
        'luena' => 'Moxico', 'menongue' => 'Cuando Cubango', 'ondjiva' => 'Cunene',
        'mocamedes' => 'Namibe', 'kuito' => 'Bié', 'caxito' => 'Bengo',
    ];

    private const WEEKDAYS = [
        'domingo' => 0, 'segunda' => 1, 'terca' => 2, 'quarta' => 3,
        'quinta' => 4, 'sexta' => 5, 'sabado' => 6,
    ];

    /**
     * Lista de `/restaurantes`.
     *
     * @return list<array{slug: string, name: string, location: ?string, image: ?string}>
     */
    public function directory(string $html): array
    {
        $xp = $this->xpath($html);
        $out = [];
        foreach ($xp->query("//div[contains(@class,'destaque-caixa')]//a[@href]") as $a) {
            /** @var DOMElement $a */
            $slug = $this->slugFromUrl($a->getAttribute('href'));
            if ($slug === null || isset($out[$slug])) {
                continue;
            }
            $name = $this->text($xp, ".//div[contains(@class,'destaque-titulo')]", $a);
            $location = $this->text($xp, ".//div[contains(@class,'destaque-titulo')]/following-sibling::div[1]", $a);
            $img = $xp->query('.//img', $a)->item(0);
            $out[$slug] = [
                'slug' => $slug,
                'name' => $name ?: Str::headline($slug),
                'location' => $location ?: null,
                'image' => $img instanceof DOMElement ? $this->image($img->getAttribute('src')) : null,
            ];
        }

        return array_values($out);
    }

    /**
     * Página inicial do restaurante.
     *
     * @return array{name: ?string, cover: ?string, logo: ?string, email: ?string, phone: ?string, opensAt: ?string, closesAt: ?string, closedWeekdays: list<int>, instagram: ?string}
     */
    public function home(string $html): array
    {
        $xp = $this->xpath($html);
        $section = $xp->query("//section[@id='restaurante']")->item(0);
        $cover = null;
        if ($section instanceof DOMElement
            && preg_match('/url\(\s*[\'"]?([^\'")]+)/', $section->getAttribute('style'), $m)) {
            $cover = $this->image($m[1]);
        }
        $logo = $xp->query("//*[contains(@class,'navbar-brand')]//img")->item(0);
        $topbar = $this->text($xp, "//section[@id='topbar']//div[contains(@class,'contact-info')]") ?? '';

        // Rodapé: 1.º `.titulo` = horário (texto livre), 2.º = "ENCERRA …".
        $hoursText = '';
        $closedText = '';
        foreach ($xp->query("//footer//div[contains(@class,'titulo')]") as $node) {
            $text = $this->clean($node->textContent);
            if (preg_match('/^ENCERRA\b\s*(.*)$/iu', $text, $m)) {
                $closedText = $m[1];
            } elseif ($hoursText === '') {
                $hoursText = $text;
            }
        }

        // Só se aceita um horário inequívoco: um intervalo para todos os dias
        // e dias de fecho limpos. Horários por dia ("3.ª a 5.ª das 8h às 20h;
        // 6.ª…"), fechos parciais ("Segunda ao jantar") ou temporários ficam
        // por definir pelo dono — um horário errado faria o restaurante
        // aparecer "fechado" e bloquear pedidos.
        [$opens, $closes] = $this->hours($hoursText);
        $closed = $this->closedDays($closedText);
        if ($closed === null) {
            $opens = $closes = null;
            $closed = [];
        }

        $instagram = null;
        $ig = $xp->query("//a[contains(@class,'instagram')]")->item(0);
        if ($ig instanceof DOMElement) {
            $handle = trim(preg_replace('#^https?://(www\.)?instagram\.com/#i', '', $ig->getAttribute('href')), '/@ ');
            $instagram = preg_match('/^[A-Za-z0-9._]{2,40}$/', $handle) ? $handle : null;
        }

        return [
            'name' => $this->text($xp, "//section[@id='restaurante']//h1"),
            'cover' => $cover,
            'logo' => $logo instanceof DOMElement ? $this->image($logo->getAttribute('src')) : null,
            'email' => $this->email($topbar),
            'phone' => $this->phone($topbar),
            'opensAt' => $opens,
            'closesAt' => $closes,
            'closedWeekdays' => $opens ? $closed : [],
            'instagram' => $instagram,
        ];
    }

    /**
     * `/contactos`.
     *
     * @return array{address: ?string, email: ?string, phone: ?string, lat: ?float, lng: ?float}
     */
    public function contacts(string $html): array
    {
        $xp = $this->xpath($html);
        $fields = [];
        foreach ($xp->query("//div[contains(@class,'info-box')]") as $box) {
            $label = Str::lower(Str::ascii($this->text($xp, './/h3', $box) ?? ''));
            $value = $this->text($xp, './/p', $box);
            if ($label !== '' && $value) {
                $fields[$label] = $value;
            }
        }
        $address = $fields['endereco'] ?? null;
        if ($address) {
            $address = trim(preg_replace('/\s*\|\s*Angola\s*$/iu', '', $address)) ?: null;
        }

        $lat = $lng = null;
        $map = $xp->query("//iframe[@id='gmap_canvas']")->item(0);
        if ($map instanceof DOMElement
            && preg_match('/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/', $map->getAttribute('src'), $m)) {
            $lat = (float) $m[1];
            $lng = (float) $m[2];
            // Fora de Angola = coordenada de exemplo/lixo, não serve.
            if ($lat < -18.5 || $lat > -4 || $lng < 11.5 || $lng > 24.5) {
                $lat = $lng = null;
            }
        }

        return [
            'address' => $address,
            'email' => $this->email($fields['email'] ?? ''),
            'phone' => $this->phone($fields['contacto'] ?? ''),
            'lat' => $lat,
            'lng' => $lng,
        ];
    }

    /**
     * `/menu` — categorias pela ordem da página; categorias repetidas (o
     * menus.ao mostra primeiro os destaques de uma categoria e depois o
     * resto, com o mesmo cabeçalho) são juntadas. Pratos sem preço ficam
     * de fora e são contados em `skipped`.
     *
     * @return array{categories: list<array{name: string, items: list<array{name: string, description: ?string, price: float, image: ?string, featured: bool}>}>, skipped: int}
     */
    public function menu(string $html): array
    {
        $xp = $this->xpath($html);
        $categories = [];
        $current = null;
        $skipped = 0;
        $nodes = $xp->query("//div[contains(concat(' ', normalize-space(@class), ' '), ' categoria ')] | //div[contains(concat(' ', normalize-space(@class), ' '), ' linha-produto ')]");

        foreach ($nodes as $node) {
            /** @var DOMElement $node */
            $classes = ' '.preg_replace('/\s+/', ' ', $node->getAttribute('class')).' ';
            if (str_contains($classes, ' categoria ')) {
                $current = $this->clean($node->textContent);

                continue;
            }

            $name = $this->clean(html_entity_decode($node->getAttribute('data-nome'), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            // "IVA 7%" e afins não são pratos — são avisos postos como produto.
            if ($name === '' || preg_match('/^iva\b/i', $name)) {
                continue;
            }
            $price = $this->price($node->getAttribute('data-preco'));
            if ($price === null) {
                $skipped++;

                continue;
            }
            $category = $current ?: 'Destaques';
            $key = mb_strtolower($category);
            $categories[$key] ??= ['name' => $category, 'items' => []];

            $item = [
                'name' => Str::limit($name, 150, ''),
                'description' => $this->description($node->getAttribute('data-descricao')),
                'price' => $price,
                'image' => $this->image($node->getAttribute('data-imagem')),
                'featured' => str_contains($classes, ' linha-produto-destaque '),
            ];
            $duplicate = collect($categories[$key]['items'])
                ->contains(fn ($i) => mb_strtolower($i['name']) === mb_strtolower($item['name']) && $i['price'] === $item['price']);
            if (! $duplicate) {
                $categories[$key]['items'][] = $item;
            }
        }

        return [
            'categories' => array_values(array_filter($categories, fn ($c) => $c['items'] !== [])),
            'skipped' => $skipped,
        ];
    }

    /** Província a partir da morada/localização (por omissão Luanda — a
     * esmagadora maioria do menus.ao). */
    public function province(?string ...$texts): string
    {
        $haystack = ' '.Str::lower(Str::ascii(implode(' ', array_filter($texts)))).' ';
        foreach (self::PROVINCES as $province) {
            $needle = Str::lower(Str::ascii($province));
            if (preg_match('/\b'.preg_quote($needle, '/').'\b/', $haystack)) {
                return $province;
            }
        }
        foreach (self::CITY_PROVINCE as $city => $province) {
            if (preg_match('/\b'.preg_quote($city, '/').'\b/', $haystack)) {
                return $province;
            }
        }

        return 'Luanda';
    }

    /** "88 550,00" / "1.500,00" / "1500" → float; vazio ou zero → null. */
    public function price(string $raw): ?float
    {
        $s = preg_replace('/[^\d,.]/', '', html_entity_decode($raw, ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '';
        if ($s === '') {
            return null;
        }
        if (str_contains($s, ',') && str_contains($s, '.')) {
            $s = str_replace('.', '', $s);
            $s = str_replace(',', '.', $s);
        } elseif (str_contains($s, ',')) {
            $s = str_replace(',', '.', $s);
        } elseif (preg_match('/\.\d{3}$/', $s)) {
            $s = str_replace('.', '', $s);
        }
        $value = (float) $s;

        return $value > 0 ? round($value, 2) : null;
    }

    public function slugFromUrl(string $href): ?string
    {
        if (! preg_match('#^(?:https?://(?:www\.)?menus\.ao)?/([a-z0-9-]+)/?$#i', trim($href), $m)) {
            return null;
        }
        $slug = strtolower($m[1]);

        return in_array($slug, self::NOT_RESTAURANTS, true) ? null : $slug;
    }

    // ── Auxiliares ──────────────────────────────────────────────────────

    private function xpath(string $html): DOMXPath
    {
        $dom = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $dom->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return new DOMXPath($dom);
    }

    private function text(DOMXPath $xp, string $query, ?\DOMNode $context = null): ?string
    {
        $node = $xp->query($query, $context)->item(0);
        if (! $node) {
            return null;
        }
        $text = $this->clean($node->textContent);

        return $text === '' ? null : $text;
    }

    private function clean(string $text): string
    {
        $text = str_replace("\u{00A0}", ' ', $text);

        return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    }

    private function description(string $raw): ?string
    {
        $text = html_entity_decode($raw, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('#<br\s*/?>#i', "\n", $text) ?? '';
        $text = strip_tags($text);
        $lines = array_filter(array_map(fn ($l) => $this->clean($l), explode("\n", $text)), fn ($l) => $l !== '');
        $text = implode("\n", $lines);

        return $text === '' ? null : Str::limit($text, 1000, '…');
    }

    /** URL absoluto de imagem real; "default"/vazio → null. */
    private function image(?string $src): ?string
    {
        $src = trim((string) $src);
        if ($src === '' || str_contains(strtolower(basename(parse_url($src, PHP_URL_PATH) ?? '')), 'default')) {
            return null;
        }
        if (str_starts_with($src, '//')) {
            $src = 'https:'.$src;
        } elseif (str_starts_with($src, '/')) {
            $src = self::BASE_URL.$src;
        }

        return str_starts_with($src, 'http') && str_contains($src, '/upload/') ? $src : null;
    }

    private function email(string $text): ?string
    {
        return preg_match('/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/', $text, $m) ? strtolower($m[0]) : null;
    }

    /** Primeiro número de telefone angolano (9 dígitos, opcional +244). */
    private function phone(string $text): ?string
    {
        if (! preg_match('/(?<![\d+])(?:\+?244[\s-]?)?(9\d{2})[\s-]?(\d{3})[\s-]?(\d{3})(?!\d)/', $text, $m)) {
            return null;
        }
        // Números de enchimento ("999999999") não servem para contactar.
        if (preg_match('/^(\d)\1+$/', $m[1].$m[2].$m[3])) {
            return null;
        }

        return "+244 {$m[1]} {$m[2]} {$m[3]}";
    }

    /**
     * "12:00 / 23:00", "das 11h às 23h", "07H30 - 22H00", "8 às 21", "10/23",
     * "13-22h", "12h as 22h:30m"… → ["HH:MM", "HH:MM"]. Só UM intervalo e
     * sem dias da semana no texto; senão [null, null].
     *
     * @return array{0: ?string, 1: ?string}
     */
    public function hours(string $text): array
    {
        $t = Str::lower(Str::ascii($text));
        if ($t === '' || preg_match('/segunda|terca|quarta|quinta|sexta|sabado|domingo|feira|fds|semana|;/', $t)) {
            return [null, null];
        }
        $pattern = '/(?<!\d)(\d{1,2})(?:\s*[:.h]\s*(\d{2}))?\s*(?:horas?|h)?\s*(?:-|\/|\ba\b|\bas\b|\bate\b)\s*(\d{1,2})(?:\s*[:.h]\s*:?(\d{2}))?(?!\d)/';
        if (preg_match_all($pattern, $t, $all, PREG_SET_ORDER) !== 1) {
            return [null, null];
        }
        [, $h1, $m1, $h2] = $all[0];
        $m2 = $all[0][4] ?? '';
        $fmt = function (string $h, string $m): ?string {
            $hour = (int) $h;
            $min = $m === '' ? 0 : (int) $m;
            if ($hour > 24 || $min > 59) {
                return null;
            }

            return sprintf('%02d:%02d', $hour % 24, $min);
        };
        $open = $fmt($h1, $m1);
        $close = $fmt($h2, $m2);

        return $open && $close && $open !== $close ? [$open, $close] : [null, null];
    }

    /**
     * Texto do "ENCERRA": [] = não fecha; [1] / [0, 1] = fecha nesses dias;
     * `null` = ambíguo (fecho parcial, horas, "temporariamente"…).
     *
     * @return list<int>|null
     */
    public function closedDays(string $text): ?array
    {
        $t = trim(Str::lower(Str::ascii($text)), " \t-.:");
        if ($t === '' || preg_match('/^(nao( tem| encerra)?|nenhum|0|abrimos todos os dias|aberto todos os dias)$/', $t)) {
            return [];
        }
        if (preg_match('/\d|jantar|almoco|manha|tarde|noite|temporari|encerrad|\bdas\b|\bate\b/', $t)) {
            return null;
        }
        $days = [];
        foreach (self::WEEKDAYS as $word => $day) {
            if (str_contains($t, $word)) {
                $days[] = $day;
            }
        }
        // Só nomes de dias e ligações ("e", ",", "-feira", "/").
        $leftover = trim(preg_replace('/(segunda|terca|quarta|quinta|sexta|sabado|domingo|feiras?|\be\b|[,\/\-\s])+/', ' ', $t));

        return $days !== [] && $leftover === '' ? $days : null;
    }
}
