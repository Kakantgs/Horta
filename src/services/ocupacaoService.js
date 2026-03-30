import { get, ref, set, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";
import { registrarMovimentacaoLote } from "./movimentacaoService";

async function recalcularStatusBancada(bancadaId) {
  const snapshot = await get(ref(db, "ocupacoes_bancada"));

  const ocupacoes = snapshot.exists() ? Object.values(snapshot.val()) : [];

  const ocupacoesAtivas = ocupacoes.filter(
    (item) => item.bancada_id === bancadaId && item.status === "ativa"
  );

  await update(ref(db, `bancadas/${bancadaId}`), {
    status: ocupacoesAtivas.length > 0 ? "ocupada" : "vazia"
  });
}

export async function listarOcupacoesAtivasPorBancada(bancadaId) {
  const snapshot = await get(ref(db, "ocupacoes_bancada"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val())
    .filter((item) => item.bancada_id === bancadaId && item.status === "ativa")
    .sort((a, b) => Number(a.posicao_inicial) - Number(b.posicao_inicial));
}

export async function registrarOcupacaoBancada({
  lote_producao_id,
  bancada_id,
  posicao_inicial,
  posicao_final,
  quantidade_alocada,
  data_inicio,
  tipo_ocupacao
}) {
  const [loteSnapshot, bancadaSnapshot, ocupacoesSnapshot] = await Promise.all([
    get(ref(db, `lotes_producao/${lote_producao_id}`)),
    get(ref(db, `bancadas/${bancada_id}`)),
    get(ref(db, "ocupacoes_bancada"))
  ]);

  if (!loteSnapshot.exists()) {
    throw new Error("Lote de produção não encontrado.");
  }

  if (!bancadaSnapshot.exists()) {
    throw new Error("Bancada não encontrada.");
  }

  const lote = loteSnapshot.val();
  const bancada = bancadaSnapshot.val();
  const ocupacoes = ocupacoesSnapshot.exists()
    ? Object.values(ocupacoesSnapshot.val())
    : [];

  const qtd = Number(quantidade_alocada);
  const posIni = Number(posicao_inicial);
  const posFim = Number(posicao_final);
  const saldoDisponivel = Number(
    lote.saldo_disponivel_para_ocupar ?? lote.quantidade_atual ?? 0
  );

  if (qtd <= 0) {
    throw new Error("Quantidade alocada deve ser maior que zero.");
  }

  if (saldoDisponivel < qtd) {
    throw new Error("O lote não possui saldo disponível suficiente para ocupar.");
  }

  if (posIni <= 0 || posFim <= 0 || posIni > posFim) {
    throw new Error("Posições inválidas.");
  }

  if (posFim > Number(bancada.capacidade_total)) {
    throw new Error("A posição final ultrapassa a capacidade da bancada.");
  }

  const ocupacoesAtivas = ocupacoes.filter(
    (item) => item.bancada_id === bancada_id && item.status === "ativa"
  );

  const conflito = ocupacoesAtivas.some((item) => {
    const iniExistente = Number(item.posicao_inicial);
    const fimExistente = Number(item.posicao_final);
    return !(posFim < iniExistente || posIni > fimExistente);
  });

  if (conflito) {
    throw new Error("A faixa informada conflita com uma ocupação já existente.");
  }

  const ocupacaoId = gerarId("ocp");

  const novaOcupacao = {
    id: ocupacaoId,
    lote_producao_id,
    bancada_id,
    ocupacao_origem_id: null,
    posicao_inicial: posIni,
    posicao_final: posFim,
    quantidade_alocada: qtd,
    data_inicio,
    data_fim: null,
    tipo_ocupacao,
    status: "ativa"
  };

  const novoSaldo = saldoDisponivel - qtd;

  const updates = {};
  updates[`ocupacoes_bancada/${ocupacaoId}`] = novaOcupacao;
  updates[`lotes_producao/${lote_producao_id}/saldo_disponivel_para_ocupar`] = novoSaldo;
  updates[`bancadas/${bancada_id}/status`] = "ocupada";

  await update(ref(db), updates);

  return novaOcupacao;
}

export async function encerrarOcupacaoBancada({
  ocupacao_id,
  data_fim
}) {
  const snapshot = await get(ref(db, `ocupacoes_bancada/${ocupacao_id}`));

  if (!snapshot.exists()) {
    throw new Error("Ocupação não encontrada.");
  }

  const ocupacao = snapshot.val();

  if (ocupacao.status !== "ativa") {
    throw new Error("A ocupação já está encerrada.");
  }

  await update(ref(db), {
    [`ocupacoes_bancada/${ocupacao_id}/status`]: "encerrada",
    [`ocupacoes_bancada/${ocupacao_id}/data_fim`]: data_fim
  });

  await recalcularStatusBancada(ocupacao.bancada_id);
}

export async function transplantarParaOutraBancada({
  ocupacao_origem_id,
  bancada_destino_id,
  quantidade_transplantada,
  data_transplante,
  posicao_inicial_destino,
  posicao_final_destino
}) {
  const [
    ocupacaoOrigemSnapshot,
    bancadaDestinoSnapshot,
    ocupacoesSnapshot
  ] = await Promise.all([
    get(ref(db, `ocupacoes_bancada/${ocupacao_origem_id}`)),
    get(ref(db, `bancadas/${bancada_destino_id}`)),
    get(ref(db, "ocupacoes_bancada"))
  ]);

  if (!ocupacaoOrigemSnapshot.exists()) {
    throw new Error("Ocupação de origem não encontrada.");
  }

  if (!bancadaDestinoSnapshot.exists()) {
    throw new Error("Bancada de destino não encontrada.");
  }

  const ocupacaoOrigem = ocupacaoOrigemSnapshot.val();
  const bancadaDestino = bancadaDestinoSnapshot.val();
  const todasOcupacoes = ocupacoesSnapshot.exists()
    ? Object.values(ocupacoesSnapshot.val())
    : [];

  if (ocupacaoOrigem.status !== "ativa") {
    throw new Error("A ocupação de origem precisa estar ativa.");
  }

  const qtdOrigem = Number(ocupacaoOrigem.quantidade_alocada);
  const qtdTransplantada = Number(quantidade_transplantada);
  const posIniDestino = Number(posicao_inicial_destino);
  const posFimDestino = Number(posicao_final_destino);

  if (qtdTransplantada <= 0) {
    throw new Error("A quantidade transplantada deve ser maior que zero.");
  }

  if (qtdTransplantada > qtdOrigem) {
    throw new Error("A quantidade transplantada não pode ser maior que a quantidade da origem.");
  }

  if (posIniDestino <= 0 || posFimDestino <= 0 || posIniDestino > posFimDestino) {
    throw new Error("Posições de destino inválidas.");
  }

  if (posFimDestino > Number(bancadaDestino.capacidade_total)) {
    throw new Error("A posição final destino ultrapassa a capacidade da bancada.");
  }

  const tamanhoFaixaDestino = posFimDestino - posIniDestino + 1;

  if (tamanhoFaixaDestino !== qtdTransplantada) {
    throw new Error(
      "A faixa destino deve ter exatamente o mesmo tamanho da quantidade transplantada."
    );
  }

  const ocupacoesDestinoAtivas = todasOcupacoes.filter(
    (item) => item.bancada_id === bancada_destino_id && item.status === "ativa"
  );

  const conflitoDestino = ocupacoesDestinoAtivas.some((item) => {
    const iniExistente = Number(item.posicao_inicial);
    const fimExistente = Number(item.posicao_final);
    return !(posFimDestino < iniExistente || posIniDestino > fimExistente);
  });

  if (conflitoDestino) {
    throw new Error("A faixa de destino conflita com ocupação já existente.");
  }

  const novaQtdOrigem = qtdOrigem - qtdTransplantada;
  const zerouOrigem = novaQtdOrigem === 0;

  const novaOcupacaoId = gerarId("ocp");

  const novaOcupacao = {
    id: novaOcupacaoId,
    lote_producao_id: ocupacaoOrigem.lote_producao_id,
    bancada_id: bancada_destino_id,
    ocupacao_origem_id: ocupacao_origem_id,
    posicao_inicial: posIniDestino,
    posicao_final: posFimDestino,
    quantidade_alocada: qtdTransplantada,
    data_inicio: data_transplante,
    data_fim: null,
    tipo_ocupacao: "transplante",
    status: "ativa"
  };

  const updates = {};
  updates[`ocupacoes_bancada/${novaOcupacaoId}`] = novaOcupacao;
  updates[`bancadas/${bancada_destino_id}/status`] = "ocupada";

  if (zerouOrigem) {
    updates[`ocupacoes_bancada/${ocupacao_origem_id}/quantidade_alocada`] = 0;
    updates[`ocupacoes_bancada/${ocupacao_origem_id}/status`] = "encerrada";
    updates[`ocupacoes_bancada/${ocupacao_origem_id}/data_fim`] = data_transplante;
  } else {
    updates[`ocupacoes_bancada/${ocupacao_origem_id}/quantidade_alocada`] = novaQtdOrigem;
  }

  await update(ref(db), updates);

  await registrarMovimentacaoLote({
    lote_producao_id: ocupacaoOrigem.lote_producao_id,
    ocupacao_origem_id: ocupacao_origem_id,
    ocupacao_destino_id: novaOcupacaoId,
    bancada_origem_id: ocupacaoOrigem.bancada_id,
    bancada_destino_id: bancada_destino_id,
    quantidade_movimentada: qtdTransplantada,
    data_movimentacao: data_transplante,
    tipo_movimentacao: "transplante"
  });

  await recalcularStatusBancada(ocupacaoOrigem.bancada_id);
  await recalcularStatusBancada(bancadaDestino.id);

  return {
    ocupacao_origem_atualizada: {
      ...ocupacaoOrigem,
      quantidade_alocada: novaQtdOrigem,
      status: zerouOrigem ? "encerrada" : "ativa"
    },
    ocupacao_destino: novaOcupacao
  };
}