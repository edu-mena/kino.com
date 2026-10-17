<x-mail::message>
# Confirme os avisos da LUKU

Pediu para ser avisado por email quando algum serviço da LUKU tiver
problemas (e quando voltar ao normal). Para confirmar, toque no botão:

<x-mail::button :url="$subscriber->confirmUrl()">
Confirmar inscrição
</x-mail::button>

Se não foi você, ignore este email — não vai receber nada.

Equipa LUKU
</x-mail::message>
