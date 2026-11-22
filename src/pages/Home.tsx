import { Link } from 'react-router-dom';
import { AvisoPrecos } from '../components/PriceNotice';
import Icon from '../components/Icon';

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-conteudo">
          <span className="hero-tag"><Icon name="fuel" /> Combustíveis</span>
          <h1>Abasteça melhor.<br />Gaste menos.</h1>
          <p>Compare os preços dos postos da sua região antes de sair.</p>
          <Link className="hero-busca" to="/postos">
            <Icon name="search" /> Buscar postos por cidade
            <span><Icon name="arrow" /></span>
          </Link>
        </div>
      </section>

      <section className="explorar" aria-labelledby="explorar-titulo">
        <h2 id="explorar-titulo">Explore o Economizei+</h2>
        <div className="atalhos">
          <Link className="atalho atalho-postos" to="/postos">
            <span className="atalho-icone"><Icon name="pin" /></span>
            <strong>Postos e preços</strong>
            <span>Veja os valores na sua cidade</span>
          </Link>
          <Link className="atalho atalho-calculadora" to="/calculadora">
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

