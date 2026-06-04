<?php

namespace App\Http\Controllers\Api;

use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $context = $this->tenant($request);
        $query = Contact::where('tenant_id', $context->tenant->id)->orderBy('name');

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        $contacts = $query->paginate($request->integer('per_page', 25));
        return $this->paginated($contacts);
    }

    public function store(Request $request): JsonResponse
    {
        $context = $this->tenant($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:customer,supplier'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'price_level' => ['nullable', 'in:retail,grosir'],
        ]);

        $validated['tenant_id'] = $context->tenant->id;
        $contact = Contact::create($validated);
        return $this->success($contact, 'Contact created', 201);
    }
}
