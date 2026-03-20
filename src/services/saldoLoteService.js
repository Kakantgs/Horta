import { get, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";

export async function calcularResumoLotes() {
  const [lotesSnapshot, ocupacoesSnapshot] = await Promise.all([
    get(ref(db, "lotes_producao")),
    get(ref(db, "ocupacoes_bancada"))
  ]);

  const lotes = lotesSnapshot.exists() ? Object.values(lotesSnapshot.val()) : [];
  const ocupacoes = ocupacoesSnapshot.exists() ? Object.values(ocupacoesSnapshot.val()) : [];

  const ocupacoesAtivas = ocupacoes.filter((item) => item.status === "ativa");

  return lotes.map((lote) => {
    const ocupacoesDoLote = ocupacoesAtivas.filter(
      (ocupacao) => ocupacao.lote_producao_id === lote.id
    );

    const totalAlocado = ocupacoesDoLote.reduce(
      (acc, item) => acc + Number(item.quantidade_alocada || 0),
      0
    );

    return {
      ...lote,
      saldo_disponivel_para_ocupar: Number(lote.quantidade_atual || 0),
      total_alocado_em_bancadas: totalAlocado,
      total_em_producao: Number(lote.quantidade_atual || 0) + totalAlocado
    };
  });
}

export async function calcularResumoLotePorId(loteId) {
  const lotes = await calcularResumoLotes();
  return lotes.find((item) => item.id === loteId) || null;
}