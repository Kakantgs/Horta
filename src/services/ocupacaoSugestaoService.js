export function normalizarFaixasLivres(faixasLivres = []) {
  return [...faixasLivres].sort((a, b) => a.inicio - b.inicio);
}

export function sugerirFaixaParaQuantidade(faixasLivres = [], quantidade) {
  const qtd = Number(quantidade);

  if (!qtd || qtd <= 0) return null;

  const ordenadas = normalizarFaixasLivres(faixasLivres);

  for (const faixa of ordenadas) {
    if (Number(faixa.tamanho) >= qtd) {
      return {
        inicio: faixa.inicio,
        fim: faixa.inicio + qtd - 1,
        faixa_original_inicio: faixa.inicio,
        faixa_original_fim: faixa.fim,
        tamanho_faixa_original: faixa.tamanho
      };
    }
  }

  return null;
}

export function obterMaiorFaixaLivre(faixasLivres = []) {
  if (!faixasLivres.length) return null;

  return [...faixasLivres].sort((a, b) => b.tamanho - a.tamanho)[0];
}