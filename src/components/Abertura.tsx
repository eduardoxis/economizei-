import { useState } from 'react';
import logo from '../assets/economizei-logo.webp';

const chave = 'economizei-abertura-v1';

export default function Abertura() {
  const [aberta, setAberta] = useState(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    try { return sessionStorage.getItem(chave) !== 'vista'; }
    catch { return true; }
  });

  function fechar() {
    setAberta(false);
    try { sessionStorage.setItem(chave, 'vista'); } catch { /* sessão sem armazenamento */ }
  }

  if (!aberta) return null;

  return (
    <div className="eco-abertura" onAnimationEnd={(evento) => {
      if (evento.target === evento.currentTarget) fechar();
    }}>
      <div className="eco-palco">
        <img src={logo} width={360} height={240} alt="" />
        <span className="eco-brilho" aria-hidden="true" />
      </div>
      <button type="button" className="eco-pular" onClick={fechar}>Pular abertura</button>
    </div>
  );
}
