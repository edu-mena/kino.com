<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

/** Catálogo estático dos 7 métodos de pagamento angolanos já usados no mock
 * do frontend (src/lib/mock-data.ts) — não é dado do restaurante. */
class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            ['code' => 'multicaixa_express', 'name' => 'Multicaixa Express', 'is_digital' => true, 'position' => 1],
            ['code' => 'kwik_bfa', 'name' => 'KWiK (BFA)', 'is_digital' => true, 'position' => 2],
            ['code' => 'bai_directo', 'name' => 'BAI Directo', 'is_digital' => true, 'position' => 3],
            ['code' => 'paypay_ao', 'name' => 'PayPay AO', 'is_digital' => true, 'position' => 4],
            ['code' => 'unitel_money', 'name' => 'Unitel Money', 'is_digital' => true, 'position' => 5],
            ['code' => 'bank_transfer', 'name' => 'Transferência bancária', 'is_digital' => true, 'position' => 6],
            ['code' => 'cash', 'name' => 'Numerário', 'is_digital' => false, 'position' => 7],
        ];

        foreach ($methods as $method) {
            PaymentMethod::query()->updateOrCreate(['code' => $method['code']], $method);
        }
    }
}
