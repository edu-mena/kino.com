<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Páginas para visitantes (início, Luku, Sobre, Contacto) editáveis em
 * /sistema/conteudo, sem uma coluna por texto:
 *
 * - `guest_content`: `{texts: {chave_i18n: texto}, media: {chave: url}}` —
 *   cada texto substitui o da tradução com a mesma chave (ex.
 *   `luku.bentoTitle`), em todas as línguas; vazio = volta ao original.
 * - `luku_video_*`: o vídeo da página Luku passa pelo mesmo processamento
 *   (ffmpeg, fila) do vídeo da página Sobre, que grava em colunas — com
 *   estado próprio para não se confundir com o desse.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->json('guest_content')->nullable();
            $table->string('luku_video_url', 2048)->nullable();
            $table->string('luku_video_poster_url', 2048)->nullable();
            $table->string('luku_video_status', 20)->default('ready');
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $table->dropColumn(['guest_content', 'luku_video_url', 'luku_video_poster_url', 'luku_video_status']);
        });
    }
};
