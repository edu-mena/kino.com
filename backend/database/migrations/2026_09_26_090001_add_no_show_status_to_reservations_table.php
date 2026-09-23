<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `enum()` do Laravel em Postgres vira um CHECK constraint, não um tipo
 * nativo — para aceitar um novo valor é preciso recriar o constraint (ver
 * ReservationController::updateStatus / UpdateReservationStatusRequest).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE reservations DROP CONSTRAINT reservations_status_check');
        DB::statement(
            'ALTER TABLE reservations ADD CONSTRAINT reservations_status_check '.
            "CHECK (status IN ('pending', 'confirmed', 'declined', 'canceled', 'voided', 'no_show'))",
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE reservations DROP CONSTRAINT reservations_status_check');
        DB::statement(
            'ALTER TABLE reservations ADD CONSTRAINT reservations_status_check '.
            "CHECK (status IN ('pending', 'confirmed', 'declined', 'canceled', 'voided'))",
        );
    }
};
