# 🚀 Guia de Deploy — Caderneta Digital
## Do teu computador para a internet, passo a passo

---

## 📋 O QUE VAIS USAR (tudo gratuito)

| Serviço | Para quê | Custo |
|---|---|---|
| **Supabase** | Base de dados + autenticação | Grátis (até 500MB) |
| **Railway** | Hospedar o backend (Node.js) | Grátis (500h/mês) |
| **Vercel** | Hospedar o frontend | Grátis (ilimitado) |
| **GitHub** | Guardar o código | Grátis |

Tempo estimado: **1 a 2 horas** na primeira vez.

---

## PASSO 1 — Instalar ferramentas no teu PC

```bash
# Instala o Node.js (https://nodejs.org) — versão LTS
# Depois verifica:
node --version   # deve mostrar v18 ou superior
npm --version

# Instala o Git (https://git-scm.com)
git --version
```

---

## PASSO 2 — Configurar o Supabase (base de dados)

1. Vai a **https://supabase.com** e cria uma conta gratuita
2. Clica em **"New Project"**
   - Nome: `caderneta-digital`
   - Password: escolhe uma forte e guarda-a
   - Region: `West EU (Ireland)` — mais perto de Portugal
3. Espera ~2 minutos enquanto cria o projeto

4. **Cria as tabelas** (o mais importante!):
   - No painel lateral, clica em **"SQL Editor"**
   - Clica em **"New Query"**
   - Abre o ficheiro `backend/supabase_schema.sql`
   - Copia TODO o conteúdo e cola no editor
   - Clica em **"Run"** (▶)
   - Deves ver "Success. No rows returned"

5. **Copia as credenciais**:
   - Vai a **Settings → API**
   - Copia o `Project URL` → isto é o `SUPABASE_URL`
   - Copia o `anon public` key → isto é o `SUPABASE_ANON_KEY`
   - Copia o `service_role` key → isto é o `SUPABASE_SERVICE_ROLE_KEY`

6. **Cria funções auxiliares** no SQL Editor:
```sql
-- Função para incrementar XP
create or replace function increment_xp(user_id_param uuid, xp_amount int)
returns void as $$
begin
  update profiles set xp = xp + xp_amount where id = user_id_param;
end;
$$ language plpgsql security definer;

-- Função para incrementar moedas
create or replace function increment_coins(user_id_param uuid, amount int)
returns void as $$
begin
  update profiles set coins = coins + amount where id = user_id_param;
end;
$$ language plpgsql security definer;
```

---

## PASSO 3 — Configurar o Backend localmente

```bash
# Na pasta do projeto:
cd backend

# Instala as dependências
npm install

# Copia o ficheiro de configuração
cp .env.example .env
```

Abre o ficheiro `.env` e preenche com as tuas credenciais do Supabase:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=uma_string_muito_longa_e_aleatoria_aqui_123
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

```bash
# Testa se funciona:
npm run dev

# Deves ver: 🚀 Caderneta Digital backend a correr em http://localhost:3001
# Testa no browser: http://localhost:3001/api/health
```

---

## PASSO 4 — Colocar o código no GitHub

1. Vai a **https://github.com** e cria uma conta
2. Clica em **"New repository"**
   - Nome: `caderneta-digital`
   - Privado ou público (a tua escolha)
   - **NÃO** inicializes com README

3. No teu computador, dentro da pasta `caderneta-digital`:
```bash
git init
git add .
git commit -m "🚀 Caderneta Digital - primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USERNAME/caderneta-digital.git
git push -u origin main
```

⚠️ **IMPORTANTE**: O ficheiro `.env` NÃO deve ir para o GitHub.
Verifica que existe um `.gitignore` com `.env` listado.

---

## PASSO 5 — Deploy do Backend no Railway

1. Vai a **https://railway.app** e cria conta (podes usar o GitHub)
2. Clica em **"New Project"** → **"Deploy from GitHub repo"**
3. Seleciona o repositório `caderneta-digital`
4. Seleciona a pasta `backend` como root directory

5. **Configura as variáveis de ambiente**:
   - No Railway, vai a **Variables**
   - Adiciona cada linha do teu `.env`:
     ```
     SUPABASE_URL = https://xxxxx.supabase.co
     SUPABASE_ANON_KEY = eyJ...
     SUPABASE_SERVICE_ROLE_KEY = eyJ...
     JWT_SECRET = a_tua_string_secreta
     NODE_ENV = production
     FRONTEND_URL = https://caderneta-digital.vercel.app
     ```

6. Clica em **"Deploy"**
7. Após o deploy, copia o URL gerado (ex: `https://caderneta-digital-production.up.railway.app`)

---

## PASSO 6 — Deploy do Frontend no Vercel

O teu frontend atual é um único ficheiro HTML.

1. Vai a **https://vercel.com** e cria conta
2. Clica em **"Add New Project"** → importa o repositório do GitHub
3. Em **Framework Preset**, seleciona **"Other"**
4. Em **Root Directory**, coloca `/` (raiz)
5. Clica em **Deploy**

O Vercel dá-te um URL como: `https://caderneta-digital.vercel.app`

---

## PASSO 7 — Ligar o Frontend ao Backend

No teu ficheiro HTML do frontend, adiciona no início do JavaScript:

```javascript
const API_URL = 'https://caderneta-digital-production.up.railway.app/api';

// Exemplo de login:
async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  localStorage.setItem('token', data.token);
  return data;
}

// Exemplo de abrir um pack:
async function openPack(packId) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/packs/${packId}/open`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  return res.json();
}
```

---

## 📡 ENDPOINTS DISPONÍVEIS

```
POST   /api/auth/register          → Criar conta
POST   /api/auth/login             → Login
POST   /api/auth/refresh           → Renovar token

GET    /api/cards/collections      → Listar coleções
GET    /api/cards/collections/:slug → Cromos de uma coleção
GET    /api/cards/mine             → Os meus cromos
GET    /api/cards/duplicates       → Cromos repetidos

GET    /api/packs                  → Loja de packs
POST   /api/packs/:id/open         → Comprar e abrir pack 🔒

GET    /api/market                 → Ver o mercado
POST   /api/market/list            → Colocar à venda 🔒
POST   /api/market/:id/buy         → Comprar cromo 🔒
DELETE /api/market/:id             → Cancelar venda 🔒

GET    /api/profile/me             → O meu perfil 🔒
GET    /api/profile/:username      → Perfil público

GET    /api/trades/pending         → Trocas pendentes 🔒
POST   /api/trades                 → Propor troca 🔒
PATCH  /api/trades/:id             → Aceitar/rejeitar troca 🔒

🔒 = requer token de autenticação (header: Authorization: Bearer TOKEN)
```

---

## 🆘 PROBLEMAS COMUNS

**"Cannot connect to Supabase"**
→ Verifica o SUPABASE_URL e as keys no ficheiro .env

**"CORS error" no browser**
→ Verifica que o FRONTEND_URL no Railway tem o URL correto do Vercel

**"Table does not exist"**
→ Correu o SQL schema no Supabase? Vai ao SQL Editor e corre o ficheiro novamente.

**Pack aberto mas não mostra cromos**
→ A coleção tem cromos inseridos? Vai ao Supabase → Table Editor → cards e verifica.

---

## 💬 AJUDA

- **Supabase docs**: https://supabase.com/docs
- **Railway docs**: https://docs.railway.app
- **Vercel docs**: https://vercel.com/docs

---

*Caderneta Digital — Estrutura construída para escalar de 0 a milhares de utilizadores.*
