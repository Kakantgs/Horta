import { get, ref, set } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

const TIPOS_MOVIMENTACAO_VALIDOS = [
  "ocupacao_inicial",
  "entrada_direta_final",
  "transplante",
  "remanejamento_interno",
  "colheita_total",
  "colheita_parcial"
];

function validarTipoMovimentacao(tipo) {
  const valor = (tipo || "").trim().toLowerCase();

  if (!TIPOS_MOVIMENTACAO_VALIDOS.includes(valor)) {
    throw new Error("Tipo de movimentação inválido.");
  }

  return valor;
}

export async function registrarMovimentacaoLote({
  lote_producao_id,
  ocupacao_origem_id = null,
  ocupacao_destino_id = null,
  bancada_origem_id = null,
  bancada_destino_id = null,
  quantidade_movimentada,
  data_movimentacao,
  tipo_movimentacao
}) {
  const loteSnapshot = await get(ref(db, `lotes_producao/${lote_producao_id}`));

  if (!loteSnapshot.exists()) {
    throw new Error("Lote de produção não encontrado.");
  }

  const id = gerarId("mov");

  const novaMovimentacao = {
    id,
    lote_producao_id,
    ocupacao_origem_id,
    ocupacao_destino_id,
    bancada_origem_id,
    bancada_destino_id,
    quantidade_movimentada: Number(quantidade_movimentada),
    data_movimentacao,
    tipo_movimentacao: validarTipoMovimentacao(tipo_movimentacao)
  };

  await set(ref(db, `movimentacoes_lote/${id}`), novaMovimentacao);
  return novaMovimentacao;
}

export async function listarMovimentacoesPorLote(loteId) {
  const snapshot = await get(ref(db, "movimentacoes_lote"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val())
    .filter((item) => item.lote_producao_id === loteId)
    .sort((a, b) => (a.data_movimentacao || "").localeCompare(b.data_movimentacao || ""));
}