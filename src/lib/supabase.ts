import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Coordenadas, PriceRow, Produto } from './prices';

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
}

export async function buscarMunicipios(uf: string): Promise<Municipio[]> {
  const { data, error } = await getClient()
    .from('municipalities')
    .select('ibge_id, nome')
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

export async function buscarPrecosProximos([lat, lng]: Coordenadas, produto: Produto): Promise<PriceRow[]> {
  const { data, error } = await getClient().rpc('nearby_priced_stations', {
    origin_lat: Number(lat.toFixed(2)),
    origin_lng: Number(lng.toFixed(2)),
    fuel_type: produto,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as PriceRow[];
}
