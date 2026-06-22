-- ================================================================
-- CADERNETA DIGITAL — Schema completo para Supabase
-- Copia e cola isto no SQL Editor do Supabase (supabase.com)
-- Dashboard → SQL Editor → New Query → Cola → Run
-- ================================================================

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ── UTILIZADORES ────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  avatar_url   text,
  level        int not null default 1,
  xp           int not null default 0,
  coins        int not null default 500,  -- moedas iniciais de boas-vindas
  created_at   timestamptz default now()
);

-- ── COLEÇÕES ─────────────────────────────────────────────────────
create table if not exists collections (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  emoji       text not null default '📚',
  category    text not null default 'geral', -- futebol, anime, gaming, ...
  total_cards int not null default 0,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ── CROMOS (definição) ──────────────────────────────────────────
create table if not exists cards (
  id            uuid primary key default uuid_generate_v4(),
  collection_id uuid not null references collections(id) on delete cascade,
  number        int not null,
  name          text not null,
  emoji         text not null,
  rarity        text not null check (rarity in ('comum','incomum','raro','epico','lendario','exclusivo')),
  description   text,
  image_url     text,
  created_at    timestamptz default now(),
  unique(collection_id, number)
);

-- ── CROMOS DOS UTILIZADORES ─────────────────────────────────────
create table if not exists user_cards (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  card_id    uuid not null references cards(id) on delete cascade,
  quantity   int not null default 1,
  obtained_at timestamptz default now()
);
create unique index if not exists user_cards_uniq on user_cards(user_id, card_id);

-- ── PACKS ────────────────────────────────────────────────────────
create table if not exists packs (
  id            uuid primary key default uuid_generate_v4(),
  collection_id uuid references collections(id),
  name          text not null,
  description   text,
  emoji         text not null default '📦',
  price_coins   int not null,
  cards_per_pack int not null default 5,
  type          text default 'basic' check (type in ('basic','premium','special','event')),
  is_active     boolean default true,
  -- probabilidades (devem somar 100)
  prob_comum    int default 0,
  prob_incomum  int default 0,
  prob_raro     int default 0,
  prob_epico    int default 0,
  prob_lendario int default 0,
  prob_exclusivo int default 0,
  created_at    timestamptz default now()
);

-- ── HISTÓRICO DE PACKS ABERTOS ───────────────────────────────────
create table if not exists pack_openings (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id),
  pack_id    uuid not null references packs(id),
  cards_won  jsonb not null default '[]', -- array de card_ids
  opened_at  timestamptz default now()
);

-- ── MERCADO ──────────────────────────────────────────────────────
create table if not exists market_listings (
  id         uuid primary key default uuid_generate_v4(),
  seller_id  uuid not null references profiles(id),
  card_id    uuid not null references cards(id),
  price      int not null,
  status     text default 'active' check (status in ('active','sold','cancelled')),
  buyer_id   uuid references profiles(id),
  created_at timestamptz default now(),
  sold_at    timestamptz
);

-- ── TROCAS ───────────────────────────────────────────────────────
create table if not exists trades (
  id              uuid primary key default uuid_generate_v4(),
  initiator_id    uuid not null references profiles(id),
  receiver_id     uuid not null references profiles(id),
  offered_card_id uuid not null references cards(id),
  wanted_card_id  uuid not null references cards(id),
  status          text default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at      timestamptz default now(),
  resolved_at     timestamptz
);

-- ── CONQUISTAS ───────────────────────────────────────────────────
create table if not exists achievements (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  description text,
  emoji       text not null,
  xp_reward   int default 0
);

create table if not exists user_achievements (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id),
  achievement_id uuid not null references achievements(id),
  earned_at      timestamptz default now(),
  unique(user_id, achievement_id)
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────
alter table profiles enable row level security;
alter table user_cards enable row level security;
alter table pack_openings enable row level security;
alter table market_listings enable row level security;
alter table trades enable row level security;
alter table user_achievements enable row level security;

-- Utilizador vê apenas o seu próprio perfil (leitura pública, escrita própria)
create policy "Perfis públicos" on profiles for select using (true);
create policy "Editar próprio perfil" on profiles for update using (auth.uid() = id);

-- Cromos: só o próprio utilizador vê e edita
create policy "Ver os meus cromos" on user_cards for select using (auth.uid() = user_id);
create policy "Inserir os meus cromos" on user_cards for insert with check (auth.uid() = user_id);
create policy "Atualizar os meus cromos" on user_cards for update using (auth.uid() = user_id);

-- Mercado: listagens ativas são públicas; só o vendedor pode criar/cancelar
create policy "Ver mercado" on market_listings for select using (status = 'active');
create policy "Criar listagem" on market_listings for insert with check (auth.uid() = seller_id);
create policy "Gerir a minha listagem" on market_listings for update using (auth.uid() = seller_id);

-- ── DADOS DE EXEMPLO ─────────────────────────────────────────────
insert into collections (slug, name, description, emoji, category, total_cards) values
  ('liga-pt-2425', 'Liga Portuguesa 24/25', 'Todos os jogadores da Liga Portugal Betclic 2024-25', '⚽', 'futebol', 240),
  ('anime-legends', 'Anime Legends', 'Os personagens mais icónicos do mundo anime', '🎌', 'anime', 120),
  ('gaming-icons', 'Gaming Icons', 'Lendas dos videojogos de todos os tempos', '🎮', 'gaming', 80)
on conflict (slug) do nothing;

insert into achievements (slug, name, description, emoji, xp_reward) values
  ('first-pack', 'Primeiro Pack', 'Abre o teu primeiro pack', '📦', 50),
  ('collector-100', 'Centenário', 'Coleciona 100 cromos únicos', '💯', 200),
  ('collector-200', 'Colecionador Dedicado', 'Coleciona 200 cromos únicos', '🏆', 500),
  ('first-trade', 'Primeira Troca', 'Completa a tua primeira troca', '🤝', 100),
  ('streak-7', 'Semana Perfeita', 'Login 7 dias seguidos', '🔥', 150),
  ('first-legendary', 'Caça-Lendários', 'Obtém o teu primeiro cromo lendário', '⭐', 300)
on conflict (slug) do nothing;

-- ================================================================
-- FIM DO SCHEMA
-- ================================================================
