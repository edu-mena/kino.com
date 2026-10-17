<x-mail::message>
# {{ $title }}

{{ $body }}

<x-mail::button :url="rtrim(config('app.frontend_url'), '/') . '/estado'">
Ver o estado dos serviços
</x-mail::button>

Equipa LUKU

@if($unsubscribeUrl)
<x-mail::subcopy>
Recebe este email porque se inscreveu nos avisos do estado dos serviços da LUKU.
[Deixar de receber estes avisos]({{ $unsubscribeUrl }})
</x-mail::subcopy>
@endif
</x-mail::message>
