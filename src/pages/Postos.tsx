import Icon from '../components/Icon';
import { useEffect, useMemo, useState } from 'react';
import MapaPostos from '../components/MapaPostos';
import { buscarMunicipios, buscarMunicipiosNoRaio, buscarPrecos, buscarPrecosDasCidades, supabaseConfigurado, type Municipio, type MunicipioNoRaio } from '../lib/supabase';
import { coordenadasDoPosto, distanciaKm, PRODUTOS, labelProduto, priceStatus, type Coordenadas, type PriceRow, type Produto } from '../lib/prices';
import { AvisoPrecos, StatusBadge } from '../components/PriceNotice';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const RAIOS_KM = [10, 25, 50, 75, 100];
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
  const [raio, setRaio] = useState(0);
  const [cidadesNoRaio, setCidadesNoRaio] = useState<MunicipioNoRaio[]>([]);
  const [cidadeFiltrada, setCidadeFiltrada] = useState('');
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
    setCarregandoMunicipios(true);
    setErroMunicipios(false);
    buscarMunicipios(uf)
      .then((lista) => !cancelado && setMunicipios(lista))
      .catch(() => !cancelado && setErroMunicipios(true))
      .finally(() => !cancelado && setCarregandoMunicipios(false));
    return () => { cancelado = true; };
  }, [uf]);

  const cidadeBase = municipios.find((cidade) => cidade.nome === municipio);
  const origem = useMemo<Coordenadas | null>(() => {
    if (proximidade) return usuario;
    return cidadeBase && cidadeBase.latitude !== null && cidadeBase.longitude !== null
      ? [cidadeBase.latitude, cidadeBase.longitude] : null;
  }, [cidadeBase, proximidade, usuario]);
  const filtrarPorRaio = raio > 0;

  useEffect(() => {
    setCidadesNoRaio([]);
    setPostoSelecionado(null);
    if (!supabaseConfigurado || (!proximidade && !municipio.trim()) || (filtrarPorRaio && !origem)) {
      setLinhas(null);
      setCarregando(false);
      setErro(null);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    setLinhas(null);
    const consulta = filtrarPorRaio && origem
      ? buscarMunicipiosNoRaio(origem, raio).then((cidades) => {
        if (cancelado) return [];
        setCidadesNoRaio(cidades);
        return buscarPrecosDasCidades(cidades.map((cidade) => cidade.ibge_id), produto);
      })
      : buscarPrecos({ uf, municipio: municipio.trim(), produto });
    consulta
      .then((r) => !cancelado && setLinhas(r))
      .catch((e: Error) => !cancelado && setErro(e.message))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [uf, municipio, produto, proximidade, origem, raio, filtrarPorRaio]);

  const resultados = useMemo(() => {
    const filtro = cidadesNoRaio.find((cidade) => String(cidade.ibge_id) === cidadeFiltrada);
    const itens = (linhas ?? []).filter((posto) => !filtro ||
      (posto.uf === filtro.uf && posto.municipio === filtro.nome.toLocaleLowerCase('pt-BR'))).map((posto) => {
      const ponto = coordenadasDoPosto(posto);
      const referencia = filtrarPorRaio ? origem : usuario;
      return { posto, km: referencia && ponto ? distanciaKm(referencia, ponto) : null };
    });
    return filtrarPorRaio
      ? itens.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.posto.preco - b.posto.preco)
      : itens;
  }, [linhas, usuario, origem, filtrarPorRaio, cidadesNoRaio, cidadeFiltrada]);
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
            {filtrarPorRaio && origem
              ? <p>Sedes municipais em até {raio} km em linha reta de {proximidade ? 'você' : municipio}.</p>
              : <p>Os marcadores mostram postos com coordenadas no cadastro da ANP.</p>}
            {usuario && <button type="button" className="botao-texto" onClick={() => {
              setProximidade(false);
              setUsuario(null);
              setErroLocalizacao('');
              setCidadeFiltrada('');
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
                setCidadeFiltrada('');
              }}>
                {UFS.map((sigla) => <option key={sigla}>{sigla}</option>)}
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
                {municipios.map((cidade) => <option key={cidade.ibge_id}>{cidade.nome}</option>)}
              </select>
            </label>
            <label>Combustível
              <select value={produto} onChange={(e) => setProduto(e.target.value as Produto)}>
                {PRODUTOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <div className="filtros-distancia">
            <label>Raio de busca
              <select value={raio} disabled={!proximidade && !municipio}
                onChange={(e) => {
                  setRaio(Number(e.target.value));
                  setCidadeFiltrada('');
                }}>
                {!proximidade && <option value={0}>Somente a cidade selecionada</option>}
                {RAIOS_KM.map((km) => <option key={km} value={km}>Até {km} km</option>)}
              </select>
            </label>
            {filtrarPorRaio && origem && <label>Cidades no raio ({cidadesNoRaio.length})
              <select value={cidadeFiltrada} disabled={!cidadesNoRaio.length} onChange={(e) => {
                setCidadeFiltrada(e.target.value);
                setPostoSelecionado(null);
              }}>
                <option value="">Todas no raio</option>
                {cidadesNoRaio.map((cidade) => <option key={cidade.ibge_id} value={cidade.ibge_id}>
                  {cidade.nome} ({cidade.uf}) · {kmFormatado.format(cidade.km)} km
                </option>)}
              </select>
            </label>}
          </div>

          <div aria-live="polite">
            {filtrarPorRaio && municipio && !proximidade && !origem && !carregandoMunicipios &&
              <p className="vazio">Esta cidade está sem coordenadas de referência. Selecione outra ou use sua localização.</p>}
            {erroMunicipios && <p className="erro">Não foi possível carregar os municípios. Atualize a página para tentar novamente.</p>}
            {!supabaseConfigurado && <p className="vazio">Banco não configurado. Nenhum preço para exibir.</p>}
            {supabaseConfigurado && !proximidade && !municipio && !erroMunicipios && !carregandoMunicipios &&
              <p className="vazio">Selecione um município.</p>}
            {carregando && <p className="vazio">Carregando preços…</p>}
            {erro && <p className="erro">Não foi possível carregar os preços: {erro}</p>}

            {linhas && resultados.length === 0 && !carregando && !erro && (
              <p className="vazio">{filtrarPorRaio
                ? (cidadesNoRaio.length ? 'Não encontrei preços desse combustível nas cidades selecionadas.' : 'Nenhuma sede municipal encontrada nesse raio.')
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
                              {filtrarPorRaio && <span>{l.municipio.toLocaleUpperCase('pt-BR')}, {l.uf}</span>}
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

