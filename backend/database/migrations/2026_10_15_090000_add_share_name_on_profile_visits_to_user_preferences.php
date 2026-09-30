<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Quem viu o seu perfil" (auditoria de segurança, Fase 4): o restaurante
 * via o NOME de cada cliente com sessão que lhe abria o perfil, sem aviso
 * nem forma de o evitar. Passa a ver só de quem o segue ou de quem ligar
 * isto — desligado por omissão (consentimento explícito, Lei n.º 22/11).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->boolean('share_name_on_profile_visits')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->dropColumn('share_name_on_profile_visits');
        });
    }
};
