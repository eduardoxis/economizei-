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
    <section>
      <h1>Preços da região</h1>

      <div className="filtros">
        <input
          aria-label="UF"
          maxLength={2}
          value={uf}
          onChange={(e) => setUf(e.target.value.toUpperCase())}
        />
        <input
          aria-label="Município"
          placeholder="Ex.: Luziânia"
          value={municipio}
          onChange={(e) => setMunicipio(e.target.value)}
        />
        <select aria-label="Combustível" value={produto} onChange={(e) => setProduto(e.target.value as Produto)}>
          {PRODUTOS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {!supabaseConfigurado && <p className="vazio">Banco não configurado. Nenhum preço para exibir.</p>}
      {supabaseConfigurado && !municipio.trim() && <p className="vazio">Informe um município.</p>}
      {carregando && <p className="vazio">Carregando…</p>}
      {erro && <p className="erro">Não foi possível carregar os preços: {erro}</p>}

      {linhas && linhas.length === 0 && (
        <p className="vazio">
          Nenhum registro de {labelProduto(produto)} em {municipio}. Isso significa falta de dado, não preço zero.
        </p>
      )}

      {linhas && linhas.length > 0 && (
        <ul className="lista">
          {linhas.map((l) => (
            <li key={`${l.cnpj}-${l.produto}`} className="item">
              <div>
                <strong>{l.razao_social ?? 'Posto sem nome'}</strong>
                <StatusBadge status={priceStatus(l.data_coleta)} dataColeta={l.data_coleta} />
              </div>
              <span className="preco">R$ {l.preco.toFixed(2).replace('.', ',')}/L</span>
            </li>
          ))}
        </ul>
      )}

      {linhas && linhas.length > 0 && <AvisoPrecos />}
    </section>
  );
}
