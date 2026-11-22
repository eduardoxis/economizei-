import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Postos from './pages/Postos';
import Calculadora from './pages/Calculadora';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <header className="topo">
        <Link to="/">Economizei+</Link>
        <nav>
          <Link to="/postos">Preços</Link>
          <Link to="/calculadora">Calculadora</Link>
        </nav>
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
