<?php

return [
    'alert_email' => env('MONITORING_ALERT_EMAIL', env('MAIL_FROM_ADDRESS', 'hello@example.com')),
    'queue_failed_threshold' => (int) env('MONITORING_QUEUE_FAILED_THRESHOLD', 1),
    'log_error_threshold' => (int) env('MONITORING_LOG_ERROR_THRESHOLD', 1),
    'uptime_urls' => array_values(array_filter(array_map('trim', explode(',', (string) env('MONITORING_UPTIME_URLS', ''))))),
];
