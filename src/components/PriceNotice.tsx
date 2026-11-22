import type { PriceStatus } from '../lib/prices';

export function AvisoPrecos() {
  return (
    <p className="aviso">
      Preço informado • Confirme no estabelecimento. Os valores podem ter mudado desde a coleta.
    </p>
  );
}

export function StatusBadge({ status, dataColeta }: { status: PriceStatus; dataColeta: string }) {
  const [a, m, d] = dataColeta.split('-');
  const dataFmt = `${d}/${m}/${a}`;
  return status === 'vigente' ? (
    <span className="badge vigente">Coletado em {dataFmt}</span>
  ) : (
    <span className="badge desatualizado">Desatualizado • coletado em {dataFmt}</span>
  );
}
