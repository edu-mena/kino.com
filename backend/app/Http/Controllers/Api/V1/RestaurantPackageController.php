<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RestaurantPackages\StoreRestaurantPackageRequest;
use App\Http\Requests\Api\V1\RestaurantPackages\UpdateRestaurantPackageRequest;
use App\Http\Resources\Api\V1\RestaurantPackageResource;
use App\Models\PackageType;
use App\Models\Restaurant;
use App\Models\RestaurantPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RestaurantPackageController extends Controller
{
    /** Público (Fase L3d: descoberta do cliente por tipo de pacote) — só
     * ativos, exceto para o próprio staff do restaurante, que precisa de
     * ver tudo para gerir em /admin/mesas (mesmo padrão de
     * PackageTypeController::index). */
    public function index(Restaurant $restaurant): AnonymousResourceCollection
    {
        $user = request()->user('sanctum');
        $query = $restaurant->packages()->with('packageType')->orderBy('created_at');

        if (! ($user && $user->can('manageOperations', $restaurant))) {
            $query->where('is_active', true);
        }

        return RestaurantPackageResource::collection($query->get());
    }

    public function store(StoreRestaurantPackageRequest $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validated();
        $data['package_type_id'] = PackageType::where('uuid', $data['package_type_id'])->value('id');

        $package = $restaurant->packages()->create($data);

        // `fresh()`, não `load()`: `is_active` não vem no payload quando
        // omitido (`sometimes`), então o objeto em memória nunca soube do
        // valor DEFAULT true aplicado pela BD — só uma releitura sabe.
        return (new RestaurantPackageResource($package->fresh('packageType')))
            ->response()->setStatusCode(201);
    }

    public function update(
        UpdateRestaurantPackageRequest $request,
        RestaurantPackage $restaurantPackage,
    ): RestaurantPackageResource {
        $data = $request->validated();
        if (array_key_exists('package_type_id', $data)) {
            $data['package_type_id'] = PackageType::where('uuid', $data['package_type_id'])->value('id');
        }

        $restaurantPackage->update($data);

        return new RestaurantPackageResource($restaurantPackage->fresh('packageType'));
    }

    public function destroy(RestaurantPackage $restaurantPackage): JsonResponse
    {
        $this->authorize('manageOperations', $restaurantPackage->restaurant);

        $restaurantPackage->delete();

        return response()->json(status: 204);
    }
}
