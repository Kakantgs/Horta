import { get, ref, set, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function registrarOcorrenciaSetor({
  setor_id,
  tipo_ocorrencia,
  descricao,
  acao_corretiva,
  data_hora,
  status
}) {
  const setorSnapshot = await get(ref(db, `setores/${setor_id}`));

  if (!setorSnapshot.exists()) {
    throw new Error("Setor não encontrado.");
  }

  const id = gerarId("ocrset");

  const novaOcorrencia = {
    id,
    setor_id,
    setor_codigo: setorSnapshot.val().codigo,
    setor_nome: setorSnapshot.val().nome,
    tipo_ocorrencia: (tipo_ocorrencia || "").trim().toLowerCase(),
    descricao: (descricao || "").trim(),
    acao_corretiva: (acao_corretiva || "").trim(),
    data_hora: (data_hora || "").trim(),
    status: (status || "aberta").trim().toLowerCase()
  };

  await set(ref(db, `ocorrencias_setor/${id}`), novaOcorrencia);
  return novaOcorrencia;
}

export async function listarOcorrenciasSetor() {
  const snapshot = await get(ref(db, "ocorrencias_setor"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (b.data_hora || "").localeCompare(a.data_hora || "")
  );
}

export async function listarOcorrenciasPorSetor(setorId) {
  const lista = await listarOcorrenciasSetor();

  return lista.filter((item) => item.setor_id === setorId);
}

export async function resolverOcorrenciaSetor(id) {
  const snapshot = await get(ref(db, `ocorrencias_setor/${id}`));

  if (!snapshot.exists()) {
    throw new Error("Ocorrência do setor não encontrada.");
  }

  await update(ref(db, `ocorrencias_setor/${id}`), {
    status: "resolvida"
  });
}