<?php

namespace App\Services\SeededRestaurants;

/**
 * Os restaurantes gerados por `restaurants:seed-demo` — 30 em Luanda e 2 por
 * província noutras 10. Nomes fictícios; o cardápio vem de um restaurante
 * importado do menus.ao com cozinha parecida (`source`, ver
 * SeededRestaurantGenerator::SOURCES), sem as fotos (são desses
 * restaurantes).
 *
 * Os serviços variam de propósito (`profile`): cada restaurante escolhe se
 * faz entrega, só serve no local, aceita reservas… — os clientes veem que é
 * o restaurante que decide, não a Luku.
 */
class Catalog
{
    /**
     * Perfis de serviço: modos de pedido + reservas.
     *
     * @var array<string, array{modes: list<string>, reservations: bool}>
     */
    public const PROFILES = [
        'completo' => ['modes' => ['delivery', 'takeaway', 'dinein'], 'reservations' => true],
        'sala' => ['modes' => ['dinein'], 'reservations' => true],
        'entrega' => ['modes' => ['delivery'], 'reservations' => false],
        'balcao' => ['modes' => ['takeaway', 'dinein'], 'reservations' => false],
        'casa' => ['modes' => ['delivery', 'takeaway'], 'reservations' => false],
        'mesa_entrega' => ['modes' => ['delivery', 'dinein'], 'reservations' => true],
    ];

    /**
     * Horários (segunda = 0 … domingo = 6, a convenção que o painel grava).
     * `closed` = dias fechados.
     *
     * @var array<string, array{ranges: list<array{0: string, 1: string}>, closed: list<int>}>
     */
    public const HOURS = [
        'continuo' => ['ranges' => [['10:00', '23:00']], 'closed' => []],
        'almoco_jantar' => ['ranges' => [['12:00', '15:30'], ['19:00', '23:00']], 'closed' => [0]],
        'cafe' => ['ranges' => [['07:00', '20:00']], 'closed' => [6]],
        'noite' => ['ranges' => [['17:00', '23:59']], 'closed' => [0, 1]],
        'dia' => ['ranges' => [['08:00', '22:00']], 'closed' => []],
    ];

    /** @var list<list<string>> */
    public const PAYMENTS = [
        ['multicaixa_express', 'cash'],
        ['multicaixa_express', 'unitel_money', 'cash'],
        ['cash'],
        ['multicaixa_express', 'bank_transfer'],
        ['paypay_ao', 'multicaixa_express', 'cash'],
        ['multicaixa_express', 'kwik_bfa', 'bai_directo'],
    ];

    /**
     * name, cuisine, source, province, neighborhood, lat, lng, profile, hours, description
     *
     * @return list<array{name: string, cuisine: string, source: string, province: string, neighborhood: string, lat: float, lng: float, profile: string, hours: string, description: string}>
     */
    public static function all(): array
    {
        $r = fn (string $name, string $cuisine, string $source, string $province, string $neighborhood, float $lat, float $lng, string $profile, string $hours, string $description) => compact('name', 'cuisine', 'source', 'province', 'neighborhood', 'lat', 'lng', 'profile', 'hours', 'description');

        return [
            // --- Luanda (30) ---
            $r('Tasca do Mestre Zé', 'Angolana', 'angolana', 'Luanda', 'Ingombota', -8.8128, 13.2342, 'completo', 'almoco_jantar', 'Comida caseira angolana feita como em casa da avó, no coração da Baixa.'),
            $r('Sabores da Banda', 'Angolana', 'angolana', 'Luanda', 'Maianga', -8.8271, 13.2331, 'mesa_entrega', 'continuo', 'Muamba, calulu e funge todos os dias, com o tempero da banda.'),
            $r('Mukua & Companhia', 'Angolana', 'angolana', 'Luanda', 'Alvalade', -8.8379, 13.2443, 'balcao', 'dia', 'Pratos típicos e sumos naturais de múcua, para levar ou comer cá.'),
            $r('Funge de Ouro', 'Angolana', 'angolana', 'Luanda', 'Cazenga', -8.8251, 13.2948, 'entrega', 'continuo', 'Cozinha de bairro com entrega rápida em Cazenga e arredores.'),
            $r('Kizomba Grill', 'Grelhados', 'grelhados', 'Luanda', 'Talatona', -8.9176, 13.1829, 'completo', 'continuo', 'Carnes grelhadas na brasa, música ao vivo às sextas.'),
            $r('Brasa Viva Churrasqueira', 'Grelhados', 'grelhados', 'Luanda', 'Viana', -8.9031, 13.3741, 'casa', 'continuo', 'Frango e entrecosto no carvão, para levar ou receber em casa.'),
            $r('Maré Alta Marisqueira', 'Marisqueira', 'marisco', 'Luanda', 'Ilha de Luanda', -8.7951, 13.2238, 'sala', 'almoco_jantar', 'Marisco fresco com vista para o mar, na Ilha.'),
            $r('Baía Azul', 'Marisqueira', 'marisco', 'Luanda', 'Miramar', -8.8079, 13.2212, 'sala', 'almoco_jantar', 'Peixe do dia e mariscada, com a melhor vista da Baía.'),
            $r('Cais do Peixe', 'Marisqueira', 'marisco', 'Luanda', 'Mutamba', -8.8162, 13.2351, 'mesa_entrega', 'continuo', 'Grelhados de peixe e marisco a preço justo.'),
            $r('Pizzeria Bella Luanda', 'Italiana', 'italiana', 'Luanda', 'Talatona', -8.9201, 13.1872, 'completo', 'continuo', 'Pizzas em forno de lenha e massas frescas.'),
            $r('Forno di Napoli', 'Italiana', 'italiana', 'Luanda', 'Alvalade', -8.8402, 13.2461, 'casa', 'noite', 'Pizza napolitana ao fim do dia, entregue quentinha.'),
            $r('Lisboa Antiga', 'Portuguesa', 'portuguesa', 'Luanda', 'Maianga', -8.8295, 13.2318, 'sala', 'almoco_jantar', 'Bacalhau, polvo e pratos de tasca portuguesa.'),
            $r('Casa do Bacalhau', 'Portuguesa', 'portuguesa', 'Luanda', 'Patriota', -8.9801, 13.1952, 'completo', 'almoco_jantar', 'Mais de dez receitas de bacalhau e doces conventuais.'),
            $r('Burger Lab Kilamba', 'Hambúrgueres', 'fastfood', 'Luanda', 'Kilamba', -8.9962, 13.2749, 'casa', 'continuo', 'Hambúrgueres artesanais e batata frita caseira.'),
            $r('Quick Bites', 'Fast-food', 'fastfood', 'Luanda', 'Camama', -8.9398, 13.2452, 'entrega', 'continuo', 'Snacks, sandes e hambúrgueres entregues em 30 minutos.'),
            $r('Frango Dourado', 'Fast-food', 'grelhados', 'Luanda', 'Rangel', -8.8352, 13.2601, 'casa', 'continuo', 'Frango assado com piri-piri e acompanhamentos.'),
            $r('Pastelaria Doce Lar', 'Café / Pastelaria', 'cafe', 'Luanda', 'Morro Bento', -8.9302, 13.1901, 'balcao', 'cafe', 'Bolos, salgados e o café da manhã do bairro.'),
            $r('Café Mutamba', 'Café / Pastelaria', 'cafe', 'Luanda', 'Mutamba', -8.8169, 13.2361, 'balcao', 'cafe', 'Pequeno-almoço, tostas e pastelaria fresca.'),
            $r('Rodízio Gaúcho', 'Brasileira', 'brasileira', 'Luanda', 'Talatona', -8.9152, 13.1913, 'sala', 'almoco_jantar', 'Rodízio de carnes à moda do sul do Brasil.'),
            $r('Petiscaria do Largo', 'Petiscos', 'bar', 'Luanda', 'Nova Vida', -8.9101, 13.2302, 'balcao', 'noite', 'Petiscos para partilhar ao fim da tarde.'),
            $r('Rio Sabor Brasileiro', 'Brasileira', 'brasileira', 'Luanda', 'Benfica', -9.0262, 13.1912, 'completo', 'continuo', 'Feijoada, picanha e caipirinha sem álcool.'),
            $r('Picanha & Cia', 'Brasileira', 'brasileira', 'Luanda', 'Samba', -8.8561, 13.2079, 'mesa_entrega', 'continuo', 'Picanha no ponto e pratos executivos ao almoço.'),
            $r('Leblon Bistrô', 'Internacional', 'restaurante', 'Luanda', 'Miramar', -8.8091, 13.2201, 'sala', 'almoco_jantar', 'Cozinha de autor com produtos angolanos.'),
            $r('Kitanda da Avó', 'Angolana', 'angolana', 'Luanda', 'Sambizanga', -8.8001, 13.2552, 'balcao', 'dia', 'Kitanda de comida tradicional, prato do dia sempre diferente.'),
            $r('Muamba Real', 'Angolana', 'angolana', 'Luanda', 'Zango', -8.9902, 13.4701, 'entrega', 'continuo', 'A muamba mais pedida do Zango, agora com entrega.'),
            $r('Snack Bar Esquina', 'Café / Snack', 'cafe', 'Luanda', 'Alvalade', -8.8365, 13.2425, 'casa', 'dia', 'Sandes, hambúrgueres e batidos a qualquer hora.'),
            $r('Mar & Brasa', 'Marisqueira', 'marisco', 'Luanda', 'Ingombota', -8.8141, 13.2329, 'completo', 'almoco_jantar', 'Marisco e carnes grelhadas no mesmo prato.'),
            $r('Bistrô Jardim', 'Internacional', 'restaurante', 'Luanda', 'Talatona', -8.9221, 13.1851, 'completo', 'dia', 'Saladas, pratos leves e esplanada com jardim.'),
            $r('Doce Encanto', 'Pastelaria', 'cafe', 'Luanda', 'Ilha de Luanda', -8.7969, 13.2251, 'casa', 'cafe', 'Bolos de aniversário por encomenda e doces finos.'),
            $r('Cantinho do Kota', 'Petiscos', 'bar', 'Luanda', 'Cacuaco', -8.7761, 13.3701, 'balcao', 'noite', 'O ponto de encontro do bairro, com petiscos caseiros.'),

            // --- Outras províncias (2 por província) ---
            $r('Restinga do Lobito', 'Marisqueira', 'marisco', 'Benguela', 'Lobito', -12.3501, 13.5401, 'sala', 'almoco_jantar', 'Marisco à beira-mar na Restinga.'),
            $r('Sabor Benguelense', 'Angolana', 'angolana', 'Benguela', 'Benguela', -12.5765, 13.4058, 'completo', 'continuo', 'Cozinha tradicional de Benguela.'),
            $r('Planalto Grill', 'Grelhados', 'grelhados', 'Huambo', 'Huambo', -12.7762, 15.7391, 'mesa_entrega', 'continuo', 'Grelhados no planalto central.'),
            $r('Pizzaria Nova Lisboa', 'Italiana', 'italiana', 'Huambo', 'Huambo', -12.7741, 15.7421, 'casa', 'noite', 'Pizzas e massas ao jantar, com entrega.'),
            $r('Serra da Leba Restaurante', 'Angolana', 'angolana', 'Huíla', 'Lubango', -14.9178, 13.4924, 'sala', 'almoco_jantar', 'Pratos da Huíla com vista para a serra.'),
            $r('Tundavala Café', 'Café / Pastelaria', 'cafe', 'Huíla', 'Lubango', -14.9161, 13.4951, 'balcao', 'cafe', 'Café, bolos e pequenos-almoços no centro do Lubango.'),
            $r('Maiombe Sabores', 'Angolana', 'angolana', 'Cabinda', 'Cabinda', -5.5501, 12.2002, 'completo', 'continuo', 'Sabores de Cabinda, do mar à floresta.'),
            $r('Cabinda Burger', 'Hambúrgueres', 'fastfood', 'Cabinda', 'Cabinda', -5.5541, 12.1951, 'entrega', 'continuo', 'Hambúrgueres e snacks com entrega na cidade.'),
            $r('Deserto & Mar', 'Marisqueira', 'marisco', 'Namibe', 'Moçâmedes', -15.1962, 12.1521, 'sala', 'almoco_jantar', 'Onde o deserto encontra o mar — peixe fresco do Namibe.'),
            $r('Welwitschia Bistrô', 'Internacional', 'restaurante', 'Namibe', 'Moçâmedes', -15.1931, 12.1561, 'mesa_entrega', 'dia', 'Bistrô com pratos do dia e sobremesas caseiras.'),
            $r('Kalandula Grill', 'Grelhados', 'grelhados', 'Malanje', 'Malanje', -9.5401, 16.3411, 'completo', 'continuo', 'Grelhados e churrasco de domingo.'),
            $r('Palanca Negra', 'Angolana', 'angolana', 'Malanje', 'Malanje', -9.5431, 16.3381, 'balcao', 'dia', 'Comida caseira e prato do dia em Malanje.'),
            $r('Porto Amboim Marisqueira', 'Marisqueira', 'marisco', 'Cuanza Sul', 'Porto Amboim', -10.7201, 13.7601, 'sala', 'almoco_jantar', 'Marisco acabado de chegar do porto.'),
            $r('Sumbe Sabores', 'Angolana', 'angolana', 'Cuanza Sul', 'Sumbe', -11.2062, 13.8432, 'completo', 'continuo', 'Cozinha do Cuanza Sul com ingredientes da região.'),
            $r('Café do Uíge', 'Café / Pastelaria', 'cafe', 'Uíge', 'Uíge', -7.6088, 15.0612, 'balcao', 'cafe', 'Café de terra do Uíge e pastelaria fresca.'),
            $r('Kimpa Vita Restaurante', 'Angolana', 'angolana', 'Uíge', 'Uíge', -7.6111, 15.0581, 'mesa_entrega', 'continuo', 'Pratos tradicionais do norte de Angola.'),
            $r('Soyo Grill', 'Grelhados', 'grelhados', 'Zaire', 'Soyo', -6.1301, 12.3681, 'completo', 'continuo', 'Carnes e peixes grelhados no Soyo.'),
            $r("M'banza Sabores", 'Angolana', 'angolana', 'Zaire', "M'banza-Kongo", -6.2671, 14.2401, 'balcao', 'dia', 'A cozinha tradicional do antigo Reino do Kongo.'),
            $r('Kuito Pizza', 'Italiana', 'italiana', 'Bié', 'Kuito', -12.3834, 16.9332, 'casa', 'noite', 'Pizzas e lasanhas com entrega no Kuito.'),
            $r('Cuquema Restaurante', 'Angolana', 'angolana', 'Bié', 'Kuito', -12.3861, 16.9361, 'completo', 'almoco_jantar', 'Restaurante familiar com sabores do Bié.'),
        ];
    }
}
