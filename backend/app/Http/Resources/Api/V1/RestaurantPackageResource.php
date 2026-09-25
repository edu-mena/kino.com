<?php

namespace App\Http\Resources\Api\V1;

use App\Models\RestaurantPackage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin RestaurantPackage */
class RestaurantPackageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'restaurantId' => $this->whenLoaded('restaurant', fn () => $this->restaurant->uuid),
            // Resumo do restaurante (nome/imagem/lat/lng) — só usado pela
            // descoberta pública por tipo de pacote (Fase L3d), pra o
            // frontend ordenar por distância como já faz em /restaurantes.
            // `restaurantId` acima chega sempre que só o id interessa (ex:
            // /admin/mesas, que nunca carrega esses campos extra).
            'restaurant' => $this->whenLoaded('restaurant', fn () => [
                'id' => $this->restaurant->uuid,
                'name' => $this->restaurant->name,
                'image' => $this->restaurant->cover_image_url,
                'lat' => $this->restaurant->lat === null ? null : (float) $this->restaurant->lat,
                'lng' => $this->restaurant->lng === null ? null : (float) $this->restaurant->lng,
            ]),
            'packageType' => $this->whenLoaded('packageType', fn () => [
                'id' => $this->packageType->uuid,
                'name' => $this->packageType->name,
                'icon' => $this->packageType->icon,
            ]),
            // Nome próprio do pacote — nulo usa o nome do tipo (ver plano),
            // decisão que fica ao frontend (mostrar `title ?? packageType.name`)
            // para não duplicar essa regra dos dois lados.
            'title' => $this->title,
            'description' => $this->description,
            'price' => (float) $this->price,
            'maxPeople' => $this->max_people,
            'characteristics' => $this->characteristics ?? [],
            'isActive' => $this->is_active,
        ];
    }
}
