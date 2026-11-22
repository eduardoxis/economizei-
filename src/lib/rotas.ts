import type { Coordenadas } from './prices';

export interface RotaPosto {
  pontos: Coordenadas[];
  metros: number;
  segundos: number;
}

const provedor = (import.meta.env.VITE_OSRM_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://routing.openstreetmap.de/routed-car';

export async function calcularRota(origem: Coordenadas, destino: Coordenadas, signal: AbortSignal): Promise<RotaPosto> {
  const pontos = [origem, destino].map(([lat, lng]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';');
  const resposta = await fetch(`${provedor}/route/v1/driving/${pontos}?overview=full&geometries=geojson&generate_hints=false`, { signal });
  if (!resposta.ok) throw new Error('Serviço de rotas indisponível.');
  const dados = await resposta.json() as {
    code?: string;
    routes?: { geometry?: { coordinates?: [number, number][] }; distance: number; duration: number }[];
  };
  const rota = dados.routes?.[0];
  const coordenadas = rota?.geometry?.coordinates;
  if (dados.code !== 'Ok' || !rota || !Array.isArray(coordenadas) || coordenadas.length < 2 ||
    !Number.isFinite(rota.distance) || !Number.isFinite(rota.duration) ||
    coordenadas.some((p) => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) {
    throw new Error('Não foi possível encontrar um trajeto pela via.');
  }
  return { pontos: coordenadas.map(([lng, lat]) => [lat, lng]), metros: rota.distance, segundos: rota.duration };
}

export function linkGoogleMaps([lat, lng]: Coordenadas): string {
  const query = new URLSearchParams({ api: '1', destination: `${lat},${lng}`, travelmode: 'driving', dir_action: 'navigate' });
  return `https://www.google.com/maps/dir/?${query}`;
}
