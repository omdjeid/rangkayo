<?php

use App\Http\Controllers\Webhooks\TelegramPosWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/webhooks/telegram/pos', TelegramPosWebhookController::class)->name('api.webhooks.telegram.pos');
