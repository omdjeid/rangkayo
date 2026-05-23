<?php

namespace App\Http\Controllers;

use App\Models\TenantInvitation;
use App\Models\User;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TenantInvitationController extends Controller
{
    public function store(Request $request, CurrentTenant $currentTenant): RedirectResponse
    {
        $tenant = $currentTenant->tenant();

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in(['admin', 'accountant', 'branch_manager', 'cashier', 'warehouse_staff'])],
            'branch_id' => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
        ]);

        TenantInvitation::query()->create([
            ...$validated,
            'tenant_id' => $tenant->id,
            'invited_by' => $request->user()?->id,
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        return back()->with('success', 'Undangan dibuat. Pengiriman email akan diaktifkan pada tahap integrasi email.');
    }

    public function accept(string $token): Response
    {
        $invitation = TenantInvitation::query()->where('token', $token)->whereNull('accepted_at')->firstOrFail();

        return Inertia::render('Tenancy/Invitations/Accept', [
            'invitation' => [
                'token' => $invitation->token,
                'name' => $invitation->name,
                'email' => $invitation->email,
                'tenant' => $invitation->tenant->name,
                'role' => $invitation->role,
            ],
        ]);
    }

    public function complete(Request $request, string $token): RedirectResponse
    {
        $invitation = TenantInvitation::query()->where('token', $token)->whereNull('accepted_at')->firstOrFail();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::query()->firstOrCreate(
            ['email' => $invitation->email],
            [
                'name' => $validated['name'],
                'password' => Hash::make($validated['password']),
            ],
        );

        $invitation->tenant->users()->syncWithoutDetaching([
            $user->id => [
                'branch_id' => $invitation->branch_id,
                'role' => $invitation->role,
                'is_default' => false,
                'is_active' => true,
                'joined_at' => now(),
            ],
        ]);

        $invitation->update(['accepted_at' => now()]);
        Auth::login($user);

        return redirect()->route('dashboard');
    }
}
