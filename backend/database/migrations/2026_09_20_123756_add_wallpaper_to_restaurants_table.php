<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            // Imagem de fundo da página /admin/perfil e do topo público do
            // restaurante — separada de `cover_image_url` (usada na
            // listagem/carrossel). Ver src/routes/admin.perfil.tsx.
            $table->string('wallpaper_url', 2048)->nullable()->after('cover_image_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn('wallpaper_url');
        });
    }
};
