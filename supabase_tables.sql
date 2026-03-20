-- --- TABELA DE PROJETOS ---
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  status text default 'Planejamento' check (status in ('Planejamento', 'Em Execução', 'Concluído')),
  created_by uuid references public.users(uid) on delete set null,
  created_at timestamp with time zone default now()
);

-- Habilitar RLS (Row Level Security)
alter table public.projects enable row level security;

-- Políticas de Acesso para Projetos
create policy "Qualquer autenticado lê projetos" on public.projects for select using (true);
create policy "Membros criam projetos" on public.projects for insert with check (auth.uid() is not null);
create policy "Membros editam projetos" on public.projects for update using (auth.uid() is not null);

-- --- TABELA DE TRANSAÇÕES (ECONOMIA E GASTOS) ---
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('Receita', 'Despesa')),
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  category text default 'Geral',
  date date default current_date,
  created_by uuid references public.users(uid) on delete set null,
  created_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table public.transactions enable row level security;

-- Políticas de Acesso para Transações
create policy "Qualquer autenticado lê transações" on public.transactions for select using (true);
create policy "Membros lançam transações" on public.transactions for insert with check (auth.uid() is not null);
create policy "Membros editam transações" on public.transactions for update using (auth.uid() is not null);
