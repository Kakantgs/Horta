import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";
import { registrarMovimentacaoLote } from "./movimentacaoService";

function gerarCodigoLoteComercial(dataFormacao) {
  const dataSemTraco = dataFormacao.replaceAll("-", "");
  const numero = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `LCOM-${dataSemTraco}-${numero}`;
}

async function recalcularStatusBancada(bancadaId) {
  const ocupacoesSnapshot = await get(ref(db, "ocupacoes_bancada"));

  const ocupacoes = ocupacoesSnapshot.exists()
    ? Object.values(ocupacoesSnapshot.val())
    : [];

  const ocupacoesAtivas = ocupacoes.filter(
    (item) => item.bancada_id === bancadaId && item.status === "ativa"
  );

  await update(ref(db, `bancadas/${bancadaId}`), {
    status: ocupacoesAtivas.length > 0 ? "ocupada" : "vazia"
  });
}

async function recalcularStatusLoteProducao(loteId) {
  const [loteSnapshot, ocupacoesSnapshot] = await Promise.all([
    get(ref(db, `lotes_producao/${loteId}`)),
    get(ref(db, "ocupacoes_bancada"))
  ]);

  if (!loteSnapshot.exists()) return;

  const lote = loteSnapshot.val();

  const ocupacoes = ocupacoesSnapshot.exists()
    ? Object.values(ocupacoesSnapshot.val())
    : [];

  const ocupacoesAtivasDoLote = ocupacoes.filter(
    (item) => item.lote_producao_id === loteId && item.status === "ativa"
  );

  const saldoDisponivel = Number(
    lote.saldo_disponivel_para_ocupar ?? lote.quantidade_atual ?? 0
  );

  let status = "ativo";

  if (saldoDisponivel === 0 && ocupacoesAtivasDoLote.length > 0) {
    status = "em_producao";
  }

  if (saldoDisponivel === 0 && ocupacoesAtivasDoLote.length === 0) {
    status = "colhido";
  }

  await update(ref(db, `lotes_producao/${loteId}`), { status });
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

  const tipo = (tipo_colheita || "").trim().toLowerCase();
  const quantidadeAtualOcupacao = Number(ocupacao.quantidade_alocada);
  const qtdPerda = Number(quantidade_perda || 0);
  let qtdColhida = Number(quantidade_colhida || 0);

  if (qtdPerda < 0) {
    throw new Error("A quantidade de perda não pode ser negativa.");
  }

  if (!["parcial", "total"].includes(tipo)) {
    throw new Error("Tipo de colheita inválido.");
  }

  if (tipo === "total") {
    qtdColhida = quantidadeAtualOcupacao - qtdPerda;
  }

  if (qtdColhida <= 0) {
    throw new Error("A quantidade colhida deve ser maior que zero.");
  }

  const qtdTotalConsumida = qtdColhida + qtdPerda;

  if (tipo === "total") {
    if (qtdTotalConsumida !== quantidadeAtualOcupacao) {
      throw new Error(
        "Na colheita total, colhida + perda deve ser exatamente igual ao total da ocupação."
      );
    }
  } else {
    if (qtdTotalConsumida > quantidadeAtualOcupacao) {
      throw new Error(
        "Na colheita parcial, colhida + perda não pode ultrapassar a quantidade da ocupação."
      );
    }
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
    tipo_colheita: tipo
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

  const novaQuantidadeOcupacao = quantidadeAtualOcupacao - qtdTotalConsumida;

  const updates = {};
  updates[`colheitas/${colheitaId}`] = novaColheita;
  updates[`lotes_comerciais/${loteComercialId}`] = novoLoteComercial;

  if (tipo === "total" || novaQuantidadeOcupacao === 0) {
    updates[`ocupacoes_bancada/${ocupacao_bancada_id}/status`] = "encerrada";
    updates[`ocupacoes_bancada/${ocupacao_bancada_id}/data_fim`] = data_colheita;
    updates[`ocupacoes_bancada/${ocupacao_bancada_id}/quantidade_alocada`] = 0;
  } else {
    updates[`ocupacoes_bancada/${ocupacao_bancada_id}/quantidade_alocada`] =
      novaQuantidadeOcupacao;
  }

  await update(ref(db), updates);

  await registrarMovimentacaoLote({
    lote_producao_id: ocupacao.lote_producao_id,
    ocupacao_origem_id: ocupacao_bancada_id,
    ocupacao_destino_id: null,
    bancada_origem_id: ocupacao.bancada_id,
    bancada_destino_id: null,
    quantidade_movimentada: qtdTotalConsumida,
    data_movimentacao: data_colheita,
    tipo_movimentacao: tipo === "total" ? "colheita_total" : "colheita_parcial"
  });

  await recalcularStatusBancada(ocupacao.bancada_id);
  await recalcularStatusLoteProducao(ocupacao.lote_producao_id);

  return {
    colheita: novaColheita,
    lote_comercial: novoLoteComercial,
    quantidade_restante_na_ocupacao: novaQuantidadeOcupacao
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

  if (!snapshot.exists()) return null;

  return snapshot.val();
}