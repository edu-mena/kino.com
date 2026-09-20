<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Upload de imagem é síncrono (rápido, resolve na resposta do POST).
     * Vídeo (stories + ofertas, únicos media_type que aceitam vídeo) vai por
     * fila Redis (ProcessUploadedVideoJob, ffmpeg) — o recurso nasce com
     * `processing_status = processing` e o cliente faz polling do GET até
     * `ready` (ou trata `failed`). Default 'ready': imagem nunca passa por
     * 'processing', não precisa de tocar neste campo.
     */
    public function up(): void
    {
        Schema::table('restaurant_stories', function (Blueprint $table) {
            $table->enum('processing_status', ['ready', 'processing', 'failed'])
                ->default('ready')->after('media_type');
        });

        Schema::table('offers', function (Blueprint $table) {
            $table->enum('processing_status', ['ready', 'processing', 'failed'])
                ->default('ready')->after('media_type');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_stories', function (Blueprint $table) {
            $table->dropColumn('processing_status');
        });
        Schema::table('offers', function (Blueprint $table) {
            $table->dropColumn('processing_status');
        });
    }
};
