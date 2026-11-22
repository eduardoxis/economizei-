import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { distanciaKm, type Coordenadas, type PriceRow, type Produto } from './prices';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Somente a chave anon vai para o front-end. Nunca a service_role.
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) throw new Error('Supabase não configurado');
    client = createClient(url, anonKey);
  }
  return client;
}

export interface Municipio {
  ibge_id: number;
  nome: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
}

export type MunicipioNoRaio = Municipio & { km: number };

export async function buscarMunicipios(uf: string): Promise<Municipio[]> {
  const { data, error } = await getClient()
    .from('municipalities')
    .select('ibge_id, nome, uf, latitude, longitude')
    .eq('uf', uf)
    .order('nome');

  if (error) throw new Error(error.message);
  return (data ?? []) as Municipio[];
}

/** Preços mais recentes de um produto em um município. */
export async function buscarPrecos(params: {
  uf: string;
  municipio: string;
  produto: Produto;
}): Promise<PriceRow[]> {
  const { data, error } = await getClient()
    .from('priced_stations')
    .select('cnpj, razao_social, municipio, uf, produto, preco, data_coleta, latitude, longitude, endereco')
    .eq('uf', params.uf)
    .eq('municipio', params.municipio.toLocaleLowerCase('pt-BR'))
    .eq('produto', params.produto)
    .order('preco', { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as PriceRow[];
}

export async function buscarMunicipiosNoRaio(origem: Coordenadas, raio: number): Promise<MunicipioNoRaio[]> {
  const lat = Number(origem[0].toFixed(2));
  const lng = Number(origem[1].toFixed(2));
  const margemLat = (raio + 2) / 110;
  const cosBorda = Math.cos((Math.min(89, Math.abs(lat) + margemLat)) * Math.PI / 180);
  const margemLng = margemLat / Math.max(0.03, cosBorda);
  const { data, error } = await getClient().from('municipalities')
    .select('ibge_id,nome,uf,latitude,longitude')
    .gte('latitude', lat - margemLat).lte('latitude', lat + margemLat)
    .gte('longitude', lng - margemLng).lte('longitude', lng + margemLng);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Municipio[]).flatMap((cidade) => {
    if (cidade.latitude === null || cidade.longitude === null) return [];
    const km = distanciaKm(origem, [cidade.latitude, cidade.longitude]);
    return km <= raio ? [{ ...cidade, km }] : [];
  }).sort((a, b) => a.km - b.km || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function buscarPrecosDasCidades(ids: number[], produto: Produto): Promise<PriceRow[]> {
  if (!ids.length) return [];
  const precos: PriceRow[] = [];
  const tamanhoPagina = 500;
  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const { data, error } = await getClient().rpc('prices_in_municipalities', {
      city_ids: ids, fuel_type: produto,
    }).order('cnpj').range(inicio, inicio + tamanhoPagina - 1);
    if (error) throw new Error(error.message);
    const pagina = (data ?? []) as PriceRow[];
    precos.push(...pagina);
    if (pagina.length < tamanhoPagina) return precos;
  }
}
