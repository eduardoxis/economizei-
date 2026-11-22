import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Postos from './pages/Postos';
import Calculadora from './pages/Calculadora';
import Icon from './components/Icon';
import logo from './assets/economizei-logo.webp';
import './styles.css';

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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/postos" element={<Postos />} />
          <Route path="/calculadora" element={<Calculadora />} />
        </Routes>
      </main>
    </BrowserRouter>
  </React.StrictMode>,
);

