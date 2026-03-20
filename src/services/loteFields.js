export function obterSaldoDisponivelLote(lote) {
  if (!lote) return 0;

  if (lote.saldo_disponivel_para_ocupar !== undefined) {
    return Number(lote.saldo_disponivel_para_ocupar || 0);
  }

  if (lote.quantidade_atual !== undefined) {
    return Number(lote.quantidade_atual || 0);
  }

  return 0;
}