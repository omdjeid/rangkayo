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
        Schema::create('tenant_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('plan_code')->default('starter');
            $table->string('plan_name')->default('Starter');
            $table->string('status')->default('trial');
            $table->unsignedInteger('user_limit')->default(5);
            $table->unsignedInteger('branch_limit')->default(1);
            $table->unsignedInteger('transaction_limit')->default(1000);
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamps();

            $table->unique('tenant_id');
            $table->index(['status', 'current_period_ends_at']);
        });

        Schema::create('cashier_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->dateTime('opened_at');
            $table->dateTime('closed_at')->nullable();
            $table->decimal('opening_cash', 18, 2)->default(0);
            $table->decimal('expected_cash', 18, 2)->default(0);
            $table->decimal('actual_cash', 18, 2)->nullable();
            $table->decimal('cash_difference', 18, 2)->nullable();
            $table->string('status')->default('open');
            $table->text('opening_notes')->nullable();
            $table->text('closing_notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'branch_id', 'user_id', 'status']);
            $table->index(['tenant_id', 'opened_at']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('warehouse_id')->constrained()->nullOnDelete();
            $table->foreignId('cashier_shift_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->index(['tenant_id', 'user_id', 'sold_at']);
            $table->index(['tenant_id', 'cashier_shift_id']);
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('account_id')->constrained()->nullOnDelete();
            $table->foreignId('warehouse_id')->nullable()->after('product_id')->constrained()->nullOnDelete();
        });

        Schema::table('tenant_users', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('is_default');
            $table->index(['tenant_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_users', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'is_active']);
            $table->dropColumn('is_active');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('warehouse_id');
            $table->dropConstrainedForeignId('product_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'cashier_shift_id']);
            $table->dropIndex(['tenant_id', 'user_id', 'sold_at']);
            $table->dropConstrainedForeignId('cashier_shift_id');
            $table->dropConstrainedForeignId('user_id');
        });

        Schema::dropIfExists('cashier_shifts');
        Schema::dropIfExists('tenant_subscriptions');
    }
};
