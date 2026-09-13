<?php

namespace Database\Seeders;

use App\Models\Offer;
use App\Models\RestaurantStory;
use Illuminate\Database\Seeder;

/**
 * Conteúdo institucional da própria Luku (restaurant_id=null) — promoções
 * globais e stories de apresentação da marca. Copy abaixo é rascunho técnico
 * (estrutura/objetivo), não copy final de marketing — ver plano, secção
 * "Seed de conteúdo institucional Luku". Imagens são placeholders a
 * substituir por assets reais antes de produção.
 */
class LukuInstitutionalSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedOffers();
        $this->seedStories();
    }

    private function seedOffers(): void
    {
        $offers = [
            [
                'type' => 'discount',
                'title' => '20% de desconto Luku',
                'description' => 'Use o código LUKU20 no seu primeiro pedido em qualquer restaurante parceiro.',
                'code' => 'LUKU20',
                'percent_off' => 20,
                'layout' => 'split',
                'starts_at' => now(),
                'ends_at' => now()->addDays(30), // valida o job de expiração
            ],
            [
                'type' => 'delivery',
                'title' => 'Entrega grátis Luku',
                'description' => 'Peça com o código LUKUFRETE e não pague taxa de entrega.',
                'code' => 'LUKUFRETE',
                'percent_off' => null,
                'layout' => 'cover',
                'starts_at' => now(),
                'ends_at' => null, // permanente
            ],
            [
                'type' => 'happy-hour',
                'title' => 'Happy hour Luku',
                'description' => 'Use HAPPY15 e ganhe 15% de desconto em restaurantes participantes.',
                'code' => 'HAPPY15',
                'percent_off' => 15,
                'layout' => 'split',
                'starts_at' => now(),
                'ends_at' => null,
            ],
        ];

        foreach ($offers as $offer) {
            Offer::query()->updateOrCreate(
                ['code' => $offer['code']],
                [...$offer, 'restaurant_id' => null, 'media_type' => 'image'],
            );
        }
    }

    private function seedStories(): void
    {
        // Substitui createdAt por "agora" a cada seed — igual ao
        // `seedEpoch()` do mock, para as stories nunca nascerem já expiradas
        // numa demo/ambiente novo.
        $stories = [
            // Boas-vindas / apresentação do rebranding Kino -> Luku.
            'https://cdn.luku.com/institutional/placeholder-boas-vindas.jpg',
            // Como funciona — reserva/pedido em 3 passos.
            'https://cdn.luku.com/institutional/placeholder-como-funciona.jpg',
            // Dica de segurança de pagamento — Luku não processa pagamento,
            // atenção a comprovativos falsos.
            'https://cdn.luku.com/institutional/placeholder-seguranca-pagamento.jpg',
            // Convite a restaurantes parceiros.
            'https://cdn.luku.com/institutional/placeholder-convite-parceiros.jpg',
        ];

        foreach ($stories as $mediaUrl) {
            RestaurantStory::query()->firstOrCreate(
                ['restaurant_id' => null, 'media_url' => $mediaUrl],
                ['media_type' => 'image'],
            );
        }
    }
}
