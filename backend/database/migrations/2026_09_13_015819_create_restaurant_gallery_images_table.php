<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_gallery_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->string('url');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['restaurant_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_gallery_images');
    }
};
