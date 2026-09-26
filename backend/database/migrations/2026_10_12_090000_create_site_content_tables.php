<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Conteúdo institucional editável em /sistema/conteudo (contacto, "sobre
 * nós", equipa, testemunhos, FAQ) — hoje hardcoded em sobre.tsx/contacto.tsx
 * e no i18n. `site_settings` é singleton (id=1, mesmo padrão de
 * DeliveryPolicy::current()). As outras três são listas ordenáveis
 * (`position`, mesmo padrão de `package_types`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            // 'id' fillable no model (ver DeliveryPolicy) — singleton id=1.
            $table->id();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_address')->nullable();
            $table->string('contact_whatsapp')->nullable();
            $table->string('about_eyebrow')->nullable();
            $table->string('about_title')->nullable();
            $table->text('about_description')->nullable();
            // Mesmos nomes/semântica de Offer.image_url/media_type/
            // thumbnail_url/processing_status — para reaproveitar
            // MediaUploadService + ProcessUploadedVideoJob sem adaptação
            // (o job assume a coluna 'processing_status' literalmente).
            $table->string('about_hero_image_url')->nullable();
            $table->enum('about_hero_media_type', ['image', 'video'])->default('image');
            $table->string('about_hero_thumbnail_url')->nullable();
            $table->string('processing_status')->default('ready');
            $table->timestamps();
        });

        Schema::create('site_team_members', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->string('name');
            $table->string('role');
            $table->string('initials', 4)->nullable();
            $table->string('photo_url')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('site_testimonials', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->string('name');
            $table->string('role');
            $table->text('quote');
            $table->string('initials', 4)->nullable();
            $table->string('photo_url')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('site_faqs', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->string('question');
            $table->text('answer');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_faqs');
        Schema::dropIfExists('site_testimonials');
        Schema::dropIfExists('site_team_members');
        Schema::dropIfExists('site_settings');
    }
};
