import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Abertura from './components/Abertura';
import Carregamento from './components/Carregamento';
import Icon from './components/Icon';
import Rodape from './components/Rodape';
import logo from './assets/economizei-logo.webp';
import './styles.css';
import './animacoes.css';

const Home = React.lazy(() => import('./pages/Home'));
const Postos = React.lazy(() => import('./pages/Postos'));
const Calculadora = React.lazy(() => import('./pages/Calculadora'));
const Privacidade = React.lazy(() => import('./pages/Privacidade'));

const links = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/postos', label: 'Comparar', icon: 'list' },
  { to: '/calculadora', label: 'Calculadora', icon: 'calculator' },
  { to: '/privacidade', label: 'Privacidade', icon: 'shield' },
] as const;

function RolarAoTopo() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <RolarAoTopo />
      <Abertura />
      <header className="topo">
        <div className="topo-inner">
          <Link className="marca" to="/">
            <img className="marca-logo" src={logo} alt="Economizei+" width={360} height={240} />
          </Link>
          <nav className="navegacao" aria-label="Navegação principal">
            {links.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} end={to === '/'}>
                <span className="nav-icone"><Icon name={icon} /></span>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main>
        <React.Suspense fallback={<Carregamento />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/postos" element={<Postos />} />
          <Route path="/calculadora" element={<Calculadora />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/privacidade/termos" element={<Privacidade termos />} />
        </Routes>
        </React.Suspense>
      </main>
      <Rodape />
    </BrowserRouter>
  </React.StrictMode>,
);

