import { describe, it, expect } from 'vitest';
import { custoAbastecimento, custoDeslocamento, economiaLiquida } from './calc';
import { priceStatus, STALE_AFTER_DAYS } from './prices';

describe('custoAbastecimento', () => {
  it('reproduz o exemplo da spec: 40 L a R$ 5,49 e R$ 5,89', () => {
    expect(custoAbastecimento(40, 5.49)).toBe(219.6);
    expect(custoAbastecimento(40, 5.89)).toBe(235.6);
  });

  it('rejeita valores negativos', () => {
    expect(() => custoAbastecimento(-1, 5)).toThrow();
  });
});

describe('custoDeslocamento', () => {
  it('considera ida e volta', () => {
    // 10 km de ida = 20 km total; a 10 km/L = 2 L; a R$ 6,00 = R$ 12,00
    expect(custoDeslocamento({ distanciaIdaKm: 10, kmPorLitro: 10, precoRefLitro: 6 })).toBe(12);
  });

  it('rejeita consumo zero para não dividir por zero', () => {
    expect(() => custoDeslocamento({ distanciaIdaKm: 5, kmPorLitro: 0, precoRefLitro: 6 })).toThrow();
  });
});

describe('economiaLiquida', () => {
  it('sem deslocamento, devolve a economia bruta', () => {
    const r = economiaLiquida({
      litros: 40,
      precoA: 5.89,
      precoB: 5.49,
      distanciaIdaAteB_Km: 0,
      kmPorLitro: 12,
      precoRefLitro: 5.49,
    });
    expect(r).toBe(16);
  });

  it('um deslocamento longo anula a vantagem', () => {
    // bruta R$ 16,00; deslocamento de 30 km ida = 60 km / 12 km/L = 5 L * 5,49 = R$ 27,45
    const r = economiaLiquida({
      litros: 40,
      precoA: 5.89,
      precoB: 5.49,
      distanciaIdaAteB_Km: 30,
      kmPorLitro: 12,
      precoRefLitro: 5.49,
    });
    expect(r).toBeLessThan(0);
  });
});

describe('priceStatus', () => {
  const agora = new Date('2026-11-20T12:00:00');

  it('marca como vigente uma coleta recente', () => {
    expect(priceStatus('2026-11-13', agora)).toBe('vigente');
  });

  it('marca como desatualizada uma coleta antiga', () => {
    expect(priceStatus('2026-11-01', agora)).toBe('desatualizado');
  });

  it('usa o limite definido em STALE_AFTER_DAYS', () => {
    expect(STALE_AFTER_DAYS).toBeGreaterThanOrEqual(7);
  });
});
