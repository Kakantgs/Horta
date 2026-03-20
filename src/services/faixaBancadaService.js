export function normalizarOcupacoes(ocupacoes = []) {
  return [...ocupacoes]
    .map((item) => ({
      ...item,
      posicao_inicial: Number(item.posicao_inicial),
      posicao_final: Number(item.posicao_final)
    }))
    .sort((a, b) => a.posicao_inicial - b.posicao_inicial);
}

export function calcularFaixasLivres(capacidadeTotal, ocupacoes = []) {
  const capacidade = Number(capacidadeTotal);
  const ocupacoesOrdenadas = normalizarOcupacoes(ocupacoes);

  const livres = [];
  let cursor = 1;

  for (const ocupacao of ocupacoesOrdenadas) {
    if (cursor < ocupacao.posicao_inicial) {
      livres.push({
        inicio: cursor,
        fim: ocupacao.posicao_inicial - 1,
        tamanho: ocupacao.posicao_inicial - cursor
      });
    }

    cursor = ocupacao.posicao_final + 1;
  }

  if (cursor <= capacidade) {
    livres.push({
      inicio: cursor,
      fim: capacidade,
      tamanho: capacidade - cursor + 1
    });
  }

  return livres;
}

export function calcularFaixasOcupadas(ocupacoes = []) {
  return normalizarOcupacoes(ocupacoes).map((ocupacao) => ({
    id: ocupacao.id,
    lote_producao_id: ocupacao.lote_producao_id,
    inicio: ocupacao.posicao_inicial,
    fim: ocupacao.posicao_final,
    tamanho: ocupacao.posicao_final - ocupacao.posicao_inicial + 1,
    quantidade_alocada: Number(ocupacao.quantidade_alocada),
    data_inicio: ocupacao.data_inicio,
    tipo_ocupacao: ocupacao.tipo_ocupacao,
    status: ocupacao.status
  }));
}

export function calcularResumoCapacidade(capacidadeTotal, ocupacoes = []) {
  const capacidade = Number(capacidadeTotal);
  const faixasOcupadas = calcularFaixasOcupadas(ocupacoes);
  const faixasLivres = calcularFaixasLivres(capacidade, ocupacoes);

  const totalOcupado = faixasOcupadas.reduce((acc, item) => acc + item.tamanho, 0);
  const totalLivre = faixasLivres.reduce((acc, item) => acc + item.tamanho, 0);

  return {
    capacidadeTotal: capacidade,
    totalOcupado,
    totalLivre,
    percentualOcupado: capacidade > 0 ? ((totalOcupado / capacidade) * 100).toFixed(1) : "0.0",
    percentualLivre: capacidade > 0 ? ((totalLivre / capacidade) * 100).toFixed(1) : "0.0",
    faixasOcupadas,
    faixasLivres
  };
}

export function sugerirProximaFaixaLivre(capacidadeTotal, ocupacoes = [], quantidadeDesejada = null) {
  const faixasLivres = calcularFaixasLivres(capacidadeTotal, ocupacoes);

  if (faixasLivres.length === 0) {
    return null;
  }

  if (!quantidadeDesejada || Number(quantidadeDesejada) <= 0) {
    return faixasLivres[0];
  }

  const qtd = Number(quantidadeDesejada);

  const faixaCompativel = faixasLivres.find((faixa) => faixa.tamanho >= qtd);

  return faixaCompativel || faixasLivres[0];
}