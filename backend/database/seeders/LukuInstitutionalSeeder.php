<?php

namespace Database\Seeders;

use App\Models\Offer;
use App\Models\RestaurantStory;
use App\Models\SiteFaq;
use App\Models\SiteSetting;
use App\Models\SiteTeamMember;
use App\Models\SiteTestimonial;
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
        $this->seedSiteContent();
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

    /** Popula /sistema/conteudo com o mesmo texto que já existia hardcoded
     * em sobre.tsx/contacto.tsx/pt.ts — para o painel (e as páginas /sobre,
     * /contacto) nascerem com conteúdo em produção, não vazios, na primeira
     * vez que este seeder corre depois da migração nova. */
    private function seedSiteContent(): void
    {
        SiteSetting::current()->update([
            'contact_email' => 'ola@luku.ao',
            'contact_phone' => '+244 923 456 789',
            'contact_address' => 'Luanda, Angola',
            'contact_whatsapp' => '+244930814277',
            'about_eyebrow' => 'Sobre nós',
            'about_title' => 'O cardápio digital de Angola',
            'about_description' => 'A Luku nasceu em Luanda para ligar restaurantes e clientes '.
                'num só lugar: pratos, preços, mesas e promoções, sempre à mão — sem ligações, '.
                'sem cardápios de papel. Hoje a nossa ambição é maior: levar essa mesma '.
                'experiência a restaurantes e clientes em todo o país.',
        ]);

        $team = [
            ['name' => 'Christopher Rosinho', 'role' => 'CEO', 'initials' => 'CR', 'position' => 1],
            ['name' => 'Eduardo Mena', 'role' => 'CTO', 'initials' => 'EM', 'position' => 2],
        ];
        foreach ($team as $member) {
            SiteTeamMember::query()->updateOrCreate(['name' => $member['name']], $member);
        }

        $testimonials = [
            [
                'name' => 'Carla Mendes',
                'role' => 'Cliente',
                'quote' => 'Nunca mais liguei para reservar mesa. Vejo o cardápio, os preços e '.
                    'agendo tudo pela Luku.',
                'initials' => 'CM',
                'position' => 1,
            ],
            [
                'name' => 'João Paulo',
                'role' => 'Dono do Forno da Ilha',
                'quote' => 'Trocámos os cardápios de papel por um QR Code. Os clientes adoraram '.
                    'e nós poupamos tempo todos os dias.',
                'initials' => 'JP',
                'position' => 2,
            ],
            [
                'name' => 'Inês Neto',
                'role' => 'Cliente',
                'quote' => 'Personalizo o pedido do jeito que quero, sem trocas de mensagem. É '.
                    'simples assim.',
                'initials' => 'IN',
                'position' => 3,
            ],
        ];
        foreach ($testimonials as $testimonial) {
            SiteTestimonial::query()->updateOrCreate(['name' => $testimonial['name']], $testimonial);
        }

        $faqs = [
            [
                'question' => 'A Luku faz entregas?',
                'answer' => 'A Luku é, antes de tudo, o cardápio digital de um restaurante. A '.
                    'entrega é uma funcionalidade opcional que cada restaurante ativa se quiser '.
                    'oferecer — nem todos entregam.',
                'position' => 1,
            ],
            [
                'question' => 'É grátis para usar como cliente?',
                'answer' => 'Sim. Explorar cardápios, reservar mesas e fazer pedidos na Luku não '.
                    'tem qualquer custo para o cliente.',
                'position' => 2,
            ],
            [
                'question' => 'Como coloco o meu restaurante na Luku?',
                'answer' => 'Escolha "Sou restaurante / Parceria" no formulário abaixo ou visite '.
                    'a página de parceiros — a nossa equipa entra em contacto para configurar o '.
                    'seu cardápio digital.',
                'position' => 3,
            ],
            [
                'question' => 'Posso personalizar os meus pedidos?',
                'answer' => 'Sim, sempre que o restaurante disponibilizar essa opção você pode '.
                    'escolher os ingredientes do seu prato antes de finalizar o pedido.',
                'position' => 4,
            ],
            [
                'question' => 'Quanto tempo demora o suporte a responder?',
                'answer' => 'A nossa equipa costuma responder em até 24 horas úteis, por email '.
                    'ou telefone.',
                'position' => 5,
            ],
        ];
        foreach ($faqs as $faq) {
            SiteFaq::query()->updateOrCreate(['question' => $faq['question']], $faq);
        }
    }
}
