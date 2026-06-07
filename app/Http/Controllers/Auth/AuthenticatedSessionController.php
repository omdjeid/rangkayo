<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Support\CurrentTenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $email = $request->input('email');
        $password = $request->input('password');
        $remember = $request->boolean('remember');

        // Find user and verify password directly
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            abort(422, 'Email atau password salah.');
        }

        // Force login — Auth::attempt has session persistence issues on this server
        Auth::login($user, $remember);

        $request->session()->regenerate();

        try {
            $context = app(CurrentTenant::class)->context($request->user());
            $intendedRoute = $context->isCashierOnly() ? 'pos.index' : 'dashboard';
        } catch (RuntimeException) {
            $intendedRoute = 'dashboard';
        }

        return redirect()->intended(route($intendedRoute, absolute: false));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/');
    }
}
