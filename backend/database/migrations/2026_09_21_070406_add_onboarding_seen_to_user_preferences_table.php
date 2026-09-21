<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->timestamp('tutorial_seen_at')->nullable();
            $table->timestamp('dietary_onboarding_seen_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->dropColumn(['tutorial_seen_at', 'dietary_onboarding_seen_at']);
        });
    }
};
