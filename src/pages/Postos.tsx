import Icon from '../components/Icon';
import { useEffect, useState } from 'react';
import { buscarPrecos, supabaseConfigurado } from '../lib/supabase';
import { PRODUTOS, labelProduto, priceStatus, type PriceRow, type Produto } from '../lib/prices';
import { AvisoPrecos, StatusBadge } from '../components/PriceNotice';

export default function Postos() {
  const [uf, setUf] = useState('GO');
  const [municipio, setMunicipio] = useState('');
  const [produto, setProduto] = useState<Produto>('gasolina_comum');
  const [linhas, setLinhas] = useState<PriceRow[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado || !municipio.trim()) {
      setLinhas(null);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    buscarPrecos({ uf, municipio: municipio.trim(), produto })
      .then((r) => !cancelado && setLinhas(r))
      .catch((e: Error) => !cancelado && setErro(e.message))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [uf, municipio, produto]);

  return (
    <section className="comparacao">
      <header className="pagina-titulo">
        <h1>Postos e preços</h1>
        <p>Compare os valores informados na sua cidade.</p>
      </header>
      <div className="painel-comparacao">
        <aside className="mapa-previa" aria-label="Prévia visual do mapa">
          <div className="mapa-legenda">
            <span className="atalho-icone"><Icon name="pin" /></span>
            <div><strong>Prévia do mapa</strong><span>Filtre por município para consultar preços.</span></div>
          </div>
        </aside>
        <div className="painel-precos">
          <div className="filtros">
            <label>UF
              <input maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </label>
            <label>Município
              <input placeholder="Ex.: Luziânia" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </label>
            <label>Combustível
              <select value={produto} onChange={(e) => setProduto(e.target.value as Produto)}>
                {PRODUTOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <div aria-live="polite">
            {!supabaseConfigurado && <p className="vazio">Banco não configurado. Nenhum preço para exibir.</p>}
            {supabaseConfigurado && !municipio.trim() && <p className="vazio">Informe um município.</p>}
            {carregando && <p className="vazio">Carregando preços…</p>}
            {erro && <p className="erro">Não foi possível carregar os preços: {erro}</p>}

            {linhas?.length === 0 && !carregando && !erro && (
              <p className="vazio">Nenhum registro de {labelProduto(produto)} em {municipio}.</p>
            )}

            {linhas && linhas.length > 0 && !carregando && !erro && (
              <table className="tabela-precos">
                <thead><tr><th scope="col">Posto</th><th scope="col">Preço informado</th></tr></thead>
                <tbody>
                  {linhas.map((l, index) => (
                    <tr key={`${l.cnpj}-${l.produto}-${l.data_coleta}-${index}`}>
                      <td>
                        <div className="posto">
                          <span className="posto-icone"><Icon name="fuel" /></span>
                          <div>
                            <strong>{l.razao_social ?? 'Posto sem nome'}</strong>
                            <br />
                            <StatusBadge status={priceStatus(l.data_coleta)} dataColeta={l.data_coleta} />
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

