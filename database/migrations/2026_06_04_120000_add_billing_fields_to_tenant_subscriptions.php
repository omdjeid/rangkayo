<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('tenant_subscriptions', 'monthly_price')) {
                $table->decimal('monthly_price', 12, 2)->default(0)->after('plan_name');
            }
            if (!Schema::hasColumn('tenant_subscriptions', 'current_period_starts_at')) {
                $table->date('current_period_starts_at')->nullable()->after('trial_ends_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenant_subscriptions', function (Blueprint $table) {
            $table->dropColumn(['monthly_price', 'current_period_starts_at']);
        });
    }
};
