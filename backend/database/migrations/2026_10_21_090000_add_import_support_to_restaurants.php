<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Restaurantes pré-cadastrados a partir de cardápios públicos (menus.ao):
 * existem no sistema com cardápio completo mas NÃO são públicos até um
 * operador os ativar (`is_published`). `restaurant_imports` guarda de onde
 * vieram e os contactos recolhidos — privados, nunca no recurso público.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->boolean('is_published')->default(true)->after('is_demo');
            $table->index('is_published');
        });

        Schema::create('restaurant_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('source', 32);
            $table->string('source_slug', 160);
            $table->string('source_url', 500);
            $table->string('contact_phone', 60)->nullable();
            $table->string('contact_email', 190)->nullable();
            $table->string('source_location', 255)->nullable();
            // Contagens da última sincronização (pratos, categorias, fotos).
            $table->json('stats')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('discarded_at')->nullable();
            $table->timestamps();

            $table->unique(['source', 'source_slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_imports');

        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropIndex(['is_published']);
            $table->dropColumn('is_published');
        });
    }
};
