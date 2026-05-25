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
        Schema::create('tax_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('input_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->string('name');
            $table->string('code');
            $table->decimal('rate', 8, 4);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->foreignId('tax_rate_id')->nullable()->after('warehouse_id')->constrained()->nullOnDelete();
            $table->decimal('tax_total', 18, 2)->default(0)->after('line_total');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tax_rate_id');
            $table->dropColumn('tax_total');
        });

        Schema::dropIfExists('tax_rates');
    }
};
