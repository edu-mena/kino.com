<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_id')->constrained('restaurant_menus')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('category');
            $table->string('image_url')->nullable();
            $table->boolean('is_available')->default(true);
            $table->string('portion_info')->nullable();
            $table->unsignedInteger('prep_time_minutes')->nullable();
            $table->boolean('is_promoted')->default(false);
            $table->string('promotion_label')->nullable();
            $table->timestamps();
            // Soft delete: order_lines guardam snapshot do nome/preço, por
            // isso sobrevivem à remoção do prato (ver order_lines.menu_item_id
            // nullable + snapshots).
            $table->softDeletes();

            $table->index(['restaurant_id', 'menu_id']);
            $table->index('category');
            $table->index('is_available');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
