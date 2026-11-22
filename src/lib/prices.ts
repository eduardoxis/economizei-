export const PRODUTOS = [
  { id: 'gasolina_comum', label: 'Gasolina comum' },
  { id: 'gasolina_aditivada', label: 'Gasolina aditivada' },
  { id: 'etanol', label: 'Etanol' },
  { id: 'diesel_s10', label: 'Diesel S10' },
  { id: 'diesel_s500', label: 'Diesel S500' },
  { id: 'gnv', label: 'GNV' },
] as const;

export type Produto = (typeof PRODUTOS)[number]['id'];

export interface PriceRow {
  cnpj: string;
  razao_social: string | null;
  municipio: string;
  uf: string;
  produto: Produto;
  preco: number;
  data_coleta: string; // ISO yyyy-mm-dd
}

export type PriceStatus = 'vigente' | 'desatualizado';

/**
 * A ANP coleta semanalmente e divulga às sextas. Um preço com mais de
 * STALE_AFTER_DAYS dias não pode aparecer como vigente.
 */
export const STALE_AFTER_DAYS = 8;

const MS_POR_DIA = 86_400_000;

export function priceStatus(dataColeta: string, agora: Date = new Date()): PriceStatus {
  const coleta = new Date(`${dataColeta}T00:00:00`);
  const dias = (agora.getTime() - coleta.getTime()) / MS_POR_DIA;
  return dias > STALE_AFTER_DAYS ? 'desatualizado' : 'vigente';
}

export function labelProduto(id: Produto): string {
  return PRODUTOS.find((p) => p.id === id)?.label ?? id;
}
