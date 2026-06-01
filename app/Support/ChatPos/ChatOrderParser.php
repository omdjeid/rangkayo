<?php

namespace App\Support\ChatPos;

class ChatOrderParser
{
    public function parse(string $message): array
    {
        $message = trim($message);

        if ($message === '') {
            return ['items' => [], 'customer' => null, 'payment_method' => null, 'confidence' => 0];
        }

        return $this->normalize($this->parseSimple($message));
    }

    private function parseSimple(string $message): array
    {
        $parts = array_values(array_filter(array_map('trim', explode(',', strtolower($message)))));
        $payment = null;
        $customer = null;
        $items = [];

        foreach ($parts as $part) {
            if (in_array($part, ['cash', 'tunai', 'qris', 'transfer', 'debit', 'credit', 'kredit', 'gojek', 'grab', 'bank'], true)) {
                $payment = $part === 'tunai' ? 'cash' : ($part === 'kredit' ? 'credit' : $part);
                continue;
            }

            // Match "product name x2" or "product name 2"
            if (preg_match('/^(.+?)\s+x?(\d+)$/', $part, $match)) {
                $items[] = ['name' => trim($match[1]), 'qty' => (int) $match[2]];
                continue;
            }

            // If it doesn't look like a product with qty, treat as customer name
            $customer = $part;
        }

        return ['items' => $items, 'customer' => $customer, 'payment_method' => $payment, 'confidence' => $items === [] ? 0.2 : 0.7];
    }

    private function normalize(array $payload): array
    {
        $items = collect($payload['items'] ?? [])
            ->filter(fn ($item) => is_array($item) && filled($item['name'] ?? null))
            ->map(fn (array $item): array => [
                'name' => trim((string) $item['name']),
                'qty' => max(1, (int) ($item['qty'] ?? 1)),
            ])
            ->values()
            ->all();

        $payment = strtolower((string) ($payload['payment_method'] ?? '')) ?: null;
        $aliases = ['tunai' => 'cash', 'kredit' => 'credit'];

        return [
            'items' => $items,
            'customer' => filled($payload['customer'] ?? null) ? trim((string) $payload['customer']) : null,
            'payment_method' => $aliases[$payment] ?? $payment,
            'confidence' => (float) ($payload['confidence'] ?? 0),
        ];
    }
}
