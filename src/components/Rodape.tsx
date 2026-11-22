import { Link } from 'react-router-dom';

export default function Rodape() {
  return (
    <footer className="rodape">
      <div className="rodape-conteudo">
        <div>
          <Link to="/" className="rodape-marca">Economizei+</Link>
          <p>Compare preços de combustíveis na sua região.</p>
        </div>
        <nav aria-label="Links do rodapé">
          <Link to="/postos">Postos e preços</Link>
          <Link to="/calculadora">Calculadora</Link>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/privacidade/termos">Termos de Uso</Link>
        </nav>
      </div>
    </footer>
  );
}
