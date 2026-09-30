<?php

/*
 * Retenção de dados pessoais (auditoria de segurança, Fase 3; Lei n.º 22/11).
 * Os prazos fixos (notificações, visitas ao perfil, auditoria...) vivem em
 * cada model (`prunable()`); aqui só o que depende de uma decisão de negócio.
 */
return [

    /*
     * Dias depois dos quais os pedidos/reservas de CONVIDADOS já terminados
     * perdem nome/telefone/email/morada (ficam valores, linhas e faturas —
     * registo do restaurante). Vazio = desligado: anonimizar é irreversível
     * e apaga histórico usado pelo CRM dos restaurantes (notas de cliente,
     * clientes Gold) — ligar só com o prazo decidido pela Luku (proposta da
     * auditoria: 180).
     */
    'guest_retention_days' => env('PRIVACY_GUEST_RETENTION_DAYS') ?: null,

];
