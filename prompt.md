# 🪄 Prompt de Desenvolvimento — Studio de Beleza Thallyta Silveira

---

## Visão Geral do Projeto
Atue como desenvolvedor full stack.
Desenvolver um site completo, responsivo (mobile, tablet e desktop) para o **Studio de Beleza Thallyta Silveira** — cabeleireira e nail designer. O site deve ser frontend em **React (Vite)**, usando **TailwindCSS** e **React Toastify** para notificações, com identidade visual **luxury dark gold**: fundo preto/carvão, tipografia em dourado, detalhes metálicos e atmosfera de salão premium.

---

## Stack & Tecnologias

- **React 18** com **Vite**
- **TailwindCSS** (com tema customizado no `tailwind.config.js`)
- **React Toastify** para notificações de agendamento, login, fidelidade etc.
- **React Router DOM** para navegação entre páginas/seções
- **React Icons** para ícones (Instagram, WhatsApp, estrelas, etc.)
- **Framer Motion** para animações de entrada, scroll reveal e microinterações
- **React Hook Form** para formulários de agendamento e login
- **date-fns** para manipulação de datas no calendário de agendamento
- **Google Fonts**: `Cormorant Garamond` (display/títulos) + `DM Sans` (corpo)

---

## Identidade Visual

```js
// tailwind.config.js — tema customizado
colors: {
  gold: { DEFAULT: '#C9A84C', light: '#E8C97A', dark: '#9A7A2E' },
  dark: { DEFAULT: '#0D0D0D', card: '#1A1A1A', border: '#2A2A2A' },
  cream: '#F5F0E8',
}
```

- Fundo geral: `#0D0D0D`
- Cards/seções: `#1A1A1A` com borda `1px solid rgba(201,168,76,0.2)`
- Texto principal: `#F5F0E8` (cream)
- Destaque/CTA: dourado `#C9A84C`
- Efeito sutil de grain/texture no background via pseudo-elemento CSS
- Botões primários: fundo dourado com texto escuro, hover com brilho
- Gradiente decorativo: `radial-gradient(ellipse at top, rgba(201,168,76,0.08) 0%, transparent 70%)`

---

## Estrutura de Arquivos

```
src/
├── assets/           ← fotos fornecidas (owner, studio, serviços)
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   └── FloatingButtons.jsx   ← Instagram + WhatsApp flutuantes
│   ├── sections/
│   │   ├── Hero.jsx
│   │   ├── About.jsx
│   │   ├── Services.jsx
│   │   ├── Gallery.jsx
│   │   ├── Testimonials.jsx
│   │   ├── Booking.jsx
│   │   ├── Loyalty.jsx
│   │   └── Location.jsx
│   ├── ui/
│   │   ├── ServiceCard.jsx
│   │   ├── GalleryModal.jsx
│   │   ├── BookingCalendar.jsx
│   │   ├── TimeSlot.jsx
│   │   └── LoyaltyCard.jsx
│   └── auth/
│       ├── LoginModal.jsx
│       ├── UserProfile.jsx
│       └── GoogleLoginButton.jsx
├── hooks/
│   ├── useAuth.js
│   └── useBooking.js
├── context/
│   ├── AuthContext.jsx
│   └── BookingContext.jsx
├── data/
│   ├── services.js     ← lista de serviços e preços
│   ├── testimonials.js
│   └── timeSlots.js
├── App.jsx
└── main.jsx
```

---

## Seções — Detalhamento Completo

### 1. `<Navbar>`
- Logo TS em dourado (SVG inline ou imagem)
- Links: Início · Sobre · Serviços · Galeria · Agendamento · Fidelidade · Localização
- Botão "Entrar" (abre modal de login) e avatar de usuário logado
- Mobile: hamburger menu com slide-in lateral (drawer), fundo `#0D0D0D` semitransparente com blur
- Sticky com `backdrop-blur` após scroll

### 2. `<Hero>`
- Layout split: texto à esquerda, foto da Thallyta à direita (recortada com gradiente na base)
- Título: `"Bem-vinda ao seu momento de beleza."` em Cormorant Garamond, tamanho grande
- Subtítulo em DM Sans fino
- CTA principal: `"Começar Agendamento"` (dourado)
- CTA secundário: `"Conheça o Estúdio"` (outline)
- Background com partículas douradas sutis (CSS keyframes ou canvas simples)
- Animação de entrada com Framer Motion (stagger nos elementos)

### 3. `<About>` — "Conheça o Estúdio"
- Foto da Thallyta no estúdio (imagem do salão)
- Texto sobre a profissional, missão e valores
- 3 pilares visuais: **Beleza · Autocuidado · Confiança** (com ícones e separadores dourados)
- Certificações/selos mencionados nas fotos
- Animação scroll-reveal

### 4. `<Services>` — Tabela de Preços Interativa
- Tabs: **Unhas** | **Cabelo** | **Serviços Rápidos**
- Cards por serviço com preço e botão "Adicionar ao Agendamento"
- Dados completos do cardápio:

#### Unhas
| Serviço | Preço |
|---|---|
| Alongamento em gel | R$ 150,00 |
| Manutenção | R$ 130,00 |
| Banho em gel | R$ 100,00 |
| Blindagem + esmaltação em gel | R$ 70,00 |
| Postiça realista | R$ 70,00 |
| Reposição de unha | R$ 10,00 |
| Remoção | R$ 40,00 |
| Pedicure em gel | R$ 60,00 |

#### Cabelo
| Serviço | P | M | G | GG |
|---|---|---|---|---|
| Alisamento | R$ 200 | R$ 250 | R$ 300 | R$ 400 |
| Botox Capilar | R$ 170 | R$ 200 | R$ 250 | — |
| Redução de Cachos | R$ 200 | R$ 250 | R$ 280 | — |

#### Serviços Rápidos
| Serviço | Preço |
|---|---|
| Lavar e escovar | R$ 50,00 |
| Tratamento + escova | R$ 70,00 |
| Lavar e condicionar | R$ 30,00 |
| Só pranchar | R$ 30,00 |
| Lavar + pranchar | R$ 50,00 |

- Toast ao adicionar serviço: `"✓ Serviço adicionado ao seu agendamento!"`

### 5. `<Gallery>` — Galeria de Fotos
- Grid masonry responsivo com as fotos fornecidas (estúdio + profissional)
- Lightbox/modal ao clicar com navegação entre fotos
- Filtro por categoria: Todas · Unhas · Cabelo · Estúdio
- Hover com overlay dourado e ícone de zoom

### 6. `<Testimonials>` — Depoimentos
- Carrossel auto-play com 5 depoimentos fictícios (placeholder realistas)
- Stars rating em dourado
- Avatar circular com iniciais ou foto
- Indicadores de navegação com pontos dourados

### 7. `<Booking>` — Agendamento
- **Passo 1**: Seleção de serviço(s) — lista com checkbox
- **Passo 2**: Calendário visual (semana rolante) — dias da semana com scroll horizontal no mobile
- **Passo 3**: Horários disponíveis em grid (09:00, 09:45, 10:30, 11:15, 13:30, 14:15, 15:00, 15:45)
- **Passo 4**: Confirmação — resumo com nome, serviço, data, hora + botão "Confirmar"
- Barra de progresso golden steps no topo
- Requer login para confirmar; se não logado, abre modal de login automaticamente
- Toast de sucesso: `"🎉 Agendamento confirmado! Até logo, [Nome]!"`

### 8. `<UserProfile>` / Auth
- Modal de login com:
  - Email + senha
  - **"Entrar com Google"** (botão estilizado)
  - Link "Criar conta"
- Após login: dropdown com "Meus Agendamentos", "Fidelidade", "Sair"
- Estado gerenciado via `AuthContext`

### 9. `<Loyalty>` — Área de Fidelidade
- Cartão visual: 10 selos no estilo do mockup (círculos com logo TS)
- Selos preenchidos = dourado brilhante; vazios = cinza translúcido
- Mensagem dinâmica: `"X selos para sua próxima [serviço] grátis!"`
- Histórico de visitas (lista mockada)
- Visível apenas para usuários logados

### 10. `<Location>` — Localização
- Endereço: Rua José Firmino da Costa, Centro, 481 — Ao lado de Carmela Dutra
- Embed Google Maps responsivo
- Card com horários de funcionamento
- Botão "Como Chegar" → abre Google Maps
- Contato: Instagram `@studiodebelezathallytasilveira` | WhatsApp `(88) 98186-0582`

### 11. `<Footer>`
- Logo + tagline: *"Realçando sua beleza com excelência!"*
- Links rápidos para todas as seções
- Redes sociais (Instagram + WhatsApp)
- Copyright

---

## Componentes Globais

### `<FloatingButtons>` — Fixos no canto inferior direito

```jsx
// Dois botões empilhados, sempre visíveis em todas as páginas
<a href="https://instagram.com/studiodebelezathallytasilveira" target="_blank">
  <BsInstagram /> // fundo gradiente instagram
</a>
<a href="https://wa.me/5588981860582" target="_blank">
  <BsWhatsapp /> // fundo #25D366
</a>
```

- Animação de pulse suave no WhatsApp
- Tooltip ao hover: "Instagram" / "Fale no WhatsApp"
- Z-index alto para ficar sempre acima do conteúdo

---

## Comportamentos & UX

- **Scroll suave** entre seções com `scroll-behavior: smooth`
- **Scroll reveal** com Framer Motion `whileInView` em todas as seções
- **Toast notifications** via React Toastify com tema dark/dourado customizado
- **Mobile-first**: breakpoints `sm (640px)`, `md (768px)`, `lg (1024px)`, `xl (1280px)`
- **Acessibilidade**: `aria-label`, `alt` em imagens, foco visível nos botões, contraste adequado
- **SEO básico**: meta tags no `index.html`, título e descrição corretos
- **Performance**: lazy loading nas imagens, code splitting por seção

---

## Dados Iniciais (sem backend)

Usar `localStorage` para simular:
- Usuário logado (`authUser`)
- Agendamentos (`bookings`)
- Selos de fidelidade (`loyaltyStamps`)

> Estes serão substituídos por chamadas de API quando o backend for desenvolvido.

---

## Comandos para Iniciar

```bash
npm create vite@latest studio-thallyta -- --template react
cd studio-thallyta
npm install tailwindcss @tailwindcss/vite react-toastify react-router-dom react-icons framer-motion react-hook-form date-fns
```

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

```css
/* index.css */
@import "tailwindcss";

@theme {
  --color-gold: #C9A84C;
  --color-gold-light: #E8C97A;
  --color-gold-dark: #9A7A2E;
  --color-dark: #0D0D0D;
  --color-dark-card: #1A1A1A;
  --color-dark-border: #2A2A2A;
  --color-cream: #F5F0E8;
  --font-display: "Cormorant Garamond", serif;
  --font-body: "DM Sans", sans-serif;
}
```

---

## Próximos Passos (Backend)

Quando for implementar o backend, os seguintes endpoints serão necessários:

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cadastro de usuário |
| POST | `/auth/login` | Login com email/senha |
| GET | `/auth/google` | OAuth Google |
| GET | `/services` | Listar serviços |
| GET | `/availability` | Horários disponíveis por data |
| POST | `/bookings` | Criar agendamento |
| GET | `/bookings/:userId` | Agendamentos do usuário |
| GET | `/loyalty/:userId` | Selos de fidelidade |

---

*Prompt elaborado com base no mockup do aplicativo mobile e nas fotos do Studio de Beleza Thallyta Silveira.*
