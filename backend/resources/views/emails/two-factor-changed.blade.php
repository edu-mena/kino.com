<x-mail::message>
@if($enabled)
# 🔐 Verificação em dois passos ligada

Olá {{ $user->name }},

A partir de agora, entrar no painel do restaurante com a sua conta pede
também o código da app de autenticação. As outras sessões abertas da conta
foram terminadas.
@else
# ⚠️ Verificação em dois passos desligada

Olá {{ $user->name }},

A verificação em dois passos da sua conta foi **desligada** — entrar no
painel volta a pedir só o email e a senha.
@endif

**Não foi você?** Altere já a senha (em "Esqueci a senha" no login do
painel) e escreva para ola@luku.ao.

Luku
</x-mail::message>
