import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";
import { recalcularStatusBancada } from "./statusBancadaService";

export async function registrarMonitoramento({
  bancada_id,
  data_hora,
  ph,
  ce,
  temperatura_agua,
  observacoes
}) {
  const bancadaSnapshot = await get(ref(db, `bancadas/${bancada_id}`));

  if (!bancadaSnapshot.exists()) {
    throw new Error("Bancada não encontrada.");
  }

  const monitoramentoId = gerarId("mon");

  const novoMonitoramento = {
    id: monitoramentoId,
    bancada_id,
    data_hora,
    ph: Number(ph),
    ce: Number(ce),
    temperatura_agua: temperatura_agua === "" ? null : Number(temperatura_agua),
    observacoes: observacoes?.trim() || ""
  };

  const updates = {};
  updates[`monitoramentos/${monitoramentoId}`] = novoMonitoramento;
  updates[`bancadas/${bancada_id}/ultimo_monitoramento`] = data_hora;
  updates[`bancadas/${bancada_id}/ultimo_ph`] = Number(ph);
  updates[`bancadas/${bancada_id}/ultimo_ce`] = Number(ce);
  updates[`bancadas/${bancada_id}/ultima_temperatura_agua`] =
    temperatura_agua === "" ? null : Number(temperatura_agua);

  await update(ref(db), updates);
  await recalcularStatusBancada(bancada_id);

  return novoMonitoramento;
}

export async function listarMonitoramentosPorBancada(bancadaId) {
  const snapshot = await get(ref(db, "monitoramentos"));

  if (!snapshot.exists()) return [];

  const lista = Object.values(snapshot.val()).filter(
    (item) => item.bancada_id === bancadaId
  );

  return lista.sort((a, b) => b.data_hora.localeCompare(a.data_hora));
}