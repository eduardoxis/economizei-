import Icon from '../components/Icon';
import { useEffect, useMemo, useState } from 'react';
import MapaPostos from '../components/MapaPostos';
import { buscarMunicipios, buscarPrecos, buscarPrecosProximos, supabaseConfigurado, type Municipio } from '../lib/supabase';
import { coordenadasDoPosto, distanciaKm, PRODUTOS, labelProduto, priceStatus, type Coordenadas, type PriceRow, type Produto } from '../lib/prices';
import { AvisoPrecos, StatusBadge } from '../components/PriceNotice';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const RAIO_KM = 75;
const kmFormatado = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export default function Postos() {
  const [uf, setUf] = useState('GO');
  const [municipio, setMunicipio] = useState('');
  const [produto, setProduto] = useState<Produto>('gasolina_comum');
  const [linhas, setLinhas] = useState<PriceRow[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(false);
  const [erroMunicipios, setErroMunicipios] = useState(false);
  const [usuario, setUsuario] = useState<Coordenadas | null>(null);
  const [proximidade, setProximidade] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      setErroLocalizacao('O navegador não oferece acesso à localização. Você pode escolher uma cidade.');
      return;
    }
    setErroLocalizacao('');
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUsuario([coords.latitude, coords.longitude]);
        setProximidade(true);
        setLocalizando(false);
      },
      (error) => {
        setLocalizando(false);
        setErroLocalizacao(error.code === 1
          ? 'Permissão negada. Libere a localização no navegador ou escolha uma cidade.'
          : 'Não consegui obter sua localização. Tente novamente ou escolha uma cidade.');
      },
      { timeout: 12000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    if (!supabaseConfigurado) return;
    let cancelado = false;
    setCarregandoMunicipios(true);
    setErroMunicipios(false);
    buscarMunicipios(uf)
      .then((lista) => !cancelado && setMunicipios(lista))
      .catch(() => !cancelado && setErroMunicipios(true))
      .finally(() => !cancelado && setCarregandoMunicipios(false));
    return () => { cancelado = true; };
  }, [uf]);

  useEffect(() => {
    if (!supabaseConfigurado || (!proximidade && !municipio.trim())) {
      setLinhas(null);
      setCarregando(false);
      setErro(null);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    setLinhas(null);
    setPostoSelecionado(null);
    const consulta = proximidade && usuario
      ? buscarPrecosProximos(usuario, produto)
      : buscarPrecos({ uf, municipio: municipio.trim(), produto });
    consulta
      .then((r) => !cancelado && setLinhas(r))
      .catch((e: Error) => !cancelado && setErro(e.message))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [uf, municipio, produto, proximidade, usuario]);

  const resultados = useMemo(() => {
    const itens = (linhas ?? []).map((posto) => {
      const ponto = coordenadasDoPosto(posto);
      return { posto, km: usuario && ponto ? distanciaKm(usuario, ponto) : null };
    });
    return proximidade
      ? itens.filter(({ km }) => km !== null && km <= RAIO_KM)
        .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.posto.preco - b.posto.preco)
      : itens;
  }, [linhas, usuario, proximidade]);
  const pontosNoMapa = useMemo(() => resultados.map(({ posto }) => posto), [resultados]);

  return (
    <section className="comparacao">
      <header className="pagina-titulo">
        <h1>Postos e preços</h1>
        <p>Compare os valores informados na sua cidade.</p>
      </header>
      <div className="painel-comparacao">
        <aside className="painel-mapa" aria-label="Mapa interativo dos postos" id="mapa-postos">
          <div className="mapa-cabecalho">
            <h2>Mapa dos postos</h2>
            <button type="button" className="botao-localizacao" onClick={usarMinhaLocalizacao} disabled={localizando}>
              <Icon name="pin" /> {localizando ? 'Localizando…' : 'Usar minha localização'}
            </button>
          </div>
          <MapaPostos postos={pontosNoMapa} usuario={usuario} modoProximo={proximidade}
            selecionado={postoSelecionado} aoSelecionar={setPostoSelecionado} />
          <div className="mapa-rodape">
            {erroLocalizacao && <p role="status">{erroLocalizacao}</p>}
            {proximidade && <p>Postos com preços pesquisados em até {RAIO_KM} km, em linha reta.</p>}
            {!proximidade && <p>Os marcadores mostram postos com coordenadas no cadastro da ANP.</p>}
            {usuario && <button type="button" className="botao-texto" onClick={() => {
              setProximidade(false);
              setUsuario(null);
              setErroLocalizacao('');
            }}>Limpar minha localização</button>}
          </div>
        </aside>
        <div className="painel-precos">
          <div className="filtros">
            <label>UF
              <select value={uf} onChange={(e) => {
                setUf(e.target.value);
                setMunicipio('');
                setMunicipios([]);
                setProximidade(false);
              }}>
                {UFS.map((sigla) => <option key={sigla}>{sigla}</option>)}
              </select>
            </label>
            <label>Município
              <select value={municipio} onChange={(e) => {
                setMunicipio(e.target.value);
                setProximidade(false);
              }}
                disabled={carregandoMunicipios || municipios.length === 0}>
                <option value="">{carregandoMunicipios ? 'Carregando…' : 'Selecione'}</option>
                {municipios.map((cidade) => <option key={cidade.ibge_id}>{cidade.nome}</option>)}
              </select>
            </label>
            <label>Combustível
              <select value={produto} onChange={(e) => setProduto(e.target.value as Produto)}>
                {PRODUTOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <div aria-live="polite">
            {erroMunicipios && <p className="erro">Não foi possível carregar os municípios. Atualize a página para tentar novamente.</p>}
            {!supabaseConfigurado && <p className="vazio">Banco não configurado. Nenhum preço para exibir.</p>}
            {supabaseConfigurado && !proximidade && !municipio && !erroMunicipios && !carregandoMunicipios &&
              <p className="vazio">Selecione um município.</p>}
            {carregando && <p className="vazio">Carregando preços…</p>}
            {erro && <p className="erro">Não foi possível carregar os preços: {erro}</p>}

            {linhas && resultados.length === 0 && !carregando && !erro && (
              <p className="vazio">{proximidade
                ? 'Não encontrei postos com preços desse combustível e coordenadas no raio informado.'
                : `A base da ANP ainda não tem preços de ${labelProduto(produto)} em ${municipio}.`}</p>
            )}

            {resultados.length > 0 && !carregando && !erro && (
              <table className="tabela-precos">
                <thead><tr><th scope="col">Posto</th><th scope="col">Preço informado</th></tr></thead>
                <tbody>
                  {resultados.map(({ posto: l, km }) => (
                    <tr key={l.cnpj} className={postoSelecionado === l.cnpj ? 'posto-selecionado' : undefined}>
                      <td>
                        <div className="posto">
                          <span className="posto-icone"><Icon name="fuel" /></span>
                          <div>
                            <strong>{l.razao_social ?? 'Posto sem nome'}</strong>
                            <br />
                            <StatusBadge status={priceStatus(l.data_coleta)} dataColeta={l.data_coleta} />
                            <div className="posto-detalhe">
                              {proximidade && <span>{l.municipio.toLocaleUpperCase('pt-BR')}, {l.uf}</span>}
                              {km !== null && <span>{kmFormatado.format(km)} km em linha reta</span>}
                              {coordenadasDoPosto(l) ? <button type="button" className="botao-texto"
                                aria-pressed={postoSelecionado === l.cnpj} onClick={() => {
                                  setPostoSelecionado(l.cnpj);
                                  document.getElementById('mapa-postos')?.scrollIntoView({ block: 'nearest' });
                                }}>Ver no mapa</button>
                                : <span>Sem coordenadas na ANP</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="preco">
                        {l.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        <small> / {l.produto === 'gnv' ? 'm³' : 'L'}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <AvisoPrecos />
        </div>
      </div>
    </section>
  );
}

