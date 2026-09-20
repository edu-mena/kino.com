<?php

namespace App\Http\Requests\Api\V1\Restaurants;

use Illuminate\Foundation\Http\FormRequest;

/** Substitui `WeeklyHours` inteiro — 7 dias, cada um com 0+ intervalos. */
class UpdateRestaurantHoursRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'days' => ['required', 'array', 'size:7'],
            'days.*.weekday' => ['required', 'integer', 'between:0,6'],
            'days.*.is_open' => ['required', 'boolean'],
            'days.*.ranges' => ['sometimes', 'array'],
            'days.*.ranges.*.start_time' => ['required_with:days.*.ranges', 'date_format:H:i'],
            'days.*.ranges.*.end_time' => ['required_with:days.*.ranges', 'date_format:H:i', 'after:days.*.ranges.*.start_time'],
        ];
    }
}
