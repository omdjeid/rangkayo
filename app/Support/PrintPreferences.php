<?php

namespace App\Support;

use App\Models\Tenant;
use Illuminate\Validation\Rule;

class PrintPreferences
{
    public const PRESET_KEYS = [
        'thermal-58',
        'thermal-90',
        'standard-a4',
        'custom-paper',
        'dot-matrix',
    ];

    public const CONNECTION_KEYS = [
        'browser',
        'bluetooth',
    ];

    public const DEFAULTS = [
        'receipt' => [
            'preset' => 'thermal-58',
            'width' => '58mm',
            'height' => 'auto',
            'margin' => '2mm',
            'connection' => 'browser',
            'printer_name' => '',
            'auto_print' => false,
        ],
        'invoice' => [
            'preset' => 'standard-a4',
            'width' => '210mm',
            'height' => '297mm',
            'margin' => '12mm',
            'connection' => 'browser',
            'printer_name' => '',
            'auto_print' => false,
        ],
    ];

    private const SIZE_PATTERN = '/^\d{1,4}(?:\.\d{1,2})?(?:mm|cm|in|px|pt)$/i';

    private const HEIGHT_PATTERN = '/^(?:auto|\d{1,4}(?:\.\d{1,2})?(?:mm|cm|in|px|pt))$/i';

    private const MARGIN_PATTERN = '/^(?:0|\d{1,3}(?:\.\d{1,2})?(?:mm|cm|in|px|pt))$/i';

    /**
     * @return array<string, array{preset:string,width:string,height:string,margin:string,connection:string,printer_name:string,auto_print:bool}>
     */
    public static function forTenant(Tenant $tenant): array
    {
        $settings = is_array($tenant->settings) ? $tenant->settings : [];
        $preferences = $settings['print_preferences'] ?? [];

        return self::normalize(is_array($preferences) ? $preferences : []);
    }

    /**
     * @param  array<string, mixed>  $preferences
     * @return array<string, array{preset:string,width:string,height:string,margin:string,connection:string,printer_name:string,auto_print:bool}>
     */
    public static function normalize(array $preferences): array
    {
        return [
            'receipt' => self::normalizePreference($preferences['receipt'] ?? [], self::DEFAULTS['receipt']),
            'invoice' => self::normalizePreference($preferences['invoice'] ?? [], self::DEFAULTS['invoice']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function validationRules(): array
    {
        $rules = [
            'print_preferences' => ['required', 'array'],
        ];

        foreach (array_keys(self::DEFAULTS) as $context) {
            $rules["print_preferences.{$context}"] = ['required', 'array'];
            $rules["print_preferences.{$context}.preset"] = ['required', Rule::in(self::PRESET_KEYS)];
            $rules["print_preferences.{$context}.width"] = ['required', 'string', 'max:16', 'regex:'.self::SIZE_PATTERN];
            $rules["print_preferences.{$context}.height"] = ['required', 'string', 'max:16', 'regex:'.self::HEIGHT_PATTERN];
            $rules["print_preferences.{$context}.margin"] = ['required', 'string', 'max:16', 'regex:'.self::MARGIN_PATTERN];
            $rules["print_preferences.{$context}.connection"] = ['required', Rule::in(self::CONNECTION_KEYS)];
            $rules["print_preferences.{$context}.printer_name"] = ['nullable', 'string', 'max:120'];
            $rules["print_preferences.{$context}.auto_print"] = ['required', 'boolean'];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public static function validationMessages(): array
    {
        return [
            'print_preferences.*.preset.in' => 'Preset cetak tidak tersedia.',
            'print_preferences.*.width.regex' => 'Lebar kertas harus memakai satuan valid, contoh 58mm atau 210mm.',
            'print_preferences.*.height.regex' => 'Tinggi kertas harus auto atau memakai satuan valid, contoh 297mm.',
            'print_preferences.*.margin.regex' => 'Margin harus 0 atau memakai satuan valid, contoh 2mm.',
            'print_preferences.*.connection.in' => 'Koneksi printer harus Browser/USB atau Bluetooth.',
        ];
    }

    /**
     * @param  array{preset:string,width:string,height:string,margin:string,connection:string,printer_name:string,auto_print:bool}  $fallback
     * @return array{preset:string,width:string,height:string,margin:string,connection:string,printer_name:string,auto_print:bool}
     */
    private static function normalizePreference(mixed $preference, array $fallback): array
    {
        $preference = is_array($preference) ? $preference : [];
        $preset = $preference['preset'] ?? $fallback['preset'];
        $preset = is_string($preset) && in_array($preset, self::PRESET_KEYS, true) ? $preset : $fallback['preset'];
        $connection = $preference['connection'] ?? $fallback['connection'];
        $connection = is_string($connection) && in_array($connection, self::CONNECTION_KEYS, true) ? $connection : $fallback['connection'];
        $printerName = $preference['printer_name'] ?? $fallback['printer_name'];

        return [
            'preset' => $preset,
            'width' => self::normalizeCssValue($preference['width'] ?? null, self::SIZE_PATTERN, $fallback['width']),
            'height' => self::normalizeCssValue($preference['height'] ?? null, self::HEIGHT_PATTERN, $fallback['height']),
            'margin' => self::normalizeCssValue($preference['margin'] ?? null, self::MARGIN_PATTERN, $fallback['margin']),
            'connection' => $connection,
            'printer_name' => is_scalar($printerName) ? trim((string) $printerName) : '',
            'auto_print' => filter_var($preference['auto_print'] ?? $fallback['auto_print'], FILTER_VALIDATE_BOOL),
        ];
    }

    private static function normalizeCssValue(mixed $value, string $pattern, string $fallback): string
    {
        if (! is_scalar($value)) {
            return $fallback;
        }

        $candidate = trim((string) $value);

        if (preg_match($pattern, $candidate) !== 1) {
            return $fallback;
        }

        return strtolower($candidate);
    }
}
