<?php

namespace App\Http\Requests\Api\V1\Stories;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `media` é imagem OU vídeo — nunca os dois. Restaurante gerido via
 * `restaurant` na rota (StoryController garante `manageOperations`); global
 * (`restaurant_id = null`) é uma rota à parte, só system_operator (ver
 * routes/api_v1.php).
 */
class StoreStoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // autorização real feita no controller (2 rotas diferentes)
    }

    public function rules(): array
    {
        return [
            'media' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,mp4,mov,webm', 'max:102400'],
            'duration_sec' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:120'],
            'text' => ['sometimes', 'nullable', 'string', 'max:140'],
            'link' => ['sometimes', 'nullable', 'url', 'max:2048'],
        ];
    }
}
