<x-mail::message>
# 🍽️ Novo pedido de parceria

**{{ $application->restaurant_name }}** candidatou-se a entrar na Luku.

<x-mail::panel>
**Responsável:** {{ $application->owner_name }}
**Email:** {{ $application->email }}
**Telefone:** {{ $application->phone }}
@if($application->province)
**Província:** {{ $application->province }}
@endif
</x-mail::panel>

@if($application->message)
{{ $application->message }}
@endif

Analisa e decide a candidatura no painel de sistema.

Luku · Parceiros
</x-mail::message>
