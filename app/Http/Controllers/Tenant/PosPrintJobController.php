<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Support\CurrentTenant;
use App\Support\Printing\BrowserPrintQueue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosPrintJobController extends Controller
{
    public function pull(Request $request, CurrentTenant $currentTenant, BrowserPrintQueue $queue): JsonResponse
    {
        $tenant = $currentTenant->tenant();

        $jobs = $queue->pull($tenant->id);

        return response()->json([
            'jobs' => $jobs,
        ]);
    }
}
