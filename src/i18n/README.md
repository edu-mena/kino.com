# i18n

Tradução simples baseada em dicionários — sem biblioteca externa. O idioma
ativo vive em `usePreferences().language` (definido no seletor da página de
Perfil) e `useTranslation()` lê-o para escolher o dicionário certo.

## Uso

```tsx
import { useTranslation } from "@/i18n";

function MinhaPagina() {
  const { t } = useTranslation();
  return <h1>{t("entrega.title")}</h1>;
}
```

Com variáveis: `t("preferencias.confirmIngredientDescription", { query: "abc" })`
substitui `{query}` no texto.

## Ficheiros

- `pt.ts` — português, **idioma de referência**. A forma deste objeto é a
  fonte de verdade; `en.ts` e `fr.ts` seguem a mesma estrutura (o tipo
  `Dictionary` é derivado de `pt.ts`).
- `en.ts`, `fr.ts` — traduções. Se uma chave faltar aqui, `useTranslation`
  cai automaticamente para o texto em português (nunca mostra a chave em
  bruto nem quebra a build).
- `index.ts` — o hook `useTranslation()` e os tipos.

## O que NÃO se traduz

Propositadamente fora do dicionário — fica sempre como está, em qualquer
idioma:

- Nomes de restaurantes, pratos e ingredientes (dados de `src/data/mockData.ts`)
- Moradas, telefones, emails
- Preços/moeda (`formatKz`)
- Texto escrito pelo próprio usuário (alias de endereço, pedidos especiais
  na reserva, notas do prato)

Traduzir estes exigiria manter o dataset inteiro duplicado por idioma — fora
do âmbito deste sistema, que cobre a "casca" da interface (menus, botões,
cabeçalhos, mensagens fixas).

## Âmbito atual

Cobertos: navegação (header/sidebar/tabbar), diálogo de logout, e as
páginas Cardápio, Restaurantes, Entrega, Reservas, Favoritos, Ajuda (só a
casca — as perguntas/respostas do FAQ ainda estão só em português, em
`src/lib/mock-data.ts`), Perfil, Preferências e Checkout.

Por cobrir (não traduzido ainda): páginas de visitante (Kino, Sobre,
Contacto, Parceiros, Cadastro/Entrar), conteúdo do FAQ de Ajuda, home
logada (`index.tsx`).
