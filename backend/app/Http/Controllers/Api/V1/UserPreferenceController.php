<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UserPreferences\UpdateUserPreferenceRequest;
use App\Http\Resources\Api\V1\UserPreferenceResource;
use Illuminate\Http\Request;

class UserPreferenceController extends Controller
{
    public function show(Request $request): UserPreferenceResource
    {
        $preference = $request->user()->preferences ?? $request->user()->preferences()->make();

        return new UserPreferenceResource($preference);
    }

    public function update(UpdateUserPreferenceRequest $request): UserPreferenceResource
    {
        $preference = $request->user()->preferences()->updateOrCreate([], $request->validated());

        return new UserPreferenceResource($preference);
    }
}
