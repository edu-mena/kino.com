<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Companies\StoreCompanyRequest;
use App\Http\Requests\Api\V1\Companies\UpdateCompanyRequest;
use App\Http\Resources\Api\V1\CompanyResource;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CompanyController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return CompanyResource::collection(
            $request->user()->companies()->latest()->get()
        );
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $company = $request->user()->companies()->create($request->validated());

        return (new CompanyResource($company))->response()->setStatusCode(201);
    }

    public function update(UpdateCompanyRequest $request, Company $company): CompanyResource
    {
        $company->update($request->validated());

        return new CompanyResource($company);
    }

    public function destroy(Request $request, Company $company): JsonResponse
    {
        abort_unless($company->user_id === $request->user()->id, 403);

        $company->delete();

        return response()->json(status: 204);
    }
}
