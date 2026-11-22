import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PriceRow, Produto } from './prices';

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

/** Preços mais recentes de um produto em um município. */
export async function buscarPrecos(params: {
  uf: string;
  municipio: string;
  produto: Produto;
}): Promise<PriceRow[]> {
  const { data, error } = await getClient()
    .from('fuel_prices')
    .select('cnpj, razao_social, municipio, uf, produto, preco, data_coleta')
    .eq('uf', params.uf)
    .eq('municipio', params.municipio)
    .eq('produto', params.produto)
    .order('preco', { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as PriceRow[];
}
