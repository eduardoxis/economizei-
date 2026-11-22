import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Postos from './pages/Postos';
import Calculadora from './pages/Calculadora';
import Icon from './components/Icon';
import './styles.css';

const arquivosDaMarca = import.meta.glob<string>('./assets/{economizei-logo,economizei-favicon}.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const logo = arquivosDaMarca['./assets/economizei-logo.png'];
const favicon = arquivosDaMarca['./assets/economizei-favicon.png'];

if (favicon) {
  const iconeDaAba = document.createElement('link');
  iconeDaAba.rel = 'icon';
  iconeDaAba.type = 'image/png';
  iconeDaAba.href = favicon;
  document.head.append(iconeDaAba);
}

const links = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/postos', label: 'Comparar', icon: 'list' },
  { to: '/calculadora', label: 'Calculadora', icon: 'calculator' },
] as const;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <header className="topo">
        <div className="topo-inner">
          <Link className="marca" to="/">
            {logo ? (
              <img className="marca-logo" src={logo} alt="Economizei+" width={1536} height={1024} />
            ) : (
              <>
                <span className="marca-icone"><Icon name="fuel" /></span>
                Economizei<span className="marca-mais">+</span>
              </>
            )}
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/postos" element={<Postos />} />
          <Route path="/calculadora" element={<Calculadora />} />
        </Routes>
      </main>
    </BrowserRouter>
  </React.StrictMode>,
);

