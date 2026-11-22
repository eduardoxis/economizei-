import { useState } from 'react';
import { custoAbastecimento, economiaLiquida } from '../lib/calc';

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function Calculadora() {
  const [litros, setLitros] = useState('40');
  const [precoA, setPrecoA] = useState('5,89');
  const [precoB, setPrecoB] = useState('5,49');
  const [distancia, setDistancia] = useState('0');
  const [kmL, setKmL] = useState('12');
  const [precoRef, setPrecoRef] = useState('5,49');

  let resultado: string;
  try {
    const liq = economiaLiquida({
      litros: num(litros),
      precoA: num(precoA),
      precoB: num(precoB),
      distanciaIdaAteB_Km: num(distancia),
      kmPorLitro: num(kmL),
      precoRefLitro: num(precoRef),
    });
    resultado = `Custo no posto A: R$ ${custoAbastecimento(num(litros), num(precoA)).toFixed(2)} · Custo no posto B: R$ ${custoAbastecimento(num(litros), num(precoB)).toFixed(2)} · Economia líquida em B: R$ ${liq.toFixed(2)}`;
  } catch (e) {
    resultado = (e as Error).message;
  }

  return (
    <section>
      <header className="pagina-titulo"><h1>Calculadora</h1><p>Compare o gasto de abastecer em dois postos.</p></header>
      <p className="aviso">Estimativa. Os preços informados podem não corresponder ao valor atual no posto.</p>

      <div className="form">
        <label>Litros<input value={litros} onChange={(e) => setLitros(e.target.value)} /></label>
        <label>Preço no posto A (R$/L)<input value={precoA} onChange={(e) => setPrecoA(e.target.value)} /></label>
        <label>Preço no posto B (R$/L)<input value={precoB} onChange={(e) => setPrecoB(e.target.value)} /></label>
        <label>Distância até o posto B, ida (km)<input value={distancia} onChange={(e) => setDistancia(e.target.value)} /></label>
        <label>Consumo do carro (km/L)<input value={kmL} onChange={(e) => setKmL(e.target.value)} /></label>
        <label>Preço da gasolina para o deslocamento (R$/L)<input value={precoRef} onChange={(e) => setPrecoRef(e.target.value)} /></label>
      </div>

      <p className="resultado">{resultado}</p>
    </section>
  );
}
