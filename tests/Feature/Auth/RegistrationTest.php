<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'business_name' => 'Toko Test',
            'business_slug' => 'toko-test',
            'business_type' => 'retail',
            'branch_name' => 'Cabang Utama',
            'warehouse_name' => 'Gudang Utama',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertDatabaseHas('tenants', ['slug' => 'toko-test']);
        $this->assertDatabaseHas('tenant_subscriptions', ['plan_code' => 'starter']);
    }
}
