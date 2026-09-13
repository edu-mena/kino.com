<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_stories', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            // Nullable (mudança de schema face ao mock, mesmo padrão de
            // `offers.restaurant_id`) — NULL = story institucional da Luku.
            $table->foreignId('restaurant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('media_url');
            $table->enum('media_type', ['image', 'video'])->default('image');
            $table->unsignedInteger('duration_sec')->nullable();
            $table->timestamps();
            // TTL de 24h aplicado por ExpireStoriesJob (soft delete físico,
            // scheduler a cada 15min) — não mais calculado no cliente.
            $table->softDeletes();

            $table->index('restaurant_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_stories');
    }
};
