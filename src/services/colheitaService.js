import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

function gerarCodigoLoteComercial(dataFormacao) {
  const dataSemTraco = dataFormacao.replaceAll("-", "");
  const numero = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `LCOM-${dataSemTraco}-${numero}`;
}

export async function colherOcupacao({
  ocupacao_bancada_id,
  data_colheita,
  quantidade_colhida,
  quantidade_perda,
  tipo_colheita
}) {
  const ocupacaoSnapshot = await get(
    ref(db, `ocupacoes_bancada/${ocupacao_bancada_id}`)
  );

  if (!ocupacaoSnapshot.exists()) {
    throw new Error("Ocupação não encontrada.");
  }

  const ocupacao = ocupacaoSnapshot.val();

  if (ocupacao.status !== "ativa") {
    throw new Error("A ocupação precisa estar ativa.");
  }

  const loteSnapshot = await get(
    ref(db, `lotes_producao/${ocupacao.lote_producao_id}`)
  );

  if (!loteSnapshot.exists()) {
    throw new Error("Lote de produção não encontrado.");
  }

  const qtdColhida = Number(quantidade_colhida);
  const qtdPerda = Number(quantidade_perda || 0);
  const qtdTotal = qtdColhida + qtdPerda;

  if (qtdColhida <= 0) {
    throw new Error("A quantidade colhida deve ser maior que zero.");
  }

  if (qtdPerda < 0) {
    throw new Error("A quantidade de perda não pode ser negativa.");
  }

  if (qtdTotal > Number(ocupacao.quantidade_alocada)) {
    throw new Error("Colheita + perda ultrapassa a quantidade alocada na ocupação.");
  }

  const colheitaId = gerarId("col");
  const loteComercialId = gerarId("lcom");
  const codigoLoteComercial = gerarCodigoLoteComercial(data_colheita);

  const novaColheita = {
    id: colheitaId,
    lote_producao_id: ocupacao.lote_producao_id,
    ocupacao_bancada_id,
    data_colheita,
    quantidade_colhida: qtdColhida,
    quantidade_perda: qtdPerda,
    tipo_colheita: tipo_colheita.trim().toLowerCase()
  };

  const novoLoteComercial = {
    id: loteComercialId,
    codigo_lote_comercial: codigoLoteComercial,
    colheita_id: colheitaId,
    lote_producao_id: ocupacao.lote_producao_id,
    data_formacao: data_colheita,
    quantidade_inicial: qtdColhida,
    quantidade_disponivel: qtdColhida,
    status: qtdColhida > 0 ? "disponivel" : "encerrado"
  };

  const novaQuantidadeOcupacao = Number(ocupacao.quantidade_alocada) - qtdTotal;

  const updates = {};
  updates[`colheitas/${colheitaId}`] = novaColheita;
  updates[`lotes_comerciais/${loteComercialId}`] = novoLoteComercial;

  if (tipo_colheita.trim().toLowerCase() === "total" || novaQuantidadeOcupacao === 0) {
    updates[`ocupacoes_bancada/${ocupacao_bancada_id}/status`] = "encerrada";
    updates[`ocupacoes_bancada/${ocupacao_bancada_id}/data_fim`] = data_colheita;
    updates[`bancadas/${ocupacao.bancada_id}/status`] = "vazia";
  } else {
    updates[`ocupacoes_bancada/${ocupacao_bancada_id}/quantidade_alocada`] =
      novaQuantidadeOcupacao;
  }

  await update(ref(db), updates);

  return {
    colheita: novaColheita,
    lote_comercial: novoLoteComercial
  };
}

export async function listarColheitasPorOcupacao(ocupacaoId) {
  const snapshot = await get(ref(db, "colheitas"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val())
    .filter((item) => item.ocupacao_bancada_id === ocupacaoId)
    .sort((a, b) => b.data_colheita.localeCompare(a.data_colheita));
}

export async function listarColheitas() {
  const snapshot = await get(ref(db, "colheitas"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    b.data_colheita.localeCompare(a.data_colheita)
  );
}

export async function listarLotesComerciais() {
  const snapshot = await get(ref(db, "lotes_comerciais"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    b.data_formacao.localeCompare(a.data_formacao)
  );
}

export async function buscarLoteComercialPorId(id) {
  const snapshot = await get(ref(db, `lotes_comerciais/${id}`));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val();
}