import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";
import { recalcularStatusBancada } from "./statusBancadaService";

export async function registrarOcorrencia({
  ocupacao_bancada_id,
  tipo_ocorrencia,
  descricao,
  acao_corretiva,
  data_hora,
  status
}) {
  const ocupacaoSnapshot = await get(
    ref(db, `ocupacoes_bancada/${ocupacao_bancada_id}`)
  );

  if (!ocupacaoSnapshot.exists()) {
    throw new Error("Ocupação não encontrada.");
  }

  const ocupacao = ocupacaoSnapshot.val();
  const ocorrenciaId = gerarId("ocr");

  const novaOcorrencia = {
    id: ocorrenciaId,
    ocupacao_bancada_id,
    tipo_ocorrencia: tipo_ocorrencia.trim().toLowerCase(),
    descricao: descricao.trim(),
    acao_corretiva: acao_corretiva?.trim() || "",
    data_hora: data_hora.trim(),
    status: status.trim().toLowerCase()
  };

  await update(ref(db), {
    [`ocorrencias/${ocorrenciaId}`]: novaOcorrencia
  });

  await recalcularStatusBancada(ocupacao.bancada_id);

  return novaOcorrencia;
}

export async function listarOcorrenciasPorOcupacao(ocupacaoId) {
  const snapshot = await get(ref(db, "ocorrencias"));

  if (!snapshot.exists()) return [];

  const lista = Object.values(snapshot.val()).filter(
    (item) => item.ocupacao_bancada_id === ocupacaoId
  );

  return lista.sort((a, b) => b.data_hora.localeCompare(a.data_hora));
}

export async function resolverOcorrencia(ocorrenciaId, acaoCorretivaExtra = "") {
  const ocorrenciaSnapshot = await get(ref(db, `ocorrencias/${ocorrenciaId}`));

  if (!ocorrenciaSnapshot.exists()) {
    throw new Error("Ocorrência não encontrada.");
  }

  const ocorrencia = ocorrenciaSnapshot.val();

  const updates = {};
  updates[`ocorrencias/${ocorrenciaId}/status`] = "resolvida";

  if (acaoCorretivaExtra.trim()) {
    const textoAtual = ocorrencia.acao_corretiva || "";
    const novoTexto = textoAtual
      ? `${textoAtual} | Complemento: ${acaoCorretivaExtra.trim()}`
      : acaoCorretivaExtra.trim();

    updates[`ocorrencias/${ocorrenciaId}/acao_corretiva`] = novoTexto;
  }

  await update(ref(db), updates);

  const ocupacaoSnapshot = await get(
    ref(db, `ocupacoes_bancada/${ocorrencia.ocupacao_bancada_id}`)
  );

  if (ocupacaoSnapshot.exists()) {
    const ocupacao = ocupacaoSnapshot.val();
    await recalcularStatusBancada(ocupacao.bancada_id);
  }

  return true;
}