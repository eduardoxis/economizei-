import { Link } from 'react-router-dom';
import { supabaseConfigurado } from '../lib/supabase';
import { AvisoPrecos } from '../components/PriceNotice';

export default function Home() {
  return (
    <section>
      <h1>Economizei+</h1>
      <p className="slogan">Abasteça melhor. Gaste menos.</p>

      {!supabaseConfigurado && (
        <div className="alerta">
          Banco de dados não configurado. Defina <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>. Sem isso, nenhum preço é exibido.
        </div>
      )}

      <nav className="atalhos">
        <Link to="/postos">Ver preços da região</Link>
        <Link to="/calculadora">Calcular abastecimento</Link>
      </nav>

      <AvisoPrecos />
    </section>
  );
}
