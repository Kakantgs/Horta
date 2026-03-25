export function calcularDiasDesdeEntrada(dataEntrada) {
  if (!dataEntrada) return 0;

  const inicio = new Date(`${dataEntrada}T00:00:00`);
  const hoje = new Date();
  const diff = hoje.getTime() - inicio.getTime();

  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function calcularDiasNaOcupacao(dataInicio, dataFim = null) {
  if (!dataInicio) return 0;

  const inicio = new Date(`${dataInicio}T00:00:00`);
  const fim = dataFim ? new Date(`${dataFim}T00:00:00`) : new Date();
  const diff = fim.getTime() - inicio.getTime();

  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function obterStatusVisualLote({
  lote,
  bancadaTipo,
  diasDesdeEntrada,
  diasNaOcupacao,
  temColheita = false
}) {
  if (!lote) return "Sem dados";

  if (temColheita && lote.status === "colhido") {
    return "Colhido";
  }

  if (bancadaTipo === "bercario") {
    if (diasNaOcupacao <= 2) return "Recém-entrado";
    if (diasNaOcupacao >= 8) return "Pronto para final";
    return "Em berçário";
  }

  if (bancadaTipo === "final") {
    if (diasDesdeEntrada >= 28) return "Pronto para colher";
    return "Em final";
  }

  return "Ativo";
}