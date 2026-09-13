<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Uploads\StoreUploadRequest;
use App\Services\MediaUploadService;
use Illuminate\Http\JsonResponse;

class UploadController extends Controller
{
    public function store(StoreUploadRequest $request, MediaUploadService $uploads): JsonResponse
    {
        $url = $uploads->storeImage(
            $request->file('file'),
            $request->string('purpose')->toString(),
            "user-{$request->user()->id}",
        );

        return response()->json(['data' => ['url' => $url, 'status' => 'ready']], 201);
    }
}
