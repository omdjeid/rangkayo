<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('production_metrics', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->decimal('value', 18, 4)->default(0);
            $table->string('status')->default('ok');
            $table->json('context')->nullable();
            $table->timestamp('measured_at');
            $table->timestamps();

            $table->index(['name', 'measured_at']);
            $table->index(['status', 'measured_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_metrics');
    }
};
