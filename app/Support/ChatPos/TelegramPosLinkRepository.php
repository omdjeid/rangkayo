<?php

namespace App\Support\ChatPos;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class TelegramPosLinkRepository
{
    public function createPairingCode(array $user, array $tenant, ?array $store = null): array
    {
        $code = 'RK-'.Str::upper(Str::random(6));
        $payload = [
            'code' => $code,
            'tenant_id' => (string) ($tenant['id'] ?? ''),
            'tenant_name' => (string) ($tenant['name'] ?? 'Tenant'),
            'user_id' => (string) ($user['id'] ?? ''),
            'user_name' => (string) ($user['name'] ?? 'User'),
            'store_id' => (string) ($store['id'] ?? $user['branch_id'] ?? ''),
            'store_name' => (string) ($store['name'] ?? ''),
            'expires_at' => now()->addMinutes(10)->toIso8601String(),
        ];

        Cache::put($this->pairingKey($code), $payload, now()->addMinutes(10));

        return $payload;
    }

    public function consumePairingCode(string $code, string|int $chatId, ?string $telegramUserId = null, ?string $username = null): ?array
    {
        $code = Str::upper(trim($code));
        $payload = Cache::pull($this->pairingKey($code));

        if (! is_array($payload)) {
            return null;
        }

        Cache::forever($this->linkKey($chatId), [
            'telegram_chat_id' => (string) $chatId,
            'telegram_user_id' => $telegramUserId,
            'telegram_username' => $username,
            'tenant_id' => $payload['tenant_id'],
            'tenant_name' => $payload['tenant_name'],
            'user_id' => $payload['user_id'],
            'user_name' => $payload['user_name'],
            'store_id' => $payload['store_id'] ?: null,
            'store_name' => $payload['store_name'] ?? null,
            'linked_at' => now()->toIso8601String(),
        ]);

        return $this->findByChatId($chatId);
    }

    public function findByChatId(string|int $chatId): ?array
    {
        $link = Cache::get($this->linkKey($chatId));

        return is_array($link) ? $link : null;
    }

    public function unlink(string|int $chatId): void
    {
        Cache::forget($this->linkKey($chatId));
    }

    private function pairingKey(string $code): string
    {
        return 'telegram-pos-pairing:'.Str::upper(trim($code));
    }

    private function linkKey(string|int $chatId): string
    {
        return 'telegram-pos-link:'.$chatId;
    }
}
