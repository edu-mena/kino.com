<?php

namespace App\Http\Requests\Api\V1\QrCodes;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Estilo de impressão dos QR do restaurante (estúdio em /admin/mesas) —
 * guardado para que a reimpressão de uma mesa saia igual às outras, em
 * qualquer dispositivo. Lista fechada de chaves: nada mais é gravado.
 */
class UpdateQrStyleRequest extends FormRequest
{
    public const KEYS = [
        'template', 'format', 'color', 'showLogo', 'logoInQr', 'showTable',
        'showName', 'showLuku', 'headline', 'footnote', 'wifiName', 'wifiPassword',
    ];

    public function authorize(): bool
    {
        return $this->user()->can('manageOperations', $this->route('restaurant'));
    }

    public function rules(): array
    {
        return [
            'style' => ['required', 'array'],
            'style.template' => ['sometimes', 'string', 'in:classic,bold,minimal,dark'],
            'style.format' => ['sometimes', 'string', 'in:card,tent,sticker,mini'],
            'style.color' => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'style.showLogo' => ['sometimes', 'boolean'],
            'style.logoInQr' => ['sometimes', 'boolean'],
            'style.showTable' => ['sometimes', 'boolean'],
            'style.showName' => ['sometimes', 'boolean'],
            'style.showLuku' => ['sometimes', 'boolean'],
            'style.headline' => ['sometimes', 'nullable', 'string', 'max:80'],
            'style.footnote' => ['sometimes', 'nullable', 'string', 'max:120'],
            'style.wifiName' => ['sometimes', 'nullable', 'string', 'max:60'],
            'style.wifiPassword' => ['sometimes', 'nullable', 'string', 'max:60'],
        ];
    }

    /** @return array<string, mixed> */
    public function style(): array
    {
        return collect($this->validated('style'))->only(self::KEYS)->all();
    }
}
