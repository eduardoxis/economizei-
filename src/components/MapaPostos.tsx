import { useEffect, useRef, useState } from 'react';
import { coordenadasDoPosto, type Coordenadas, type PriceRow } from '../lib/prices';

interface Mapa {
  setView(ponto: Coordenadas, zoom: number): Mapa;
  fitBounds(pontos: Coordenadas[], opcoes: { padding: Coordenadas; maxZoom: number }): void;
  getZoom(): number;
  remove(): void;
}

interface Grupo {
  addTo(mapa: Mapa): Grupo;
  clearLayers(): void;
}

interface Marcador {
  addTo(grupo: Grupo): Marcador;
  bindPopup(conteudo: HTMLElement): Marcador;
  on(evento: 'click', acao: () => void): Marcador;
  getLatLng(): { lat: number; lng: number };
  openPopup(): void;
}

interface Leaflet {
  map(elemento: HTMLElement, opcoes: { scrollWheelZoom: boolean }): Mapa;
  tileLayer(url: string, opcoes: { attribution: string; maxZoom: number }): { addTo(mapa: Mapa): void };
  layerGroup(): Grupo;
  divIcon(opcoes: { className: string; iconSize: Coordenadas; iconAnchor: Coordenadas; popupAnchor: Coordenadas }): unknown;
  marker(ponto: Coordenadas, opcoes: { icon: unknown; title: string; alt: string }): Marcador;
}

const leafletUrl = 'https://unpkg.com/leaflet@1.9.4/dist';
let carregamento: Promise<Leaflet> | undefined;

function carregarLeaflet(): Promise<Leaflet> {
  if (carregamento) return carregamento;
  carregamento = new Promise<Leaflet>((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = leafletUrl + '/leaflet.css';
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    css.crossOrigin = 'anonymous';
    const script = document.createElement('script');
    script.src = leafletUrl + '/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = 'anonymous';
    const falhar = () => { css.remove(); script.remove(); reject(new Error('Mapa indisponível')); };
    css.onerror = falhar;
    script.onerror = falhar;
    script.onload = () => {
      const api = (window as Window & { L?: Leaflet }).L;
      if (api) resolve(api);
      else falhar();
    };
    document.head.append(css, script);
  }).catch((error: Error) => { carregamento = undefined; throw error; });
  return carregamento;
}

function criarPopup(posto: PriceRow): HTMLElement {
  const container = document.createElement('div');
  const nome = document.createElement('strong');
  nome.textContent = posto.razao_social ?? 'Posto sem nome';
  const detalhes = document.createElement('div');
  detalhes.textContent = posto.endereco ?? '';
  container.append(nome, detalhes);
  return container;
}

interface Props {
  postos: PriceRow[];
  usuario: Coordenadas | null;
  modoProximo: boolean;
  selecionado: string | null;
  aoSelecionar: (cnpj: string) => void;
}

export default function MapaPostos({ postos, usuario, modoProximo, selecionado, aoSelecionar }: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const inst = useRef<null | { api: Leaflet; mapa: Mapa; grupo: Grupo }>(null);
  const marcadores = useRef(new Map<string, Marcador>());
  const [status, setStatus] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  useEffect(() => {
    let cancelado = false;
    carregarLeaflet().then((api) => {
      if (cancelado || !elemento.current) return;
      const mapa = api.map(elemento.current, { scrollWheelZoom: false }).setView([-14.2, -51.9], 4);
      api.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapa);
      inst.current = { api, mapa, grupo: api.layerGroup().addTo(mapa) };
      setStatus('pronto');
    }).catch(() => { if (!cancelado) setStatus('erro'); });
    return () => { cancelado = true; inst.current?.mapa.remove(); inst.current = null; };
  }, []);

  useEffect(() => {
    const estado = inst.current;
    if (status !== 'pronto' || !estado) return;
    const { api, mapa, grupo } = estado;
    grupo.clearLayers();
    marcadores.current.clear();
    const pontos: Coordenadas[] = [];
    const pin = api.divIcon({ className: 'pin-posto', iconSize: [20, 20], iconAnchor: [10, 10], popupAnchor: [0, -12] });
    for (const posto of postos) {
      const ponto = coordenadasDoPosto(posto);
      if (!ponto) continue;
      const nome = posto.razao_social ?? 'Posto sem nome';
      const marcador = api.marker(ponto, { icon: pin, title: nome, alt: nome })
        .bindPopup(criarPopup(posto)).on('click', () => aoSelecionar(posto.cnpj)).addTo(grupo);
      marcadores.current.set(posto.cnpj, marcador);
      pontos.push(ponto);
    }
    if (usuario) {
      const pontoUsuario = api.divIcon({ className: 'pin-usuario', iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -12] });
      const texto = document.createElement('span');
      texto.textContent = 'Sua localização';
      api.marker(usuario, { icon: pontoUsuario, title: 'Sua localização', alt: 'Sua localização' })
        .bindPopup(texto).addTo(grupo);
      if (modoProximo || pontos.length === 0) pontos.push(usuario);
    }
    if (pontos.length > 1) mapa.fitBounds(pontos, { padding: [30, 30], maxZoom: 15 });
    else if (pontos.length === 1) mapa.setView(pontos[0], 14);
    else mapa.setView([-14.2, -51.9], 4);
  }, [postos, usuario, modoProximo, status, aoSelecionar]);

  useEffect(() => {
    if (status !== 'pronto' || !selecionado) return;
    const marcador = marcadores.current.get(selecionado);
    const mapa = inst.current?.mapa;
    if (!mapa || !marcador) return;
    const { lat, lng } = marcador.getLatLng();
    mapa.setView([lat, lng], Math.max(14, mapa.getZoom()));
    marcador.openPopup();
  }, [status, selecionado, postos]);

  return (
    <div className="mapa-area">
      <div ref={elemento} className="mapa-interativo" aria-label="Mapa dos postos" />
      {status !== 'pronto' && <p className="mapa-mensagem" role="status">
        {status === 'erro' ? 'Não foi possível carregar o mapa. A lista de preços continua disponível.' : 'Carregando mapa…'}
      </p>}
    </div>
  );
}

