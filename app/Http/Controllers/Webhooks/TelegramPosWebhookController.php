<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Support\ChatPos\ChatPosService;
use App\Support\Telegram\TelegramClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class TelegramPosWebhookController extends Controller
{
    public function __construct(
        private readonly ChatPosService $chatPos,
        private readonly TelegramClient $telegram,
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('services.telegram.webhook_secret');

        if ($secret !== '' && $request->header('X-Telegram-Bot-Api-Secret-Token') !== $secret) {
            return response()->json(['message' => 'Invalid Telegram webhook secret.'], 403);
        }

        $chatId = data_get($request->all(), 'message.chat.id');
        $text = (string) data_get($request->all(), 'message.text', '');

        if (! $chatId || trim($text) === '') {
            return response()->json(['ok' => true]);
        }

        try {
            $reply = $this->chatPos->handleMessage($chatId, $text);
        } catch (Throwable $exception) {
            Log::warning('Telegram POS webhook failed.', ['message' => $exception->getMessage()]);
            $reply = 'Gagal memproses order: '.$exception->getMessage();
        }

        try {
            $this->telegram->sendMessage($chatId, $reply);
        } catch (Throwable $exception) {
            Log::warning('Telegram POS reply failed.', ['message' => $exception->getMessage()]);
        }

        return response()->json(['ok' => true]);
    }
}
