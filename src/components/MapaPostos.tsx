import { useEffect, useRef, useState } from 'react';
import { coordenadasDoPosto, labelProduto, type Coordenadas, type PriceRow } from '../lib/prices';
import { calcularRota, linkGoogleMaps, type RotaPosto } from '../lib/rotas';
import Icon from './Icon';

interface Mapa {
  setView(ponto: Coordenadas, zoom: number): Mapa;
  fitBounds(pontos: Coordenadas[], opcoes: { padding: Coordenadas; maxZoom: number }): void;
  getZoom(): number;
  invalidateSize(): void;
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
  getElement(): HTMLElement | undefined;
  openPopup(): void;
}

interface Leaflet {
  map(elemento: HTMLElement, opcoes: { scrollWheelZoom: boolean }): Mapa;
  tileLayer(url: string, opcoes: { attribution: string; maxZoom: number }): { addTo(mapa: Mapa): void };
  layerGroup(): Grupo;
  divIcon(opcoes: { className: string; html: string; iconSize: Coordenadas; iconAnchor: Coordenadas; popupAnchor: Coordenadas }): unknown;
  marker(ponto: Coordenadas, opcoes: { icon: unknown; title: string; alt: string }): Marcador;
  polyline(pontos: Coordenadas[], opcoes: { color: string; weight: number; opacity: number }): { addTo(grupo: Grupo): void };
}

const svgPosto = '<svg viewBox="0 0 36 46" width="36" height="46" aria-hidden="true"><path fill="#078322" stroke="#fff" stroke-width="2" d="M18 2a16 16 0 0 1 16 16c0 10-16 26-16 26S2 28 2 18A16 16 0 0 1 18 2Z"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M11 27V13h10v14m-12 0h14M11 19h10m0 2h2a2 2 0 0 1 2 2v1a1.5 1.5 0 0 0 3 0v-6l-3-3"/></svg>';
const svgPessoa = '<svg viewBox="0 0 32 38" width="32" height="38" aria-hidden="true"><path fill="#13569e" stroke="#fff" stroke-width="2" d="M16 2a14 14 0 0 1 14 14c0 8-14 20-14 20S2 24 2 16A14 14 0 0 1 16 2Z"/><circle fill="#fff" cx="16" cy="11" r="3.6"/><path fill="#fff" d="M16 16c-4.5 0-7.5 3-7.5 6.5v1h15v-1C23.5 19 20.5 16 16 16Z"/></svg>';
const formatoKm = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

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
    const limite = window.setTimeout(() => falhar(), 15000);
    const falhar = () => {
      window.clearTimeout(limite);
      css.remove();
      script.remove();
      reject(new Error('Mapa indisponível'));
    };
    css.onerror = falhar;
    script.onerror = falhar;
    let cssPronto = false;
    let api: Leaflet | undefined;
    const concluir = () => {
      if (cssPronto && api) {
        window.clearTimeout(limite);
        resolve(api);
      }
    };
    css.onload = () => { cssPronto = true; concluir(); };
    script.onload = () => {
      api = (window as Window & { L?: Leaflet }).L;
      if (api) concluir();
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
  detalhes.textContent = posto.endereco ?? `${posto.municipio}, ${posto.uf}`;
  const preco = document.createElement('div');
  preco.textContent = `${labelProduto(posto.produto)} · ${posto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/${posto.produto === 'gnv' ? 'm³' : 'L'}`;
  container.append(nome, detalhes, preco);
  return container;
}

function limitesDoRaio([lat, lng]: Coordenadas, raioKm: number): Coordenadas[] {
  const radianos = Math.PI / 180;
  const arco = raioKm / 6371;
  const margemLat = arco / radianos;
  const margemLng = Math.asin(Math.min(1, Math.sin(arco) / Math.cos(lat * radianos))) / radianos;
  return [
    [Math.max(-85, lat - margemLat), lng - margemLng],
    [Math.min(85, lat + margemLat), lng + margemLng],
  ];
}

interface Props {
  postos: PriceRow[];
  usuario: Coordenadas | null;
  modoProximo: boolean;
  origemBusca: Coordenadas | null;
  raioBuscaKm: number;
  selecionado: string | null;
  aoSelecionar: (cnpj: string) => void;
}

export default function MapaPostos({ postos, usuario, modoProximo, origemBusca, raioBuscaKm, selecionado, aoSelecionar }: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const inst = useRef<null | { api: Leaflet; mapa: Mapa; grupo: Grupo; trajetos: Grupo }>(null);
  const marcadores = useRef(new Map<string, Marcador>());
  const [status, setStatus] = useState<'carregando' | 'pronto' | 'erro'>('carregando');
  const [expandido, setExpandido] = useState(false);
  const [rota, setRota] = useState<RotaPosto | null>(null);
  const [carregandoRota, setCarregandoRota] = useState(false);
  const [erroRota, setErroRota] = useState('');
  const consultaRota = useRef<AbortController | null>(null);
  const ultimaRota = useRef(0);
  const posto = postos.find((item) => item.cnpj === selecionado);
  const destino = posto ? coordenadasDoPosto(posto) : null;
  const quantidade = postos.filter((item) => coordenadasDoPosto(item) !== null).length;

  useEffect(() => {
    setRota(null);
    setErroRota('');
    setCarregandoRota(false);
    return () => { consultaRota.current?.abort(); consultaRota.current = null; };
  }, [selecionado, usuario, postos]);

  useEffect(() => {
    if (!expandido) return;
    const sair = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setExpandido(false);
    };
    window.addEventListener('keydown', sair);
    return () => window.removeEventListener('keydown', sair);
  }, [expandido]);

  async function tracarRota() {
    if (!usuario || !destino || carregandoRota || Date.now() - ultimaRota.current < 1000) return;
    ultimaRota.current = Date.now();
    const controller = new AbortController();
    consultaRota.current = controller;
    const limite = window.setTimeout(() => controller.abort(), 12000);
    setCarregandoRota(true);
    setRota(null);
    setErroRota('');
    try {
      const caminho = await calcularRota(usuario, destino, controller.signal);
      if (consultaRota.current === controller) setRota(caminho);
    } catch {
      if (consultaRota.current === controller) setErroRota('Não foi possível traçar a rota agora. Você ainda pode abrir o Google Maps.');
    } finally {
      window.clearTimeout(limite);
      if (consultaRota.current === controller) {
        consultaRota.current = null;
        setCarregandoRota(false);
      }
    }
  }

  useEffect(() => {
    let cancelado = false;
    carregarLeaflet().then((api) => {
      if (cancelado || !elemento.current) return;
      const mapa = api.map(elemento.current, { scrollWheelZoom: false }).setView([-14.2, -51.9], 4);
      api.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapa);
      inst.current = { api, mapa, grupo: api.layerGroup().addTo(mapa), trajetos: api.layerGroup().addTo(mapa) };
      setStatus('pronto');
    }).catch(() => { if (!cancelado) setStatus('erro'); });
    return () => { cancelado = true; inst.current?.mapa.remove(); inst.current = null; };
  }, []);

  useEffect(() => {
    const mapa = inst.current?.mapa;
    const container = elemento.current;
    if (status !== 'pronto' || !mapa || !container) return;
    let frame = requestAnimationFrame(() => mapa.invalidateSize());
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => mapa.invalidateSize());
    });
    observador?.observe(container);
    return () => {
      observador?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [expandido, status]);

  useEffect(() => {
    const estado = inst.current;
    if (status !== 'pronto' || !estado) return;
    const { api, mapa, grupo } = estado;
    grupo.clearLayers();
    marcadores.current.clear();
    const pontos: Coordenadas[] = [];
    const pin = api.divIcon({ className: 'pin-posto', html: svgPosto, iconSize: [36, 46], iconAnchor: [18, 44], popupAnchor: [0, -41] });
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
      const pontoUsuario = api.divIcon({ className: 'pin-usuario', html: svgPessoa, iconSize: [32, 38], iconAnchor: [16, 36], popupAnchor: [0, -32] });
      const texto = document.createElement('span');
      texto.textContent = 'Sua localização';
      api.marker(usuario, { icon: pontoUsuario, title: 'Sua localização', alt: 'Sua localização' })
        .bindPopup(texto).addTo(grupo);
      if (modoProximo || pontos.length === 0) pontos.push(usuario);
    }
    if (origemBusca && raioBuscaKm > 0 && Math.abs(origemBusca[0]) < 85) {
      mapa.fitBounds(limitesDoRaio(origemBusca, raioBuscaKm), { padding: [28, 28], maxZoom: 15 });
    } else if (pontos.length > 1) mapa.fitBounds(pontos, { padding: [30, 30], maxZoom: 15 });
    else if (pontos.length === 1) mapa.setView(pontos[0], 14);
    else mapa.setView([-14.2, -51.9], 4);
  }, [postos, usuario, modoProximo, origemBusca, raioBuscaKm, status, aoSelecionar]);

  useEffect(() => {
    for (const [cnpj, marcador] of marcadores.current) {
      marcador.getElement()?.classList.toggle('pin-ativo', cnpj === selecionado);
    }
    if (status !== 'pronto' || !selecionado) return;
    const marcador = marcadores.current.get(selecionado);
    const mapa = inst.current?.mapa;
    if (!mapa || !marcador) return;
    const { lat, lng } = marcador.getLatLng();
    mapa.setView([lat, lng], Math.max(14, mapa.getZoom()));
    marcador.openPopup();
  }, [status, selecionado, postos]);

  useEffect(() => {
    const estado = inst.current;
    if (status !== 'pronto' || !estado) return;
    estado.trajetos.clearLayers();
    if (!rota) return;
    estado.api.polyline(rota.pontos, { color: '#fff', weight: 9, opacity: .85 }).addTo(estado.trajetos);
    estado.api.polyline(rota.pontos, { color: '#185fc4', weight: 5, opacity: .94 }).addTo(estado.trajetos);
    estado.mapa.fitBounds(rota.pontos, { padding: [35, 35], maxZoom: 16 });
  }, [status, rota]);

  return (
    <div className={expandido ? 'mapa-exibicao mapa-expandido' : 'mapa-exibicao'}>
    <div className="mapa-area">
      <div ref={elemento} className="mapa-interativo" aria-label="Mapa dos postos" />
      {status === 'pronto' && <>
        <div className="mapa-contagem"><Icon name="fuel" /> Postos no mapa: <strong>{quantidade}</strong></div>
        <button className="mapa-expandir" type="button" onClick={() => setExpandido((atual) => !atual)}
          aria-label={expandido ? 'Sair da tela cheia' : 'Expandir mapa'} title={expandido ? 'Sair da tela cheia' : 'Expandir mapa'}>
          <Icon name={expandido ? 'close' : 'expand'} />
        </button>
      </>}
      {status !== 'pronto' && <p className="mapa-mensagem" role="status">
        {status === 'erro' ? 'Não foi possível carregar o mapa. A lista de preços continua disponível.' : 'Carregando mapa…'}
      </p>}
    </div>
    {destino && <section className="mapa-rota eco-entrada" aria-label="Rota para o posto selecionado">
      <strong>{posto?.razao_social ?? 'Posto selecionado'}</strong>
      <div className="mapa-acoes-rota">
        <button className="botao-localizacao" type="button" disabled={!usuario || carregandoRota} onClick={tracarRota}>
          {carregandoRota ? 'Calculando rota…' : 'Traçar rota'}
        </button>
        <a className="botao-localizacao" href={linkGoogleMaps(destino)} target="_blank" rel="noopener noreferrer">Ir até o posto</a>
      </div>
      {!usuario && <p>Use sua localização para traçar a rota no mapa.</p>}
      {usuario && !rota && !erroRota && <p>Ao traçar a rota, a origem e o destino são enviados ao serviço de rotas.</p>}
      {carregandoRota && <p role="status">Calculando o trajeto pelas ruas…</p>}
      {erroRota && <p role="alert">{erroRota}</p>}
      {rota && <p role="status">{formatoKm.format(rota.metros / 1000)} km por estrada · cerca de {Math.max(1, Math.round(rota.segundos / 60))} min</p>}
      <p>Rotas: <a href="https://routing.openstreetmap.de/about.html">OSRM / FOSSGIS</a> · <a href="https://www.openstreetmap.org/fixthemap">Corrigir o mapa</a></p>
    </section>}
    </div>
  );
}

