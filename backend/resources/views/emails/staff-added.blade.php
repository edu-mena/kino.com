<x-mail::message>
# Foi adicionado a uma equipa

Olá {{ $user->name }},

A sua conta Luku foi adicionada à equipa do **{{ $restaurant->name }}**
({{ $roleInRestaurant === 'manager' ? 'gerente' : 'equipa' }}). Já pode gerir
este restaurante no painel com o email e a senha de sempre.

**Não conhece este restaurante?** Responda a este email ou escreva para
ola@luku.ao e retiramos o acesso — nenhum restaurante vê a sua senha nem os
dados dos outros restaurantes onde trabalha.

Luku
</x-mail::message>
