<?php

namespace App\Http\Requests\Api\V1\Reviews;

use Illuminate\Foundation\Http\FormRequest;

/** `text: null`/vazio remove a resposta (ver mock, setReviewReply). */
class ReplyReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('review')->restaurant);
    }

    public function rules(): array
    {
        return [
            'text' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
