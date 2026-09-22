<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * O formulário de /parceiros nunca pediu localização exata — só
     * província (select) + endereço em texto livre, dobrado dentro de
     * `message`. Sem lat/lng, o restaurante nascia sempre sem coordenadas
     * (ver ApprovePartnerApplication::handle, Restaurant::create sem
     * `lat`/`lng`), e o cálculo real de distância/taxa de entrega
     * (DeliveryFeeCalculator) fica sem nada pra trabalhar até alguém
     * preencher isso manualmente depois em /admin/perfil. Nullable e sem
     * default: candidaturas antigas continuam válidas sem localização, o
     * formulário passa a mandar um valor sempre (mapa com pino pré-definido
     * no centro da província, ver LocationPicker), mas o backend não
     * exige.
     */
    public function up(): void
    {
        Schema::table('partner_applications', function (Blueprint $table) {
            $table->decimal('lat', 10, 7)->nullable()->after('province');
            $table->decimal('lng', 10, 7)->nullable()->after('lat');
        });
    }

    public function down(): void
    {
        Schema::table('partner_applications', function (Blueprint $table) {
            $table->dropColumn(['lat', 'lng']);
        });
    }
};
