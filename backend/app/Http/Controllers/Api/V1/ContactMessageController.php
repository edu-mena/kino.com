<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ContactMessages\StoreContactMessageRequest;
use App\Http\Resources\Api\V1\ContactMessageResource;
use App\Mail\ContactMessageMail;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class ContactMessageController extends Controller
{
    /** Público — /contacto. Envia um email em fila para a equipa Luku
     * (config('mail.contact_address'), com Reply-To do próprio remetente)
     * e guarda a mensagem, para não se perder se o envio falhar (sem
     * painel de leitura próprio por agora, ver ContactMessage). */
    public function store(StoreContactMessageRequest $request): JsonResponse
    {
        $contactMessage = ContactMessage::query()->create($request->validated());

        Mail::to(config('mail.contact_address'))->queue(new ContactMessageMail($contactMessage));

        return (new ContactMessageResource($contactMessage))->response()->setStatusCode(201);
    }
}
