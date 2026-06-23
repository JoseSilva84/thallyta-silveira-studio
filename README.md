# Studio Thallyta Silveira

Site institucional e sistema de agendamento do Studio de Beleza Thallyta Silveira. O projeto combina uma landing page responsiva com autenticação de clientes, agendamento de serviços, pagamentos, painel administrativo, galeria, depoimentos, controle financeiro e integrações externas.

## Visão Geral

O repositório é dividido em duas aplicações:

- **Frontend:** React + Vite, localizado na raiz do projeto.
- **Backend:** Node.js + Express + Prisma, localizado em `backend/`.

Principais recursos:

- Página inicial com seções de apresentação, serviços, galeria, depoimentos, agenda, fidelidade, dúvidas e localização.
- Agendamento rápido em `/agendar`.
- Cadastro e login de clientes.
- Login com Google OAuth, quando configurado.
- Área protegida de cliente em `/meus-agendamentos`.
- Painel administrativo em `/admin`.
- Integração com Cal.com para agenda e bloqueios.
- Integração com Mercado Pago para pagamentos.
- Upload e gerenciamento de galeria via Cloudinary.
- Envio opcional de notificações por WhatsApp via WAHA.
- PWA com manifest, ícones e cache de imagens/fontes.
- SEO básico com `robots.txt`, `sitemap.xml` e headers no Vercel.

## Tecnologias

Frontend:

- React 18
- Vite
- Tailwind CSS
- React Router DOM
- Framer Motion
- React Hook Form
- React Toastify
- React Icons
- date-fns
- vite-plugin-pwa

Backend:

- Node.js com ES Modules
- Express 5
- Prisma ORM
- PostgreSQL
- JWT
- Passport Google OAuth
- bcryptjs
- Cloudinary
- Multer
- Mercado Pago via API HTTP
- WAHA/WhatsApp via API HTTP

## Estrutura do Projeto

```text
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── data/
│       ├── middleware/
│       ├── routes/
│       ├── scripts/
│       ├── services/
│       ├── utils/
│       └── server.js
├── public/
│   ├── img/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── site.webmanifest
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   ├── utils/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

## Páginas e Rotas do Frontend

- `/` - página principal do site.
- `/login` - login tradicional e acesso com Google.
- `/register` - cadastro de cliente.
- `/agendar` - fluxo rápido de agendamento.
- `/auth/callback` - callback frontend após login Google.
- `/meus-agendamentos` - área protegida do cliente.
- `/admin` - painel administrativo protegido para usuários `ADMIN`.

Rotas desconhecidas são redirecionadas para `/`.

## API do Backend

O backend sobe por padrão em `http://localhost:3001` e expõe a API em `/api`.

Rotas principais:

- `GET /api/health` - health check.
- `/api/auth` - cadastro, login, sessão do usuário, WhatsApp do usuário e Google OAuth.
- `/api/gallery` - listagem pública, upload e exclusão de imagens por admin.
- `/api/bookings` - agenda pública, agendamentos do usuário/admin, cancelamento e ações administrativas.
- `/api/payments` - criação e confirmação de pagamento, bônus de aniversário e webhook do Mercado Pago.
- `/api/testimonials` - depoimentos públicos e gestão administrativa.
- `/api/schedule-blocks` - bloqueios de agenda no Cal.com, somente admin.
- `/api/finance` - despesas financeiras, somente admin.
- `/api/webhooks/cal` - webhook do Cal.com.

## Banco de Dados

O projeto usa PostgreSQL com Prisma. Os modelos principais estão em `backend/prisma/schema.prisma`:

- `User`
- `Booking`
- `BookingPayment`
- `NotificationLog`
- `Testimonial`
- `FinanceExpense`
- `BirthdayReward`

As migrations ficam em `backend/prisma/migrations/`.

## Pré-Requisitos

- Node.js 18 ou superior.
- npm.
- PostgreSQL acessível por `DATABASE_URL`.
- Contas/chaves das integrações desejadas:
  - Cal.com
  - Mercado Pago
  - Google OAuth
  - Cloudinary
  - WAHA/WhatsApp, opcional

## Instalação

Instale as dependências do frontend:

```bash
npm install
```

Instale as dependências do backend:

```bash
cd backend
npm install
```

Gere o Prisma Client:

```bash
npx prisma generate
```

Execute as migrations no backend:

```bash
npx prisma migrate deploy
```

## Variáveis de Ambiente

Crie um `.env.local` na raiz para o frontend:

```env
VITE_API_URL=http://localhost:3001/api
VITE_CAL_USERNAME=thallyta-silveira-hxfjrf
```

Crie um `backend/.env` para o backend:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://usuario:senha@localhost:5432/site_thallyta

FRONTEND_URL=http://localhost:5173
PUBLIC_FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
PUBLIC_BACKEND_URL=http://localhost:3001

JWT_SECRET=troque-por-uma-chave-segura
SESSION_SECRET=troque-por-outra-chave-segura

CAL_API_KEY=
CAL_API_VERSION=2026-02-25
CAL_USERNAME=thallyta-silveira-hxfjrf

MP_ACCESS_TOKEN=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

WHATSAPP_ENABLED=false
WAHA_BASE_URL=
WAHA_API_KEY=
WAHA_SESSION=default
OWNER_WHATSAPP=
SEND_CLIENT_WHATSAPP=false
SEND_CLIENT_REMINDER_WHATSAPP=false

BOOKING_REMINDER_ENABLED=false
BIRTHDAY_REWARD_ENABLED=false
BIRTHDAY_REWARD_AMOUNT=30
CAL_FALLBACK_SYNC_ENABLED=true
```

Variáveis de seed do admin:

```env
ADMIN_EMAIL=admin@thallyta.com
ADMIN_PASSWORD=senha-segura
ADMIN_NAME=Thallyta Silveira
```

## Execução Local

Em um terminal, suba o backend:

```bash
cd backend
npm run dev
```

Em outro terminal, suba o frontend:

```bash
npm run dev
```

URLs locais:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

## Scripts

Na raiz:

```bash
npm run dev      # inicia o Vite em modo desenvolvimento
npm run build    # gera o build do frontend em dist/
npm run preview  # pré-visualiza o build do frontend
```

No backend:

```bash
npm run dev        # inicia o servidor com node --watch
npm start          # inicia o servidor em modo normal
npm run seed:admin # cria ou atualiza o usuário administrador
npm test           # placeholder sem testes configurados
```

## Usuário Administrador

Para criar o usuário administrador:

```bash
cd backend
npm run seed:admin
```

O script usa `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME` quando essas variáveis existem. Se o usuário já existir, o script garante que ele tenha a role `ADMIN`.

## Fluxo de Agendamento e Pagamento

1. O cliente escolhe serviços no site ou usa `/agendar`.
2. O frontend consulta a agenda pública em `/api/bookings/public-agenda`.
3. Para pagamentos, o backend cria uma preferência em `/api/payments/booking-preference`.
4. O Mercado Pago notifica o backend em `/api/payments/mercado-pago/webhook`.
5. Após confirmação, o backend registra pagamento/agendamento e sincroniza informações de agenda.
6. O cliente acompanha seus agendamentos em `/meus-agendamentos`.
7. O admin acompanha e gerencia tudo em `/admin`.

## Painel Administrativo

O painel `/admin` exige autenticação e role `ADMIN`. Ele concentra:

- Gerenciamento de imagens da galeria.
- Listagem e criação administrativa de agendamentos.
- Conclusão de serviço.
- Marcação de pagamento restante.
- Marcação de não comparecimento.
- Sincronização manual com Cal.com.
- Gestão de depoimentos.
- Gestão de despesas financeiras.
- Bloqueios de agenda.

## Integrações

### Cal.com

Usado para:

- Criação de bookings.
- Cancelamento de bookings.
- Consulta/sincronização de agenda.
- Bloqueios de agenda via Out of Office.
- Webhook em `/api/webhooks/cal`.

Configure `CAL_API_KEY`, `CAL_API_VERSION` e `CAL_USERNAME`.

### Mercado Pago

Usado para pagamentos de agendamento. Configure `MP_ACCESS_TOKEN` e, em produção, garanta que `PUBLIC_BACKEND_URL` esteja apontando para a URL pública do backend para que o webhook funcione.

Webhook:

```text
/api/payments/mercado-pago/webhook
```

### Google OAuth

Ativado somente quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão definidos.

Callback local recomendado:

```text
http://localhost:3001/api/auth/google/callback
```

### Cloudinary

Usado para upload/listagem/exclusão das imagens da galeria administrativa. Configure:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### WhatsApp/WAHA

Opcional. Controlado por:

- `WHATSAPP_ENABLED`
- `WAHA_BASE_URL`
- `WAHA_API_KEY`
- `WAHA_SESSION`
- `OWNER_WHATSAPP`
- `SEND_CLIENT_WHATSAPP`
- `SEND_CLIENT_REMINDER_WHATSAPP`

## PWA e SEO

O PWA é configurado em `vite.config.js` com:

- Manifest `site.webmanifest`.
- Ícones em `public/`.
- Auto update do service worker.
- Cache de imagens.
- Cache de fontes do Google.

SEO e indexação:

- `public/robots.txt`
- `public/sitemap.xml`
- componente `src/components/Seo.jsx`
- headers e rewrites em `vercel.json`

As páginas privadas como login, cadastro, auth, meus agendamentos e admin recebem `X-Robots-Tag: noindex`.

## Deploy

O frontend está preparado para deploy no Vercel:

- `vercel.json` redireciona rotas SPA para `index.html`.
- Arquivos públicos importantes não são redirecionados.
- Headers de segurança básicos são aplicados.

Para produção, ajuste:

```env
NODE_ENV=production
PUBLIC_FRONTEND_URL=https://www.thallytasilveira.com.br
FRONTEND_URL=https://www.thallytasilveira.com.br
BACKEND_URL=https://sua-api.com
PUBLIC_BACKEND_URL=https://sua-api.com
VITE_API_URL=https://sua-api.com/api
```

O backend precisa ser publicado em uma plataforma que suporte Node.js e acesso ao PostgreSQL.

## Build

Para gerar o build do frontend:

```bash
npm run build
```

O resultado é salvo em `dist/`.

## Manutenção

Tarefas comuns:

- Atualizar serviços e preços: `src/data/services.js` e, se necessário, `backend/src/data/services.js`.
- Atualizar imagens públicas: `public/img/`.
- Atualizar SEO: `src/components/Seo.jsx`, `public/sitemap.xml` e `public/robots.txt`.
- Atualizar regras de horário: `src/utils/studioHours.js`, `backend/src/utils/bookingHours.js` e `backend/src/utils/scheduleAvailability.js`.
- Criar novas tabelas/campos: alterar `backend/prisma/schema.prisma` e gerar uma migration.
- Criar admin: `cd backend && npm run seed:admin`.

## Observações de Segurança

- Nunca versionar arquivos `.env`, `.env.local` ou `backend/.env`.
- Trocar `JWT_SECRET`, `SESSION_SECRET` e `ADMIN_PASSWORD` antes de usar em produção.
- Usar HTTPS em produção.
- Conferir URLs públicas de frontend/backend antes de ativar Google OAuth e Mercado Pago.
- Manter `MP_ACCESS_TOKEN`, `CAL_API_KEY`, chaves Cloudinary e WAHA apenas no backend.

## Status dos Testes

Não há suíte de testes automatizados configurada neste momento. O script `backend/npm test` ainda é apenas um placeholder.
