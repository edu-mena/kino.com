<?php

namespace App\Http\Requests\Api\V1\Restaurants;

use Illuminate\Foundation\Http\FormRequest;

class StoreGalleryImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return ['image' => ['required', 'file', 'image', 'max:8192']];
    }
}
