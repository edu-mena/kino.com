<x-mail::message>
# 🛟 Novo ticket de suporte

<x-mail::panel>
**Restaurante:** {{ $ticket->restaurant?->name }}
**Assunto:** {{ $ticket->subject }}
</x-mail::panel>

{{ $ticket->message }}

@if($ticket->restaurant?->email)
Responde diretamente a este email — vai para {{ $ticket->restaurant->email }}.
@endif

Luku · Suporte
</x-mail::message>
