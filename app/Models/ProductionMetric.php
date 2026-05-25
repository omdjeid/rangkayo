<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'value',
        'status',
        'context',
        'measured_at',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:4',
            'context' => 'array',
            'measured_at' => 'datetime',
        ];
    }
}
