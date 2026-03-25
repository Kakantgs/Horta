import { get, ref, set } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function registrarMonitoramentoSetor({
  setor_id,
  data_hora,
  ph,
  ce,
  temperatura_agua,
  observacoes,
  responsavel
}) {
  const setorSnapshot = await get(ref(db, `setores/${setor_id}`));

  if (!setorSnapshot.exists()) {
    throw new Error("Setor não encontrado.");
  }

  const id = gerarId("monset");

  const novoMonitoramento = {
    id,
    setor_id,
    setor_codigo: setorSnapshot.val().codigo,
    setor_nome: setorSnapshot.val().nome,
    data_hora: (data_hora || "").trim(),
    ph: ph !== "" ? Number(ph) : null,
    ce: ce !== "" ? Number(ce) : null,
    temperatura_agua:
      temperatura_agua !== "" ? Number(temperatura_agua) : null,
    observacoes: (observacoes || "").trim(),
    responsavel: (responsavel || "").trim()
  };

  await set(ref(db, `monitoramentos_setor/${id}`), novoMonitoramento);
  return novoMonitoramento;
}

export async function listarMonitoramentosSetor() {
  const snapshot = await get(ref(db, "monitoramentos_setor"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (b.data_hora || "").localeCompare(a.data_hora || "")
  );
}

export async function listarMonitoramentosPorSetor(setorId) {
  const lista = await listarMonitoramentosSetor();

  return lista.filter((item) => item.setor_id === setorId);
}