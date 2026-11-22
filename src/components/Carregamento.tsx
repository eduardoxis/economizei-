import { useEffect, useState } from 'react';
import ilustracao from '../assets/loading-abastecimento.png';

const numero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Carregamento({ mensagem = 'Carregando a página…' }: { mensagem?: string }) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let inicio: number | undefined;
    let quadro: number;
    function atualizar(agora: number) {
      inicio ??= agora;
      const parte = Math.min(((agora - inicio) % 4300) / 3400, 1);
      setValor(150 * (1 - (1 - parte) ** 2));
      quadro = requestAnimationFrame(atualizar);
    }
    quadro = requestAnimationFrame(atualizar);
    return () => cancelAnimationFrame(quadro);
  }, []);

  return (
    <div className="eco-loader" role="status">
      <div className="eco-cena" aria-hidden="true">
        <img src={ilustracao} width={640} height={427} alt="" />
        <span className="eco-visor">
          <strong>R$ {numero.format(valor)}</strong>
          <small>{numero.format(valor / 5.79)} L</small>
        </span>
      </div>
      <span className="eco-loader-texto">{mensagem}</span>
      <span className="eco-pontos" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}
