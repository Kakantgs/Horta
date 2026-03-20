import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";

function monitoramentoEmAlerta(ultimoPh, ultimoCe) {
  const ph = Number(ultimoPh);
  const ce = Number(ultimoCe);

  if (Number.isNaN(ph) || Number.isNaN(ce)) {
    return false;
  }

  const phFora = ph < 5.5 || ph > 6.5;
  const ceFora = ce < 1.0 || ce > 2.5;

  return phFora || ceFora;
}

export async function recalcularStatusBancada(bancadaId) {
  const bancadaSnapshot = await get(ref(db, `bancadas/${bancadaId}`));

  if (!bancadaSnapshot.exists()) {
    throw new Error("Bancada não encontrada.");
  }

  const bancada = bancadaSnapshot.val();

  const ocupacoesSnapshot = await get(ref(db, "ocupacoes_bancada"));
  const ocorrenciasSnapshot = await get(ref(db, "ocorrencias"));

  const ocupacoes = ocupacoesSnapshot.exists()
    ? Object.values(ocupacoesSnapshot.val())
    : [];

  const ocorrencias = ocorrenciasSnapshot.exists()
    ? Object.values(ocorrenciasSnapshot.val())
    : [];

  const ocupacoesAtivas = ocupacoes.filter(
    (ocp) => ocp.bancada_id === bancadaId && ocp.status === "ativa"
  );

  const ocupacaoIdsAtivas = new Set(ocupacoesAtivas.map((ocp) => ocp.id));

  const ocorrenciasAbertas = ocorrencias.filter(
    (ocr) =>
      ocupacaoIdsAtivas.has(ocr.ocupacao_bancada_id) &&
      ocr.status === "aberta"
  );

  const temMonitoramentoCritico = monitoramentoEmAlerta(
    bancada.ultimo_ph,
    bancada.ultimo_ce
  );

  let novoStatus = "vazia";

  if (ocupacoesAtivas.length > 0) {
    novoStatus = "ocupada";
  }

  if (ocorrenciasAbertas.length > 0 || temMonitoramentoCritico) {
    novoStatus = "alerta";
  }

  await update(ref(db, `bancadas/${bancadaId}`), {
    status: novoStatus
  });

  return novoStatus;
}