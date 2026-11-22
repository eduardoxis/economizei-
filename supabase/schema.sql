-- Economizei+ | schema inicial (Supabase / PostgreSQL)
-- Fonte: Levantamento de Preços de Combustíveis (LPC) da ANP.
-- O CSV da ANP não traz coordenadas; a localização entra em tabela separada depois.

create table if not exists public.fuel_prices (
  id            bigint generated always as identity primary key,
  semana_ref    text        not null,          -- ex.: '2026-W45', chave da importação
  data_coleta   date        not null,          -- data da observação, obrigatória na UI
  cnpj          text        not null,
  razao_social  text,
  municipio     text        not null,
  uf            char(2)     not null,
  produto       text        not null check (produto in (
                  'gasolina_comum', 'gasolina_aditivada', 'etanol',
                  'diesel_s10', 'diesel_s500', 'gnv')),
  preco         numeric(6,3) not null check (preco > 0 and preco < 100),
  importado_em  timestamptz not null default now(),
  -- idempotência: reimportar a mesma semana não duplica linhas
  unique (semana_ref, cnpj, produto)
);

create index if not exists fuel_prices_municipio_produto_idx
  on public.fuel_prices (uf, municipio, produto, data_coleta desc);

create table if not exists public.import_runs (
  id           bigint generated always as identity primary key,
  semana_ref   text        not null,
  arquivo_hash text,
  status       text        not null check (status in ('ok', 'falhou')),
  erro         text,
  linhas       integer,
  executado_em timestamptz not null default now()
);

-- RLS: leitura pública (anon), escrita só com service_role (job de importação).
alter table public.fuel_prices enable row level security;
alter table public.import_runs enable row level security;

grant select on public.fuel_prices to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'fuel_prices'
      and policyname = 'preços são públicos para leitura'
  ) then
    create policy "preços são públicos para leitura"
      on public.fuel_prices for select
      to anon, authenticated
      using (true);
  end if;
end $$;

notify pgrst, 'reload schema';

-- Nenhuma policy de insert/update/delete: anon e authenticated não escrevem.
-- O service_role ignora RLS e é usado apenas no GitHub Actions, nunca no front-end.
