<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\ApprovePartnerApplication;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PartnerApplications\StorePartnerApplicationRequest;
use App\Http\Resources\Api\V1\PartnerApplicationResource;
use App\Http\Resources\Api\V1\RestaurantResource;
use App\Models\PartnerApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Todo o controller (exceto `store`) é system_operator-only — candidaturas
 * são um assunto interno Luku, nunca visível a restaurant_staff. */
class PartnerApplicationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $applications = PartnerApplication::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest()
            ->get();

        return PartnerApplicationResource::collection($applications);
    }

    /** Público — /parceiros. */
    public function store(StorePartnerApplicationRequest $request): JsonResponse
    {
        $application = PartnerApplication::query()->create([...$request->validated(), 'status' => 'pending']);

        return (new PartnerApplicationResource($application))->response()->setStatusCode(201);
    }

    public function approve(Request $request, PartnerApplication $application, ApprovePartnerApplication $action): RestaurantResource
    {
        abort_unless($request->user()->isSystemOperator(), 403);
        abort_unless($application->status === 'pending', 422, 'Esta candidatura já foi decidida.');

        $restaurant = $action->handle($application);

        return new RestaurantResource($restaurant);
    }

    public function reject(Request $request, PartnerApplication $application): PartnerApplicationResource
    {
        abort_unless($request->user()->isSystemOperator(), 403);
        abort_unless($application->status === 'pending', 422, 'Esta candidatura já foi decidida.');

        $application->update(['status' => 'rejected']);

        return new PartnerApplicationResource($application);
    }

    public function destroy(Request $request, PartnerApplication $application): JsonResponse
    {
        abort_unless($request->user()->isSystemOperator(), 403);

        $application->delete();

        return response()->json(status: 204);
    }
}
