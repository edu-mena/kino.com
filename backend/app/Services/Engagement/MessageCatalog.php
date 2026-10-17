<?php

namespace App\Services\Engagement;

/**
 * Os textos dos lembretes — com humor, mas sempre úteis (dizem o quê e
 * onde). Várias versões por tipo, escolhidas de forma determinística por
 * utilizador e dia: a mesma pessoa não recebe sempre a mesma frase, e um
 * teste consegue prever qual sai.
 */
class MessageCatalog
{
    /** @return array{0: string, 1: string} */
    public static function meal(string $meal, string $restaurant, ?string $dish, int $seed): array
    {
        $variants = $meal === 'lunch'
            ? ($dish
                ? [
                    ['🍽️ Hora do almoço!', "{$dish} do {$restaurant} está à sua espera. Vamos?"],
                    ['O estômago já deu sinal? 😋', "Que tal repetir {$dish} no {$restaurant}?"],
                    ['Psst… 👀', "O {$restaurant} está a funcionar e o {$dish} não se come sozinho."],
                ]
                : [
                    ['🍽️ Hora do almoço!', "O {$restaurant} está a funcionar. Vamos ver o cardápio de hoje?"],
                    ['O estômago já deu sinal? 😋', "Já sabe onde almoçar: o {$restaurant} está à sua espera."],
                ])
            : ($dish
                ? [
                    ['Já pensou no jantar? 🌙', "{$dish} do {$restaurant} resolve isso num instante."],
                    ['Jantar sem stress 😌', "Peça o seu {$dish} no {$restaurant} e descanse."],
                    ['Fim de dia merece 🍷', "Um {$dish} do {$restaurant} para fechar o dia em grande?"],
                ]
                : [
                    ['Já pensou no jantar? 🌙', "O {$restaurant} está aberto. Espreite o cardápio!"],
                    ['Jantar sem stress 😌', "Deixe a cozinha com o {$restaurant} esta noite."],
                ]);

        return self::pick($variants, $seed);
    }

    /** @return array{0: string, 1: string} */
    public static function reservationReminder(string $restaurant, string $time, int $seed): array
    {
        return self::pick([
            ['⏰ Daqui a pouco!', "A sua mesa no {$restaurant} é às {$time}. Já pode ir aquecendo o apetite 😄"],
            ['A sua mesa espera por si 🪑', "Reserva no {$restaurant} às {$time}. Até já!"],
        ], $seed);
    }

    /** @return array{0: string, 1: string} */
    public static function reviewRequest(string $restaurant, int $seed): array
    {
        return self::pick([
            ['Então, estava bom? 🤔', "Conte-nos como foi o seu pedido no {$restaurant} — 10 segundos e ajuda outros a escolher."],
            ['De 1 a 5, quanto vale? ⭐', "Avalie o seu pedido no {$restaurant}. O chef agradece (e nós também)."],
        ], $seed);
    }

    /** @return array{0: string, 1: string} */
    public static function winBack(int $days, int $seed): array
    {
        $variants = match (true) {
            $days >= 30 => [
                ['Nós não desistimos de si 💚', 'Um mês sem LUKU é muito tempo. Tem promoções à sua espera — dê uma vista de olhos!'],
                ['Estamos a ficar preocupados 🥺', 'Há um mês que não nos visita. Os seus restaurantes têm novidades!'],
            ],
            $days >= 14 => [
                ['Já são duas semanas… 👀', 'Os restaurantes perto de si mudaram o cardápio. Não quer espreitar?'],
                ['Duas semanas sem notícias 📭', 'Há pratos novos e promoções na LUKU. Venha ver!'],
            ],
            default => [
                ['O funge está com saudades suas 🥺', 'Há uma semana que não passa pela LUKU. Venha ver o que há de novo nos seus restaurantes.'],
                ['Uma semana sem si? 😢', 'Os seus restaurantes favoritos têm novidades. Espreite!'],
            ],
        };

        return self::pick($variants, $seed);
    }

    /**
     * @param  list<array{0: string, 1: string}>  $variants
     * @return array{0: string, 1: string}
     */
    private static function pick(array $variants, int $seed): array
    {
        $index = abs(crc32($seed.'|'.date('Y-m-d'))) % count($variants);

        return $variants[$index];
    }
}
