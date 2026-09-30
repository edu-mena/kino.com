<?php

namespace App\Http\Requests\Api\V1\Offers;

/**
 * Mensagens em português para as regras das promoções — o painel mostra-as
 * diretamente ao restaurante/operador (ver `failureMessage` em
 * src/lib/offers-admin.tsx). Sem isto saíam as de omissão do Laravel, em
 * inglês ("The code has already been taken."), porque a app não tem
 * ficheiros `lang/pt`.
 */
trait OfferValidationMessages
{
    public function messages(): array
    {
        return [
            'title.required' => 'Indique o título da promoção.',
            'title.max' => 'O título pode ter no máximo 150 caracteres.',
            'description.max' => 'A descrição pode ter no máximo 500 caracteres.',
            'code.unique' => 'Este código promocional já está a ser usado por outra promoção. Escolha outro.',
            'code.alpha_dash' => 'O código só pode ter letras, números, hífen e underscore (sem espaços).',
            'code.max' => 'O código pode ter no máximo 40 caracteres.',
            'percent_off.required_unless' => 'Indique a percentagem de desconto.',
            'percent_off.integer' => 'A percentagem tem de ser um número inteiro.',
            'percent_off.min' => 'A percentagem tem de estar entre 1 e 100.',
            'percent_off.max' => 'A percentagem tem de estar entre 1 e 100.',
            'media.mimes' => 'Formato não suportado — use JPG, PNG, WEBP, MP4, MOV ou WEBM.',
            'media.max' => 'O ficheiro é demasiado grande (máximo 100 MB).',
            'media.file' => 'Não foi possível ler o ficheiro enviado. Tente escolher a imagem de novo.',
            'ends_at.after' => 'A data de fim tem de ser depois da data de início.',
            'menu_item_ids.*.exists' => 'Um dos pratos escolhidos já não existe neste restaurante.',
            'menu_item_ids.prohibited' => 'Uma promoção da Luku não pode visar pratos de um restaurante.',
            'categories.prohibited' => 'Uma promoção da Luku não pode visar categorias de um restaurante.',
        ];
    }
}
