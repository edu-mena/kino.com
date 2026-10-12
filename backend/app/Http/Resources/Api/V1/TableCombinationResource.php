<?php

namespace App\Http\Resources\Api\V1;

use App\Models\TableCombination;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TableCombination */
class TableCombinationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'date' => $this->date->toDateString(),
            'seats' => $this->seats,
            'label' => $this->label,
            // Ordem da junção — a 1.ª é a âncora (onde fica gravada a
            // reserva atribuída à junção).
            'tableIds' => $this->whenLoaded('tables', fn () => $this->tables->pluck('uuid')->values()),
        ];
    }
}
