import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { AvisoPrecos } from '../components/PriceNotice';
import Icon from '../components/Icon';

export default function Home() {
  const explorar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!explorar.current || !('IntersectionObserver' in window)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const itens = explorar.current.querySelectorAll('.eco-revela');
    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.classList.add('eco-visivel');
        observador.unobserve(entrada.target);
      }
    }, { threshold: .15 });
    itens.forEach((item) => {
      item.classList.add('eco-observado');
      observador.observe(item);
    });
    return () => observador.disconnect();
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-conteudo">
          <span className="hero-tag eco-entrada"><Icon name="fuel" /> Combustíveis</span>
          <h1><span className="eco-mascara"><span>Abasteça melhor.</span></span>
            <span className="eco-mascara"><span>Gaste menos.</span></span></h1>
          <p className="eco-entrada">Compare os preços dos postos da sua região antes de sair.</p>
          <Link className="hero-busca eco-pop" to="/postos">
            <Icon name="search" /> Buscar postos por cidade
            <span><Icon name="arrow" /></span>
          </Link>
        </div>
      </section>

      <section className="explorar" aria-labelledby="explorar-titulo" ref={explorar}>
        <h2 id="explorar-titulo" className="eco-revela">Explore o Economizei+</h2>
        <div className="atalhos">
          <Link className="atalho atalho-postos eco-revela" to="/postos">
            <span className="atalho-icone"><Icon name="pin" /></span>
            <strong>Postos e preços</strong>
            <span>Veja os valores na sua cidade</span>
          </Link>
          <Link className="atalho atalho-calculadora eco-revela" to="/calculadora">
            <span className="atalho-icone"><Icon name="calculator" /></span>
            <strong>Calculadora</strong>
            <span>Compare o custo de abastecer</span>
          </Link>
        </div>
      </section>
      <AvisoPrecos />
    </>
  );
}

