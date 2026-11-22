const round2 = (n: number) => Math.round(n * 100) / 100;

export function custoAbastecimento(litros: number, precoLitro: number): number {
  if (litros < 0 || precoLitro < 0) throw new Error('Valores não podem ser negativos');
  return round2(litros * precoLitro);
}

/** Custo do deslocamento ida e volta até o posto, em combustível do próprio carro. */
export function custoDeslocamento(params: {
  distanciaIdaKm: number;
  kmPorLitro: number;
  precoRefLitro: number;
}): number {
  const { distanciaIdaKm, kmPorLitro, precoRefLitro } = params;
  if (kmPorLitro <= 0) throw new Error('Consumo deve ser maior que zero');
  const litros = (2 * distanciaIdaKm) / kmPorLitro;
  return round2(litros * precoRefLitro);
}

/**
 * Economia líquida de abastecer no posto B em vez do A.
 * Positivo: vale a pena. Negativo: o deslocamento anula a economia.
 */
export function economiaLiquida(params: {
  litros: number;
  precoA: number;
  precoB: number;
  distanciaIdaAteB_Km: number;
  kmPorLitro: number;
  precoRefLitro: number;
}): number {
  const { litros, precoA, precoB, distanciaIdaAteB_Km, kmPorLitro, precoRefLitro } = params;
  const bruta = custoAbastecimento(litros, precoA) - custoAbastecimento(litros, precoB);
  const desloc = custoDeslocamento({
    distanciaIdaKm: distanciaIdaAteB_Km,
    kmPorLitro,
    precoRefLitro,
  });
  return round2(bruta - desloc);
}
