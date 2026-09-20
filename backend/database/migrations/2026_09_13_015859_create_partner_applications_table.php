<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partner_applications', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->string('restaurant_name');
            $table->string('owner_name');
            $table->string('phone');
            $table->string('email');
            $table->string('province')->nullable();
            $table->text('message')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            // Preenchido pela ação de aprovação (cria restaurants+
            // restaurant_subscriptions+users+restaurant_users numa
            // transação) — ver App\Actions\ApprovePartnerApplication.
            $table->foreignId('created_restaurant_id')->nullable()->constrained('restaurants')->nullOnDelete();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_applications');
    }
};
