<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\ApprovePartnerApplication;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PartnerApplications\StorePartnerApplicationRequest;
use App\Http\Resources\Api\V1\PartnerApplicationResource;
use App\Http\Resources\Api\V1\RestaurantResource;
use App\Mail\PartnerApplicationConfirmationMail;
use App\Mail\PartnerApplicationReceivedMail;
use App\Models\PartnerApplication;
use App\Services\MediaUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

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

    /** Público — /parceiros. Envia dois emails automáticos em fila, sem
     * depender do candidato abrir aplicação de email nenhuma (substitui o
     * `mailto:` que o frontend usava antes): um para a equipa Luku
     * decidir, outro de confirmação para o próprio candidato. */
    public function store(StorePartnerApplicationRequest $request, MediaUploadService $uploads): JsonResponse
    {
        $data = $request->validated();
        $photo = $request->file('photo');
        unset($data['photo']);

        // Sem `id`/`uuid` próprio ainda (a linha só nasce a seguir) — usa um
        // uuid à parte só para nomear a pasta no disco, igual em espírito ao
        // resto do MediaUploadService (sempre um segmento único por dono).
        if ($photo) {
            $data['photo_url'] = $uploads->storeImage($photo, 'partner', (string) Str::uuid());
        }

        $application = PartnerApplication::query()->create([...$data, 'status' => 'pending']);

        Mail::to(config('mail.partners_notification_address'))
            ->queue(new PartnerApplicationReceivedMail($application));
        Mail::to($application->email)
            ->queue(new PartnerApplicationConfirmationMail($application));

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
