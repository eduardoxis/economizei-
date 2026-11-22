import Icon from '../components/Icon';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import MapaPostos from '../components/MapaPostos';
import Carregamento from '../components/Carregamento';
import { buscarMunicipios, buscarMunicipiosNoRaio, buscarPrecos, buscarPrecosDasCidades, supabaseConfigurado, type Municipio, type MunicipioNoRaio } from '../lib/supabase';
import { coordenadasDoPosto, distanciaKm, PRODUTOS, labelProduto, priceStatus, type Coordenadas, type PriceRow, type Produto } from '../lib/prices';
import { AvisoPrecos, StatusBadge } from '../components/PriceNotice';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const RAIOS_KM = [10, 25, 50, 75, 100];
const kmFormatado = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

interface Busca {
  uf: string;
  municipio: string;
  produto: Produto;
  raio: number;
  origem: Coordenadas | null;
  proximidade: boolean;
}

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
  const [raio, setRaio] = useState(0);
  const [cidadesNoRaio, setCidadesNoRaio] = useState<MunicipioNoRaio[]>([]);
  const [cidadeFiltrada, setCidadeFiltrada] = useState('');
  const [localizando, setLocalizando] = useState(false);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [postoSelecionado, setPostoSelecionado] = useState<string | null>(null);
  const [busca, setBusca] = useState<Busca | null>(null);

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
        setRaio((atual) => atual || 75);
        setCidadeFiltrada('');
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
    const controller = new AbortController();
    const limite = window.setTimeout(() => controller.abort(), 15000);
    setCarregandoMunicipios(true);
    setErroMunicipios(false);
    buscarMunicipios(uf, controller.signal)
      .then((lista) => !cancelado && setMunicipios(lista))
      .catch(() => !cancelado && setErroMunicipios(true))
      .finally(() => {
        window.clearTimeout(limite);
        if (!cancelado) setCarregandoMunicipios(false);
      });
    return () => { cancelado = true; window.clearTimeout(limite); controller.abort(); };
  }, [uf]);

  const cidadeBase = municipios.find((cidade) => cidade.nome === municipio);
  const origem = useMemo<Coordenadas | null>(() => {
    if (proximidade) return usuario;
    return cidadeBase && cidadeBase.latitude !== null && cidadeBase.longitude !== null
      ? [cidadeBase.latitude, cidadeBase.longitude] : null;
  }, [cidadeBase, proximidade, usuario]);
  const filtrarPorRaio = raio > 0;
  const raioAplicado = (busca?.raio ?? 0) > 0;
  const podePesquisar = supabaseConfigurado && !localizando
    && (proximidade ? usuario !== null : municipio !== '' && !carregandoMunicipios)
    && (!filtrarPorRaio || origem !== null);

  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!podePesquisar) return;
    setBusca({ uf, municipio, produto, raio, origem, proximidade });
  }

  useEffect(() => {
    setCidadesNoRaio([]);
    setCidadeFiltrada('');
    setPostoSelecionado(null);
    if (!busca) {
      setLinhas(null);
      setCarregando(false);
      setErro(null);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    setLinhas(null);
    const controller = new AbortController();
    const limite = window.setTimeout(() => controller.abort(), 20000);
    const consulta = busca.raio > 0 && busca.origem
      ? buscarMunicipiosNoRaio(busca.origem, busca.raio, controller.signal).then((cidades) => {
        if (cancelado) return [];
        setCidadesNoRaio(cidades);
        return buscarPrecosDasCidades(cidades.map((cidade) => cidade.ibge_id), busca.produto, controller.signal);
      })
      : buscarPrecos(busca, controller.signal);
    consulta
      .then((r) => !cancelado && setLinhas(r))
      .catch(() => !cancelado && setErro(controller.signal.aborted ? 'A consulta demorou demais. Tente pesquisar novamente.' : 'Não foi possível consultar os preços. Tente novamente.'))
      .finally(() => {
        window.clearTimeout(limite);
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
      window.clearTimeout(limite);
      controller.abort();
    };
  }, [busca]);

  const resultados = useMemo(() => {
    const filtro = cidadesNoRaio.find((cidade) => String(cidade.ibge_id) === cidadeFiltrada);
    const itens = (linhas ?? []).filter((posto) => !filtro ||
      (posto.uf === filtro.uf && posto.municipio === filtro.nome.toLocaleLowerCase('pt-BR'))).map((posto) => {
      const ponto = coordenadasDoPosto(posto);
      const referencia = raioAplicado ? busca?.origem : usuario;
      return { posto, km: referencia && ponto ? distanciaKm(referencia, ponto) : null };
    });
    return raioAplicado
      ? itens.filter(({ km }) => km !== null && km <= (busca?.raio ?? 0))
        .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.posto.preco - b.posto.preco)
      : itens;
  }, [linhas, usuario, busca, raioAplicado, cidadesNoRaio, cidadeFiltrada]);
  const pontosNoMapa = useMemo(() => resultados.map(({ posto }) => posto), [resultados]);

  return (
    <section className="comparacao">
      <header className="pagina-titulo eco-entrada">
        <h1>Postos e preços</h1>
        <p>Compare os valores informados na sua cidade.</p>
      </header>
      <div className="painel-comparacao">
        <aside className="painel-mapa eco-entrada" aria-label="Mapa interativo dos postos" id="mapa-postos">
          <div className="mapa-cabecalho">
            <h2>Mapa dos postos</h2>
            <button type="button" className="botao-localizacao" onClick={usarMinhaLocalizacao} disabled={localizando}>
              <Icon name="pin" /> {localizando ? 'Localizando…' : 'Usar minha localização'}
            </button>
          </div>
          <MapaPostos postos={pontosNoMapa} usuario={usuario} modoProximo={busca?.proximidade ?? proximidade}
            origemBusca={busca?.origem ?? null} raioBuscaKm={busca?.raio ?? 0}
            selecionado={postoSelecionado} aoSelecionar={setPostoSelecionado} />
          <div className="mapa-rodape">
            {erroLocalizacao && <p role="status">{erroLocalizacao}</p>}
            {raioAplicado && busca
              ? <p>Cidades e postos em até {busca.raio} km em linha reta de {busca.proximidade ? 'você' : busca.municipio}.</p>
              : <p>Os marcadores mostram postos com coordenadas no cadastro da ANP.</p>}
            {usuario && <button type="button" className="botao-texto" onClick={() => {
              setProximidade(false);
              setUsuario(null);
              setErroLocalizacao('');
              setCidadeFiltrada('');
              if (busca?.proximidade) setBusca(null);
            }}>Limpar minha localização</button>}
          </div>
        </aside>
        <div className="painel-precos eco-entrada">
          <form onSubmit={pesquisar} aria-label="Filtros de postos">
          <div className="filtros">
            <label>UF
              <select value={uf} onChange={(e) => {
                setUf(e.target.value);
                setMunicipio('');
                setMunicipios([]);
                setProximidade(false);
                setCidadeFiltrada('');
              }}>
                {UFS.map((sigla) => <option key={sigla} value={sigla}>{sigla}</option>)}
              </select>
            </label>
            <label>Município
              <select value={municipio} onChange={(e) => {
                setMunicipio(e.target.value);
                setProximidade(false);
                setCidadeFiltrada('');
              }}
                disabled={carregandoMunicipios || municipios.length === 0}>
                <option value="">{carregandoMunicipios ? 'Carregando…' : 'Selecione'}</option>
                {municipios.map((cidade) => <option key={cidade.ibge_id} value={cidade.nome}>{cidade.nome}</option>)}
              </select>
            </label>
            <label>Combustível
              <select value={produto} onChange={(e) => setProduto(e.target.value as Produto)}>
                {PRODUTOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <div className="filtros-distancia">
            <label>Distância máxima dos postos
              <select value={raio} disabled={!proximidade && !municipio}
                onChange={(e) => {
                  setRaio(Number(e.target.value));
                  setCidadeFiltrada('');
                }}>
                {!proximidade && <option value={0}>Somente a cidade selecionada</option>}
                {RAIOS_KM.map((km) => <option key={km} value={km}>Até {km} km</option>)}
              </select>
            </label>
            <button className="botao-localizacao botao-pesquisar" type="submit" disabled={!podePesquisar || carregando}>
              <Icon name="search" /> Pesquisar
            </button>
          </div>
          </form>
          {raioAplicado && cidadesNoRaio.length > 0 && <div className="filtros-distancia">
            <label>Cidades nos resultados ({cidadesNoRaio.length})
              <select value={cidadeFiltrada} disabled={!cidadesNoRaio.length} onChange={(e) => {
                setCidadeFiltrada(e.target.value);
                setPostoSelecionado(null);
              }}>
                <option value="">Todas no raio</option>
                {cidadesNoRaio.map((cidade) => <option key={cidade.ibge_id} value={cidade.ibge_id}>
                  {cidade.nome} ({cidade.uf}) · {kmFormatado.format(cidade.km)} km
                </option>)}
              </select>
            </label>
          </div>}

          {carregando && <Carregamento mensagem="Buscando preços dos postos…" />}
          <div aria-busy={carregando}>
            {filtrarPorRaio && municipio && !proximidade && !origem && !carregandoMunicipios &&
              <p className="vazio">Esta cidade está sem coordenadas de referência. Selecione outra ou use sua localização.</p>}
            {erroMunicipios && <p className="erro">Não foi possível carregar os municípios. Atualize a página para tentar novamente.</p>}
            {!supabaseConfigurado && <p className="vazio">Banco não configurado. Nenhum preço para exibir.</p>}
            {supabaseConfigurado && !proximidade && !municipio && !erroMunicipios && !carregandoMunicipios &&
              <p className="vazio">Selecione um município.</p>}
            {carregandoMunicipios && !carregando && <p className="vazio" role="status">Carregando municípios…</p>}
            {erro && <p className="erro" role="alert">{erro}</p>}

            {linhas && resultados.length === 0 && !carregando && !erro && (
              <p className="vazio" role="status">{raioAplicado
                ? (cidadesNoRaio.length ? 'Não encontrei postos com preço e coordenadas dentro da distância escolhida.' : 'Nenhuma sede municipal encontrada nesse raio.')
                : `A base da ANP ainda não tem preços de ${labelProduto(busca?.produto ?? produto)} em ${busca?.municipio ?? municipio}.`}</p>
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
                              {raioAplicado && <span>{l.municipio.toLocaleUpperCase('pt-BR')}, {l.uf}</span>}
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

