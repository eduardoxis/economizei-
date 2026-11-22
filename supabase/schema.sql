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

-- Catálogo oficial do IBGE, separado da amostra semanal de preços da ANP.
create table if not exists public.municipalities (
  ibge_id integer primary key,
  nome text not null check (length(nome) > 0),
  uf char(2) not null check (uf ~ '^[A-Z]{2}$')
);
create index if not exists municipalities_uf_nome_idx on public.municipalities (uf,nome);
alter table public.municipalities enable row level security;
do $
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'municipalities'
      and policyname = 'Catálogo de municípios para leitura'
  ) then
    create policy "Catálogo de municípios para leitura"
      on public.municipalities for select to anon, authenticated using (true);
  end if;
end $;
grant select on public.municipalities to anon,authenticated;
notify pgrst, 'reload schema';

-- Localizações do cadastro de revendedores da ANP e busca por proximidade.
create table if not exists public.station_locations (
  cnpj text primary key check (cnpj ~ '^[0-9]{14}$'),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  endereco text
);
alter table public.station_locations enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='station_locations'
      and policyname='Localizações públicas da ANP'
  ) then
    create policy "Localizações públicas da ANP" on public.station_locations for select to anon, authenticated using (true);
  end if;
end $$;
grant select on public.station_locations to anon, authenticated;
create index if not exists station_locations_lat_lng_idx on public.station_locations (latitude, longitude);

create or replace view public.priced_stations with (security_invoker = true) as
select distinct on (p.cnpj, p.produto)
  p.cnpj, p.razao_social, p.municipio, p.uf, p.produto, p.preco, p.data_coleta,
  s.latitude, s.longitude, s.endereco
from public.fuel_prices p
left join public.station_locations s using (cnpj)
order by p.cnpj, p.produto, p.data_coleta desc, p.id desc;
grant select on public.priced_stations to anon, authenticated;

create or replace function public.nearby_priced_stations(
  origin_lat double precision, origin_lng double precision, fuel_type text
) returns setof public.priced_stations
language sql stable security invoker set search_path = ''
as $$
  select p.*
  from public.priced_stations p
  where origin_lat between -85 and 85 and origin_lng between -180 and 180
    and p.produto = fuel_type
    and p.latitude between origin_lat - 0.70 and origin_lat + 0.70
    and p.longitude between origin_lng - 0.70 / greatest(0.08, cos(radians(origin_lat)))
                        and origin_lng + 0.70 / greatest(0.08, cos(radians(origin_lat)))
  order by power(p.latitude - origin_lat, 2)
         + power((p.longitude - origin_lng) * cos(radians(origin_lat)), 2),
           p.preco, p.cnpj
  limit 100;
$$;
revoke execute on function public.nearby_priced_stations(double precision,double precision,text) from public;
grant execute on function public.nearby_priced_stations(double precision,double precision,text) to anon, authenticated;
notify pgrst, 'reload schema';

-- Coordenadas das sedes do IBGE para a busca por raio.
alter table public.municipalities add column if not exists latitude double precision,
 add column if not exists longitude double precision;
create index if not exists municipalities_coordinates_idx on public.municipalities (latitude,longitude);
create or replace function public.prices_in_municipalities(city_ids integer[], fuel_type text)
returns setof public.priced_stations
language sql stable security invoker set search_path = ''
as $$
  select p.*
  from public.priced_stations p
  join public.municipalities m on m.uf = p.uf and lower(m.nome) = p.municipio
  where m.ibge_id = any (city_ids) and p.produto = fuel_type;
$$;
revoke execute on function public.prices_in_municipalities(integer[],text) from public;
grant execute on function public.prices_in_municipalities(integer[],text) to anon, authenticated;
notify pgrst, 'reload schema';
