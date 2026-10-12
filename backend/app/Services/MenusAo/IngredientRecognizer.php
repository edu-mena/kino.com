<?php

namespace App\Services\MenusAo;

use App\Support\IngredientCatalog;
use Illuminate\Support\Str;

/**
 * Reconhece ingredientes do catálogo da Luku no nome e na descrição de um
 * prato importado ("Frango, picanha, chouriço, batata com maionese de
 * alho" → Frango, Picanha, Chouriço, Batata, Maionese, Alho…). Precisão
 * antes de cobertura: só nomes do catálogo, palavra inteira; o que vem
 * depois de "sem" não conta; um nome contido noutro já reconhecido
 * ("Tomate" em "Molho de Tomate") não se repete. Bebidas ficam de fora —
 * "uvas Touriga Nacional" não é um ingrediente de um vinho.
 *
 * Os ingredientes vão como PRINCIPAIS (`removable = true`, sem preço): é
 * isso que liga os avisos de dieta. Extras pagos não se adivinham.
 */
class IngredientRecognizer
{
    /** Genéricos que dariam mais ruído do que informação. */
    private const IGNORED = ['Sal', 'Fermento', 'Açúcar', 'Café', 'Chá', 'Sumo Natural', 'Água com Gás'];

    private const DRINK_CATEGORIES = '/vinho|cerveja|whisk|\bgin|vodka|vodca|\brum\b|cognac|conhaque|licor|espumante|champa|sangria|cocktail|bebida|refrigerante|drink|sumo|\baguas?\b|\bcafes?\b|\bchas?\b|bagaceira|brandy|vermute|aguardente|\bshots?\b|aperitivo|digestivo/';

    /** @var list<array{name: string, norm: string, pattern: string}>|null */
    private ?array $catalog = null;

    public function isDrinkCategory(?string $category): bool
    {
        return (bool) preg_match(self::DRINK_CATEGORIES, $this->normalize((string) $category));
    }

    /**
     * @return list<string> nomes do catálogo, pela ordem em que aparecem no texto
     */
    public function recognize(string $name, ?string $description, ?string $category = null): array
    {
        if ($this->isDrinkCategory($category)) {
            return [];
        }
        $text = ' '.$this->normalize($name.' '.$description).' ';

        $found = [];
        foreach ($this->catalog() as $entry) {
            if (! preg_match_all($entry['pattern'], $text, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }
            foreach ($matches[0] as [$match, $offset]) {
                if ($this->negated($text, $offset)) {
                    continue;
                }
                $found[] = ['name' => $entry['name'], 'norm' => $entry['norm'], 'offset' => $offset];
                break;
            }
        }

        // Mais compridos primeiro: "Molho de Tomate" ganha a "Tomate".
        usort($found, fn ($a, $b) => mb_strlen($b['norm']) <=> mb_strlen($a['norm']));
        $kept = [];
        foreach ($found as $candidate) {
            foreach ($kept as $longer) {
                if (str_contains($longer['norm'], $candidate['norm'])) {
                    continue 2;
                }
            }
            $kept[] = $candidate;
        }
        usort($kept, fn ($a, $b) => $a['offset'] <=> $b['offset']);

        return array_slice(array_column($kept, 'name'), 0, 12);
    }

    /** "… sem cebola", "sem a cebola" → não conta. */
    private function negated(string $text, int $offset): bool
    {
        $before = substr($text, max(0, $offset - 12), min(12, $offset));

        return (bool) preg_match('/\bsem\s+(?:\w+\s+)?$/', $before);
    }

    private function normalize(string $text): string
    {
        return preg_replace('/\s+/', ' ', Str::lower(Str::ascii($text))) ?? '';
    }

    /** @return list<array{name: string, norm: string, pattern: string}> */
    private function catalog(): array
    {
        if ($this->catalog !== null) {
            return $this->catalog;
        }
        $this->catalog = [];
        foreach (IngredientCatalog::NAMES as $name) {
            if (in_array($name, self::IGNORED, true)) {
                continue;
            }
            $norm = $this->normalize($name);
            // Palavra inteira, aceita plural simples ("cogumelo(s)", "ovos").
            $this->catalog[] = [
                'name' => $name,
                'norm' => $norm,
                'pattern' => '/(?<![a-z])'.preg_quote($norm, '/').'(?:s|es)?(?![a-z])/',
            ];
        }

        return $this->catalog;
    }
}
