# Backend real no Render

Este projeto tem dois modos de dados:

- `localStorage`: somente no navegador, sem backend real.
- `api`: autenticação JWT + API Express + Postgres.

Use `localStorage` no desenvolvimento local e `api` na nuvem pelo Render.

## Render automatizado

O arquivo `render.yaml` define toda a infraestrutura principal:

- `sighidro-db`: Postgres gerenciado.
- `sighidro-api`: Web Service Node/Express.
- `sighidro-web`: Static Site Vite.

O Render cria automaticamente:

- `DATABASE_URL`, vindo do banco `sighidro-db`.
- `JWT_SECRET`, gerado pelo blueprint.
- Deploy da API em `https://sighidro-api.onrender.com`.
- Deploy do frontend em `https://sighidro-web.onrender.com`.

Voce ainda precisa preencher manualmente no Render:

```env
ADMIN_PASSWORD=<senha forte do usuario admin>
```

Esse valor fica marcado como `sync: false`, entao nao entra no Git.

Em producao, `ALLOW_IN_MEMORY_DB=false`. Se o Postgres falhar, o backend falha tambem. Isso evita operar com dados temporarios.

## Local para programar

No local, use o frontend em modo simples:

```env
VITE_SIGHIDRO_BACKEND=localStorage
VITE_API_BASE_URL=
VITE_ADMIN_EMAIL=controleinterno.jardimce@gmail.com
VITE_ADMIN_PASSWORD=Admin@2026
```

```bash
npm run dev
```

Assim voce programa a interface sem depender do banco real.

## Opcional: API local

Se algum dia quiser testar a API localmente, o projeto tambem tem `docker-compose.yml` para subir Postgres:

```bash
docker compose up -d postgres
npm run dev:api
```

Nesse caso, ajuste `.env.local` temporariamente para:

```env
VITE_SIGHIDRO_BACKEND=api
VITE_API_BASE_URL=http://127.0.0.1:4000
DATABASE_URL=postgresql://sighidro:sighidro@localhost:5432/sighidro
JWT_SECRET=troque-por-uma-chave-local
ADMIN_EMAIL=controleinterno.jardimce@gmail.com
ADMIN_PASSWORD=Admin@2026
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
ALLOW_IN_MEMORY_DB=false
```

## Dominio proprio

O padrão atual usa URLs automaticas do Render. Se usar dominio proprio depois:

- API: configure `api.sighidro.tech` no servico `sighidro-api`.
- Frontend: configure `sighidro.tech` no servico `sighidro-web`.
- Atualize `CORS_ORIGIN=https://sighidro.tech`.
- Atualize `VITE_API_BASE_URL=https://api.sighidro.tech`.
