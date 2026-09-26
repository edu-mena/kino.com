<?php

/**
 * Planos de subscrição do restaurante — Pro (mais barato, limitado) e Plus
 * (tudo liberado). Fonte única da verdade: ao contrário de `package_types`/
 * `payment_methods` (catálogos que crescem sem deploy, geridos pela equipa
 * via `/sistema`), isto é preço/negócio — muda por code review + deploy, de
 * propósito, não por uma UI de sistema.
 *
 * `limits`: `null` = sem tecto. `features`: tudo-ou-nada, sem contagem.
 */
return [
    'pro' => [
        'price' => 9999,
        'limits' => [
            'stories' => 2,
            'offers' => 2,
            'reservations_per_month' => 20,
        ],
        'features' => [
            'packages' => false,
            'customers' => false,
            'stats' => false,
        ],
    ],

    'plus' => [
        'price' => 12999,
        'limits' => [
            'stories' => null,
            'offers' => null,
            'reservations_per_month' => null,
        ],
        'features' => [
            'packages' => true,
            'customers' => true,
            'stats' => true,
        ],
    ],
];
