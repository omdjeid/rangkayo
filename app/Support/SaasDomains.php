<?php

namespace App\Support;

use Illuminate\Http\Request;

class SaasDomains
{
    public static function home(): string
    {
        return (string) config('domains.home');
    }

    public static function admin(): string
    {
        return (string) config('domains.admin');
    }

    public static function app(): string
    {
        return (string) config('domains.app');
    }

    public static function pos(): string
    {
        return (string) config('domains.pos');
    }

    public static function enforced(): bool
    {
        return (bool) config('domains.enforce');
    }

    public static function isKnownHost(Request $request): bool
    {
        return in_array($request->getHost(), self::hosts(), true);
    }

    /**
     * @return array<int, string>
     */
    public static function hosts(): array
    {
        return array_values(array_filter([
            self::home(),
            self::admin(),
            self::app(),
            self::pos(),
        ]));
    }

    public static function isHome(Request $request): bool
    {
        return $request->getHost() === self::home();
    }

    public static function isAdmin(Request $request): bool
    {
        return $request->getHost() === self::admin();
    }

    public static function isApp(Request $request): bool
    {
        return $request->getHost() === self::app();
    }

    public static function isPos(Request $request): bool
    {
        return $request->getHost() === self::pos();
    }

    /**
     * @param  array<string, mixed>  $parameters
     */
    public static function routeUrl(string $route, array $parameters = [], bool $absolute = true, ?string $host = null): string
    {
        $url = route($route, $parameters, $absolute);

        if (! self::enforced() || $host === null || ! $absolute) {
            return $url;
        }

        $parts = parse_url($url);
        $scheme = $parts['scheme'] ?? 'https';
        $path = $parts['path'] ?? '';
        $query = isset($parts['query']) ? '?'.$parts['query'] : '';
        $fragment = isset($parts['fragment']) ? '#'.$parts['fragment'] : '';

        return "{$scheme}://{$host}{$path}{$query}{$fragment}";
    }

    public static function intendedRouteFor(Request $request): ?string
    {
        if (! self::enforced() || ! self::isKnownHost($request)) {
            return null;
        }

        if (self::isHome($request)) {
            return $request->routeIs('home', 'login', 'register', 'password.*', 'verification.*', 'health', 'profile.*') ? null : 'home';
        }

        if (self::isAdmin($request)) {
            return $request->routeIs('platform.*', 'tenant.switch', 'branch.switch', 'login', 'logout', 'profile.*') ? null : 'platform.index';
        }

        if (self::isPos($request)) {
            return $request->routeIs('pos.*', 'cashier-shifts.*', 'login', 'logout', 'profile.*') ? null : 'pos.index';
        }

        if (self::isApp($request)) {
            return $request->routeIs('platform.*', 'pos.*', 'cashier-shifts.*', 'home') ? 'dashboard' : null;
        }

        return null;
    }
}
