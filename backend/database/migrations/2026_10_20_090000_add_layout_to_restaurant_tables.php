<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Gestão de sala a sério: cada mesa ganha descrição livre (ex.: "cadeiras
 * fixas, junto à janela"), características pré-definidas, forma (para a
 * planta), se pode ser junta a outras, se está em serviço e uma ordem
 * manual. As junções de mesas são POR DIA (`table_combinations`) — juntar
 * a 3 e a 4 para um grupo de sábado não muda a sala de domingo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->string('description', 300)->nullable()->after('area');
            $table->json('features')->nullable()->after('description');
            $table->string('shape', 16)->default('square')->after('features');
            $table->boolean('is_combinable')->default(true)->after('shape');
            $table->boolean('is_active')->default(true)->after('is_combinable');
            $table->unsignedInteger('sort_order')->default(0)->after('is_active');
        });

        // Ordem inicial = ordem "natural" do nome por restaurante (Mesa 2
        // antes de Mesa 10), a mesma que o painel já mostrava.
        $rows = DB::table('restaurant_tables')->select('id', 'restaurant_id', 'name')->get();
        foreach ($rows->groupBy('restaurant_id') as $tables) {
            $sorted = $tables->sort(fn ($a, $b) => strnatcasecmp($a->name, $b->name))->values();
            foreach ($sorted as $index => $row) {
                DB::table('restaurant_tables')->where('id', $row->id)->update(['sort_order' => $index + 1]);
            }
        }

        Schema::create('table_combinations', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            // Juntar duas mesas de 4 dá muitas vezes 6 lugares, não 8 — a
            // capacidade da junção é decisão do staff, por omissão a soma.
            $table->unsignedSmallInteger('seats');
            $table->string('label', 80)->nullable();
            $table->timestamps();

            $table->index(['restaurant_id', 'date']);
        });

        Schema::create('table_combination_table', function (Blueprint $table) {
            $table->id();
            $table->foreignId('table_combination_id')->constrained()->cascadeOnDelete();
            $table->foreignId('restaurant_table_id')->constrained()->cascadeOnDelete();
            // Desnormalizado de propósito: garante na própria BD que uma
            // mesa só está numa junção por dia.
            $table->date('date');
            $table->unsignedSmallInteger('position')->default(0);

            $table->unique(['restaurant_table_id', 'date']);
            $table->index('table_combination_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_combination_table');
        Schema::dropIfExists('table_combinations');

        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->dropColumn(['description', 'features', 'shape', 'is_combinable', 'is_active', 'sort_order']);
        });
    }
};
