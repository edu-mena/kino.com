# Análise da Codebase - Kino.com

## 📋 Visão Geral do Projeto

**Nome**: Kino.com - Plataforma de entrega de comida (Food Delivery)  
**Descrição**: Webapp responsivo para pedido de comida dos melhores restaurantes de Luanda  
**Tipo**: Frontend-first, mockdata, sem servidor/banco de dados  
**Status**: Desenvolvido com Lovable (AI-assisted development)  
**Localização**: Luanda, Angola

---

## 🛠️ Stack Tecnológico

### Frameworks & Bibliotecas Principais
- **TanStack Start 1.168.32** - Full-stack React meta-framework
- **React + TypeScript** - UI com type safety
- **TanStack Router 1.170.18** - File-based routing
- **React Query 5.101.1** - Data fetching & state management
- **Tailwind CSS 4** - Utility-first styling
- **Radix UI** - Componentes acessíveis de baixo nível

### Ferramentas & DevTools
- **Vite** - Build tool e dev server
- **Bun** - Runtime JavaScript (bunfig.toml presente)
- **TypeScript** - Type safety completo
- **ESLint + Prettier** - Linting e formatação
- **Sonner** - Toast notifications
- **Lucide Icons** - Ícones SVG
- **React Hook Form** - Gerenciamento de formulários
- **class-variance-authority** - CSS class composition

### Versão Node & Compatibilidade
- TypeScript: ES2022 target
- DOM APIs completo (DOM.Iterable)
- Browser-only (sem SSR ativo em dev)

---

## 🏗️ Arquitetura & Estrutura

### Estrutura de Pastas (Clara e Modular)

```
src/
├── routes/          # File-based routing (TanStack Router)
├── components/      # Componentes React
│   ├── ui/         # Componentes primitivos (Radix UI wrapper)
│   └── [business]  # Componentes de negócio (dish-*, site-*)
├── hooks/          # Custom React hooks
├── lib/            # Utilidades e contexto
├── assets/         # Imagens estáticas
└── styles.css      # Estilos globais Tailwind
```

### Padrão de Roteamento (File-Based)
- **`__root.tsx`** - Layout raiz com QueryClientProvider, CartProvider, Toaster
- **`index.tsx`** - Página home com hero section
- **Rotas nomeadas por recurso**:
  - `cardapio.tsx` - Menu de pratos
  - `carrinho.tsx` - Carrinho de compras
  - `checkout.tsx` - Finalização
  - `prato.$dishId.tsx` - Detalhe de prato (parâmetro dinâmico)
  - `restaurantes.tsx`, `ofertas.tsx`, `sobre.tsx`, `perfil.tsx`
  - `entrar.tsx` - Autenticação
  - `acompanhar.tsx` - Rastreamento
  - `pedido-confirmado.tsx` - Confirmação
  - `ajuda.tsx` - FAQ/Help

---

## 🎨 Padrões de Design

### 1. **Component-Driven Architecture**
- **Pequenos componentes** reutilizáveis (separation of concerns)
- **Composição sobre herança**
- Exemplo:
  - `DishCard` - Card individual de prato
  - `DishGrid` - Grid responsivo com múltiplos cards
  - `DishCarousel` - Carrossel de pratos

### 2. **Context API para State Global**
```typescript
// CartProvider em lib/cart.tsx
- CartContext armazena estado do carrinho
- Hook useCart() para consumo
- Cálculos de subtotal, taxa de entrega, total
```

### 3. **Custom Hooks Pattern**
```typescript
useIsMobile()       // Detecta breakpoint md (768px)
useCart()           // Acesso ao contexto do carrinho
```

### 4. **Type Safety Rigorosa**
```typescript
// Tipos bem definidos para Dish, AddOn, CartLine
export type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  category: "burgers" | "pizza" | "bebidas" | "pratos" | "sobremesas";
  image: string;
  restaurant: string;
  addOns: AddOn[];
};
```

### 5. **Mock Data Pattern**
- Dados centralizados em `mock-data.ts`
- Estruturas imutáveis
- Funções helper (formatKz, getPromo, promoPrice)

### 6. **UI Component Composition**
- Wrapper sobre Radix UI primitivos
- Tailwind styling integrado
- Acessibilidade incluída (aria-labels)

### 7. **Error Handling Pattern**
- Boundary errors (ErrorComponent no root)
- 404 handling (NotFoundComponent)
- Error capture e reporting (Lovable error tracking)

---

## 📝 Convenções de Nomes

### Arquivos
| Padrão | Exemplo | Propósito |
|--------|---------|----------|
| kebab-case | `dish-card.tsx` | Componentes |
| snake_case com $ | `prato.$dishId.tsx` | Rotas dinâmicas |
| __ prefix | `__root.tsx` | Layout root |
| camelCase | `mock-data.ts`, `utils.ts` | Utilidades |

### Componentes React
- **PascalCase** para exports: `DishCard`, `SiteHeader`, `PageShell`
- **Sufixos descritivos**: `-Card`, `-Grid`, `-Carousel`, `-Provider`
- **Função interna minúscula**: `function DishCard({ dish })`

### Variáveis & Funções
- **camelCase** padrão: `formatKz`, `getPromo`, `promoPrice`
- **useXxx** para custom hooks
- **lowerCamelCase** para props e state

### Constantes
- **UPPER_SNAKE_CASE**: `DELIVERY_FEE`, `MOBILE_BREAKPOINT`, `TTL_MS`
- **Arrays como plural**: `categories[]`, `dishes[]`, `navLinks`

### CSS Classes (Tailwind)
- **BEM-inspired com Tailwind**: `card-soft`, `font-display`
- **Breakpoints**: `sm:`, `md:`, `lg:` prefixes
- **Responsive design**: Mobile-first approach

---

## 🧩 Estrutura de Componentes

### Componentes de Layout
```typescript
// site-shell.tsx - Wrapper principal
- SiteHeader: Navigation sticky com logo, links, cart button
- Abas de navegação mobile (tabs array com icones)
- SiteFooter: Rodapé com informações
- responsive (mobile/desktop)

// PageShell - Container com padding/max-width
```

### Componentes de Negócio (Domain)
```
dish-card.tsx
- Card compacto de prato
- Imagem, nome, preço, avaliação
- Botão de favorito (like state)
- Botão de adicionar ao carrinho
- Link para detalhe

dish-grid.tsx
- Gradeado responsivo (3 colunas + promo tile)
- Pagination (12 itens por página)
- Desconto badge dinâmico
- GridDishCard (versão compacta)
- PromoTile (destaque de oferta)

dish-carousel.tsx
- Carrossel horizontal de pratos
- Scroll suave
```

### Componentes UI (Radix Wrapped)
```
ui/
- accordion.tsx      - Acordeão expandível
- alert-dialog.tsx   - Diálogo de alerta
- badge.tsx          - Tags/badges
- button.tsx         - Botões estilizados
- card.tsx           - Cards container
- carousel.tsx       - Carrossel base
- dialog.tsx         - Diálogos
- form.tsx           - Wrapper de formulário
- input.tsx, select.tsx, textarea.tsx - Inputs
- sidebar.tsx        - Menu lateral
- tabs.tsx           - Abas
- tooltip.tsx        - Tooltips
```

---

## 🔄 State Management Strategy

### 1. **Context API (CartProvider)**
```typescript
// Estado local to estado global
CartContext
├── lines: CartLine[]
├── count: number
├── subtotal: number
├── deliveryFee: number
├── total: number
└── actions: add, setQty, remove, clear
```

### 2. **React Query (TanStack Query)**
- Instanciado no router context
- Para futuro data fetching async
- Caching automático

### 3. **Local Component State**
- `useState` para UI temporária (liked state, mobile menu)
- `useState` para inputs de formulário

### 4. **URL State (Router)**
- Parâmetros dinâmicos: `/prato/$dishId`
- Search params para filtros

---

## 🛣️ Estratégia de Roteamento

### TanStack Router - File-Based
```
routes/
├── __root.tsx           # Root layout (providers)
├── index.tsx            # Home /
├── cardapio.tsx         # /cardapio
├── carrinho.tsx         # /carrinho
├── checkout.tsx         # /checkout
├── pedido-confirmado.tsx # /pedido-confirmado
├── prato.$dishId.tsx    # /prato/:dishId (dinâmico)
├── restaurantes.tsx     # /restaurantes
├── ofertas.tsx          # /ofertas
├── perfil.tsx           # /perfil
├── entrar.tsx           # /entrar
├── acompanhar.tsx       # /acompanhar
├── ajuda.tsx            # /ajuda
└── sobre.tsx            # /sobre
```

### Padrão de Rota
```typescript
export const Route = createFileRoute("/")({
  head: () => ({ meta: [...] }),      // SEO metadata
  component: Home,                     // Componente
  errorComponent: CustomError,         // Error boundary (opcional)
});
```

---

## 🎯 Padrões de UI/UX

### Design System Integrado
- **Color Palette**: primary, brand, secondary, destructive, muted
- **Spacing**: Tailwind standard (4px units)
- **Typography**: 
  - `font-display` custom (heading font)
  - `font-bold` padrão para ênfase
- **Shadows**: `shadow-[var(--shadow-soft)]`
- **Radius**: `rounded-xl`, `rounded-2xl` (valores grandes)
- **Backdrop**: `backdrop-blur` para sticky elements

### Componentes Interativos Padrão
```typescript
// Toast notifications
toast.success("Prato adicionado ao carrinho")

// Buttons com transições
className="transition-transform hover:scale-105 active:scale-95"

// Lazy loading de imagens
<img loading="lazy" ... />

// Links com navegação
<Link to="/prato/$dishId" params={{ dishId: dish.id }} />
```

### Responsividade
- **Mobile-first approach**
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Classes**: `sm:text-sm md:grid-cols-2 lg:text-lg`

---

## 📊 Arquivos Chave & Dados

### Mock Data (mock-data.ts)
```typescript
- images: { burger, fries, drink, pizza, plate, dessert }
- categories: Array de categorias com ícones
- dishes: Array de 20+ pratos com addons
- restaurants: Dados de restaurantes
- offers: Promoções
- formatKz(price): Formata preço em KZ
- getPromo(dishId): Retorna desconto
- promoPrice(dish): Calcula preço com desconto
```

### Utils (lib/utils.ts)
```typescript
cn(...inputs): Merge Tailwind classes (clsx + twMerge)
```

### Error Handling (lib/error-capture.ts)
```typescript
- lastCapturedError tracking
- describeError(error): Serialização de erros com stack trace
- Error cause chain support
```

---

## ✅ Padrões de Código & Qualidade

### ESLint Rules Ativas
```javascript
- typescript-eslint recommended
- react-hooks recommended
- react-refresh only-export-components
- prettier integration
- No unused imports
```

### TypeScript Config
```json
{
  "strict": true,
  "noImplicitReturns": true,
  "noImplicitOverride": true,
  "noPropertyAccessFromIndexSignature": true,
  "exactOptionalPropertyTypes": true,
  "paths": { "@/*": ["./src/*"] }
}
```

### Padrões de Código
1. **Tipos explícitos**: `type ReactNode` sempre explícito
2. **Props typing**: `{ dish }: { dish: Dish }`
3. **Arrow functions**: Predominante
4. **Async/await**: Quando necessário
5. **Try-catch**: Mínimo, error boundary preferred

---

## 🔌 Integrações & Dependências

### Já Integrado
✅ Radix UI (30+ componentes)  
✅ Tailwind CSS com config customizado  
✅ React Hook Form + resolvers  
✅ Lucide Icons (100+ ícones SVG)  
✅ Sonner (toast notifications)  
✅ TanStack Query  
✅ TanStack Router  
✅ Lovable error reporting  

### Não Implementado (Frontend-only)
❌ Backend API  
❌ Database  
❌ Authentication  
❌ Payment processing  

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Uso |
|-----------|-------|-----|
| Mobile | < 640px | Padrão |
| sm | 640px | Pequenas mudanças |
| md | 768px | useIsMobile breakpoint |
| lg | 1024px | Layouts grandes |

---

## 🎓 Lições de Design Observadas

1. **Simplicidade**: Componentes pequenos e focados
2. **Reusabilidade**: DishCard/GridDishCard baseados em Dish type
3. **Type Safety**: Tipos discriminados (`category` union)
4. **Acessibilidade**: `aria-label` em botões interativos
5. **Performance**: 
   - Lazy loading de imagens
   - Memoization via useMemo em CartProvider
   - Scroll restoration no router
6. **User Feedback**: Toast notifications, visual states
7. **Mobile-First**: Design começa mobile, expande para desktop
8. **Semantics**: HTML semântico (buttons/links corretos)

---

## 🚀 Potenciais Melhorias Futuras

- [ ] Adicionar persistência ao carrinho (localStorage)
- [ ] Animações Framer Motion
- [ ] Testes unitários (Vitest)
- [ ] Dark mode support
- [ ] Internacionalização (i18n)
- [ ] Backend API integration
- [ ] Authentication system
- [ ] Real images CDN

---

**Última atualização**: 16 de Agosto, 2026  
**Conectado a**: Lovable Editor
**Repository Status**: Sincronizado com git
