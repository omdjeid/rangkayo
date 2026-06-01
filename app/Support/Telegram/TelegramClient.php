<?php

namespace App\Support\Telegram;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class TelegramClient
{
    public function sendMessage(string|int $chatId, string $text): void
    {
        $token = (string) config('services.telegram.bot_token');

        if ($token === '') {
            throw new RuntimeException('TELEGRAM_BOT_TOKEN belum dikonfigurasi.');
        }

        $response = Http::baseUrl('https://api.telegram.org/bot'.$token)
            ->asJson()
            ->post('/sendMessage', [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
            ]);

        if ($response->failed()) {
            throw new RuntimeException($response->json('description') ?: 'Gagal mengirim pesan Telegram.');
        }
    }
}
