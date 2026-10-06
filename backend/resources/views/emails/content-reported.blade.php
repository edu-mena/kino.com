<x-mail::message>
# 🚩 Conteúdo denunciado

Alguém denunciou um conteúdo na Luku. Os Termos prometem uma resposta em
**24 horas**.

<x-mail::panel>
**Tipo:** {{ $typeLabel }}
**Motivo:** {{ $reasonLabel }}
@if($details)
**Detalhes:** {{ $details }}
@endif
</x-mail::panel>

<x-mail::button :url="$url">
Ver e decidir
</x-mail::button>

Luku · Moderação
</x-mail::message>
