<x-mail::message>
# 📬 Nova mensagem de contacto

<x-mail::panel>
**Nome:** {{ $contactMessage->name }}
**Email:** {{ $contactMessage->email }}
**Assunto:** {{ $contactMessage->subject }}
</x-mail::panel>

{{ $contactMessage->message }}

Responde diretamente a este email — vai para {{ $contactMessage->email }}.

Luku · Contacto
</x-mail::message>
