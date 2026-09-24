<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PackageTypes\StorePackageTypeRequest;
use App\Http\Requests\Api\V1\PackageTypes\UpdatePackageTypeRequest;
use App\Http\Resources\Api\V1\PackageTypeResource;
use App\Models\PackageType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PackageTypeController extends Controller
{
    /** Público — só ativos, é o catálogo que o cliente descobre em
     * `/pacotes` (Fase L3d). O painel de sistema (`/sistema/pacotes`) usa
     * este mesmo endpoint mas autenticado como operador, que vê tudo (ver
     * `index`). */
    public function index(): AnonymousResourceCollection
    {
        $query = PackageType::query()->orderBy('position')->orderBy('name');

        if (! request()->user('sanctum')?->isSystemOperator()) {
            $query->where('is_active', true);
        }

        return PackageTypeResource::collection($query->get());
    }

    public function store(StorePackageTypeRequest $request): JsonResponse
    {
        $packageType = PackageType::query()->create($request->validated());

        return (new PackageTypeResource($packageType))->response()->setStatusCode(201);
    }

    public function update(UpdatePackageTypeRequest $request, PackageType $packageType): PackageTypeResource
    {
        $packageType->update($request->validated());

        return new PackageTypeResource($packageType);
    }

    public function destroy(PackageType $packageType): JsonResponse
    {
        abort_unless(request()->user()->isSystemOperator(), 403);

        $packageType->delete();

        return response()->json(status: 204);
    }
}
