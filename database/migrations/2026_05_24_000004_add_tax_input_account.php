<?php

use App\Models\Accounting\Account;
use App\Models\Accounting\TaxRate;
use App\Models\Tenant;
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
        if (! Schema::hasColumn('tax_rates', 'input_account_id')) {
            Schema::table('tax_rates', function (Blueprint $table): void {
                $table->foreignId('input_account_id')->nullable()->after('account_id')->constrained('accounts')->nullOnDelete();
            });
        }

        Tenant::query()->select(['id'])->chunkById(100, function ($tenants): void {
            foreach ($tenants as $tenant) {
                Account::query()->firstOrCreate(
                    ['tenant_id' => $tenant->id, 'code' => '1070'],
                    [
                        'name' => 'Pajak Masukan Dibayar Dimuka',
                        'type' => 'asset',
                        'normal_balance' => 'debit',
                        'is_cash' => false,
                        'is_system' => true,
                        'is_active' => true,
                    ],
                );
            }
        });

        TaxRate::query()
            ->whereNull('input_account_id')
            ->chunkById(100, function ($taxRates): void {
                foreach ($taxRates as $taxRate) {
                    $inputAccountId = Account::query()
                        ->where('tenant_id', $taxRate->tenant_id)
                        ->where('code', '1070')
                        ->value('id');

                    if ($inputAccountId !== null) {
                        $taxRate->forceFill(['input_account_id' => $inputAccountId])->save();
                    }
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('tax_rates', 'input_account_id')) {
            Schema::table('tax_rates', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('input_account_id');
            });
        }
    }
};
