<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SavedAddresses\StoreSavedAddressRequest;
use App\Http\Requests\Api\V1\SavedAddresses\UpdateSavedAddressRequest;
use App\Http\Resources\Api\V1\SavedAddressResource;
use App\Models\SavedAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class SavedAddressController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return SavedAddressResource::collection(
            $request->user()->savedAddresses()->orderByDesc('is_default')->get()
        );
    }

    public function store(StoreSavedAddressRequest $request): JsonResponse
    {
        $data = $request->validated();

        $address = DB::transaction(function () use ($request, $data) {
            if (! empty($data['is_default'])) {
                $request->user()->savedAddresses()->update(['is_default' => false]);
            }

            return $request->user()->savedAddresses()->create($data);
        });

        return (new SavedAddressResource($address))->response()->setStatusCode(201);
    }

    public function update(UpdateSavedAddressRequest $request, SavedAddress $savedAddress): SavedAddressResource
    {
        $data = $request->validated();

        DB::transaction(function () use ($request, $savedAddress, $data) {
            if (! empty($data['is_default'])) {
                $request->user()->savedAddresses()->where('id', '!=', $savedAddress->id)->update(['is_default' => false]);
            }
            $savedAddress->update($data);
        });

        return new SavedAddressResource($savedAddress);
    }

    public function destroy(Request $request, SavedAddress $savedAddress): JsonResponse
    {
        abort_unless($savedAddress->user_id === $request->user()->id, 403);

        $savedAddress->delete();

        return response()->json(status: 204);
    }
}
