<?php

/*
 * Traduções pontuais das mensagens de validação que chegam ao utilizador
 * tal como vêm da API (APP_LOCALE=pt). Chaves em falta caem para o inglês
 * do framework (fallback_locale) — só está aqui o que foi preciso: as
 * regras do objeto Password (auditoria de segurança, Fase 1). `min` e
 * `confirmed` da senha vêm de ResetPasswordRequest::messages(), para não
 * mudar a mensagem desses dois em todos os outros campos da API.
 */
return [
    'password' => [
        'letters' => 'A :attribute tem de ter pelo menos uma letra.',
        'mixed' => 'A :attribute tem de ter pelo menos uma maiúscula e uma minúscula.',
        'numbers' => 'A :attribute tem de ter pelo menos um número.',
        'symbols' => 'A :attribute tem de ter pelo menos um símbolo.',
        'uncompromised' => 'Esta :attribute apareceu numa fuga de dados pública — escolha outra.',
    ],
    'attributes' => [
        'password' => 'senha',
    ],
];
