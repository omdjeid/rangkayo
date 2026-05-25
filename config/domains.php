<?php

return [
    'root' => env('SAAS_ROOT_DOMAIN', 'rangkayo.my.id'),
    'home' => env('SAAS_HOME_DOMAIN', env('SAAS_ROOT_DOMAIN', 'rangkayo.my.id')),
    'admin' => env('SAAS_ADMIN_DOMAIN', 'admin.rangkayo.my.id'),
    'app' => env('SAAS_APP_DOMAIN', 'app.rangkayo.my.id'),
    'pos' => env('SAAS_POS_DOMAIN', 'pos.rangkayo.my.id'),
    'enforce' => (bool) env('SAAS_ENFORCE_DOMAINS', false),
];
