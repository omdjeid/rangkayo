<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TenantSwitchController extends Controller
{
    public function __invoke(Request $request, Tenant $tenant, CurrentTenant $currentTenant): RedirectResponse
    {
        $currentTenant->switchTo($tenant, $request->user());

        return redirect()->route('dashboard')->with('success', 'Usaha aktif berhasil diganti.');
    }
}
