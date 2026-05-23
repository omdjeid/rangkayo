<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Tenancy\CreateTenantOnboardingAction;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request, CreateTenantOnboardingAction $createTenant): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'business_name' => ['required', 'string', 'max:255'],
            'business_slug' => ['nullable', 'string', 'max:64', 'unique:tenants,slug'],
            'business_type' => ['nullable', 'string', 'max:64'],
            'branch_name' => ['required', 'string', 'max:255'],
            'warehouse_name' => ['required', 'string', 'max:255'],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $createTenant->handle(
            owner: $user,
            businessName: $request->string('business_name')->toString(),
            slug: $request->string('business_slug')->toString() ?: null,
            businessType: $request->string('business_type')->toString() ?: null,
            branchName: $request->string('branch_name')->toString(),
            warehouseName: $request->string('warehouse_name')->toString(),
        );

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
