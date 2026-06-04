<?php

namespace App\Console\Commands;

use App\Models\TenantSubscription;
use Illuminate\Console\Command;

class ExpireTrials extends Command
{
    protected $signature = 'subscriptions:expire-trials';
    protected $description = 'Downgrade expired trials to Starter plan';

    public function handle(): int
    {
        $expired = TenantSubscription::where('status', 'trial')
            ->where('trial_ends_at', '<', now())
            ->get();

        foreach ($expired as $sub) {
            $sub->update([
                'plan_code' => 'starter',
                'plan_name' => 'Starter',
                'monthly_price' => 0,
                'status' => 'active',
                'user_limit' => 1,
                'branch_limit' => 1,
            ]);
            $this->info("Tenant {$sub->tenant_id}: downgraded to Starter");
        }

        $this->info("Processed {$expired->count()} expired trials.");
        return 0;
    }
}
