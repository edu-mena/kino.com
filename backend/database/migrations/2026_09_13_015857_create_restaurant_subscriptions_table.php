<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_subscriptions', function (Blueprint $table) {
            // 1:1 com restaurants — PK é a própria FK.
            $table->foreignId('restaurant_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('plan')->default('luku');
            $table->timestamp('started_at');
            $table->timestamp('trial_ends_at');
            $table->enum('status', ['trial', 'active', 'overdue', 'suspended'])->default('trial');
            $table->timestamp('last_payment_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_subscriptions');
    }
};
