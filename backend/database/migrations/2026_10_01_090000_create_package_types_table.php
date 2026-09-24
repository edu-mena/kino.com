<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de tipos de pacote (Aniversário, Reunião de Negócios, Amigos,
 * Feriados...) — gerido pela equipa Luku em `/sistema/pacotes`, nunca pelo
 * restaurante (esse só ESCOLHE quais oferece, ver `restaurant_packages`,
 * Fase L3b). `name` único: chave estável para o seed inicial (updateOrCreate)
 * e evita dois tipos com o mesmo nome a confundir o cliente na descoberta.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('package_types', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->string('icon')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('package_types');
    }
};
