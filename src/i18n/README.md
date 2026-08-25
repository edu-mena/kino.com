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
páginas Cardápio, Restaurantes, Entrega, Reservas, Favoritos, Ajuda
(casca + o próprio FAQ, ver abaixo), Perfil, Preferências, Checkout e a
home logada (`index.tsx` — busca, promoções, restaurantes próximos,
recomendações de pratos, restrições alimentares).

### FAQ da Ajuda — dados mockados também traduzidos

Diferente do resto do dataset mockado (ver "O que NÃO se traduz" acima), o
FAQ (`src/lib/help-articles/`) não está ligado a nenhum restaurante/prato
concreto — é texto puro de "casca", por isso tem tradução de verdade,
seguindo o mesmo padrão dos dicionários daqui: `pt.ts` é a fonte de
verdade (mesmos `id`s em `en.ts`/`fr.ts`), `useHelpArticles()` escolhe o
array certo pelo idioma ativo com fallback por artigo para português, e um
teste de paridade (`index.test.ts`) garante que os três ficheiros têm
exatamente os mesmos `id`s. É o padrão a seguir se mais dados mockados
precisarem de tradução no futuro — ver secção seguinte.

### Quando um dado mockado _deve_ ganhar tradução

Nem todo o dataset mockado (`src/data/mockData.ts`) é candidato — a maior
parte é conteúdo próprio de cada restaurante/prato (nomes, descrições),
onde traduzir exigiria duplicar dezenas de itens por idioma, um trabalho
grande e frágil (qualquer edição futura tem de ser replicada 3×). Faz
sentido seguir o padrão do FAQ quando o dado é:

- **Pequeno em quantidade** (algumas dezenas de entradas, não centenas).
- **Independente de um restaurante/prato específico** — "casca" reaproveitável,
  não conteúdo autoral de um parceiro.

Exemplos que se qualificam, se for pedido no futuro: categorias de
cardápio e tipos de cozinha (conjuntos pequenos e finitos, reaproveitados
por muitos itens — bastaria um dicionário `categoria pt → {en, fr}`, sem
duplicar restaurantes/pratos) ou as 3 ofertas de `INITIAL_OFFERS`. Nomes e
descrições de restaurantes/pratos ficam de fora por agora — exigiriam
duplicar o dataset inteiro.

Por cobrir (não traduzido ainda): páginas de visitante (Kino, Sobre,
Contacto, Parceiros, Cadastro/Entrar — incluindo a home de visitante em
`index.tsx`), conteúdo do FAQ de Ajuda.
