<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            // Convidado sem conta: user_id fica null e guest_token identifica
            // a reserva para consulta pública pontual (GET /reservations/guest/{token}).
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('guest_token')->nullable()->unique();

            $table->string('customer_name');
            $table->string('customer_phone');
            $table->string('customer_email')->nullable();

            $table->date('date');
            $table->time('time');
            $table->unsignedInteger('people_count');

            $table->decimal('caution_amount', 10, 2)->default(0);
            $table->enum('caution_status', ['not_required', 'pending', 'paid', 'refunded'])->default('not_required');

            $table->enum('status', ['pending', 'confirmed', 'declined', 'canceled', 'voided'])->default('pending');
            $table->timestamp('status_updated_at')->nullable();

            $table->foreignId('table_id')->nullable()->constrained('restaurant_tables')->nullOnDelete();
            $table->text('special_requests')->nullable();

            $table->timestamps();

            $table->index(['restaurant_id', 'date']);
            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
