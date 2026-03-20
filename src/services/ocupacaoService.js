import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";
import { criarSublote } from "./loteService";

export async function listarLotesAtivos() {
  const snapshot = await get(ref(db, "lotes_producao"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).filter(
    (lote) => lote.status === "ativo" && Number(lote.quantidade_atual) > 0
  );
}

export async function listarOcupacoesAtivas() {
  const snapshot = await get(ref(db, "ocupacoes_bancada"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).filter(
    (ocupacao) => ocupacao.status === "ativa"
  );
}

export async function listarOcupacoesAtivasPorBancada(bancadaId) {
  const ocupacoes = await listarOcupacoesAtivas();

  return ocupacoes
    .filter((ocupacao) => ocupacao.bancada_id === bancadaId)
    .sort((a, b) => Number(a.posicao_inicial) - Number(b.posicao_inicial));
}

export async function buscarOcupacaoAtivaPorBancada(bancadaId) {
  const ocupacoes = await listarOcupacoesAtivasPorBancada(bancadaId);
  return ocupacoes.length > 0 ? ocupacoes[0] : null;
}

function existeConflitoDeFaixa(ocupacoesAtivas, posIni, posFim) {
  return ocupacoes.some((ocupacao) => {
    const iniExistente = Number(ocupacao.posicao_inicial);
    const fimExistente = Number(ocupacao.posicao_final);

    const semConflito = posFim < iniExistente || posIni > fimExistente;
    return !semConflito;
  });
}

export async function registrarOcupacaoBancada({
  lote_producao_id,
  bancada_id,
  posicao_inicial,
  posicao_final,
  quantidade_alocada,
  data_inicio,
  tipo_ocupacao,
  ocupacao_origem_id = null
}) {
  const loteSnapshot = await get(ref(db, `lotes_producao/${lote_producao_id}`));
  if (!loteSnapshot.exists()) {
    throw new Error("Lote de produção não encontrado.");
  }

  const bancadaSnapshot = await get(ref(db, `bancadas/${bancada_id}`));
  if (!bancadaSnapshot.exists()) {
    throw new Error("Bancada não encontrada.");
  }

  const lote = loteSnapshot.val();
  const bancada = bancadaSnapshot.val();

  const quantidade = Number(quantidade_alocada);
  const posIni = Number(posicao_inicial);
  const posFim = Number(posicao_final);

  if (quantidade <= 0) {
    throw new Error("A quantidade alocada deve ser maior que zero.");
  }

  if (posIni > posFim) {
    throw new Error("A posição inicial não pode ser maior que a posição final.");
  }

  if (posIni < 1) {
    throw new Error("A posição inicial deve ser maior ou igual a 1.");
  }

  if (posFim > Number(bancada.capacidade_total)) {
    throw new Error("A posição final ultrapassa a capacidade total da bancada.");
  }

  if (quantidade > Number(lote.quantidade_atual)) {
    throw new Error("A quantidade alocada é maior que o saldo atual disponível do lote.");
  }

  const ocupacoesAtivasDaBancada = await listarOcupacoesAtivasPorBancada(bancada_id);

  if (existeConflitoDeFaixa(ocupacoesAtivasDaBancada, posIni, posFim)) {
    throw new Error("Essa faixa de posições já está ocupada por outro lote.");
  }

  const ocupacaoId = gerarId("ocp");

  const novaOcupacao = {
    id: ocupacaoId,
    lote_producao_id,
    bancada_id,
    ocupacao_origem_id,
    posicao_inicial: posIni,
    posicao_final: posFim,
    quantidade_alocada: quantidade,
    data_inicio,
    data_fim: null,
    tipo_ocupacao: tipo_ocupacao.trim().toLowerCase(),
    status: "ativa"
  };

  const novoSaldoLote = Number(lote.quantidade_atual) - quantidade;

  const updates = {};
  updates[`ocupacoes_bancada/${ocupacaoId}`] = novaOcupacao;
  updates[`bancadas/${bancada_id}/status`] = "ocupada";
  updates[`lotes_producao/${lote_producao_id}/quantidade_atual`] = novoSaldoLote;

  await update(ref(db), updates);

  return novaOcupacao;
}

export async function encerrarOcupacaoBancada({
  ocupacao_id,
  data_fim
}) {
  const ocupacaoSnapshot = await get(ref(db, `ocupacoes_bancada/${ocupacao_id}`));
  if (!ocupacaoSnapshot.exists()) {
    throw new Error("Ocupação não encontrada.");
  }

  const ocupacao = ocupacaoSnapshot.val();

  if (ocupacao.status !== "ativa") {
    throw new Error("Essa ocupação já está encerrada.");
  }

  const updates = {};
  updates[`ocupacoes_bancada/${ocupacao_id}/status`] = "encerrada";
  updates[`ocupacoes_bancada/${ocupacao_id}/data_fim`] = data_fim;

  await update(ref(db), updates);

  const ocupacoesRestantes = await listarOcupacoesAtivasPorBancada(ocupacao.bancada_id);

  await update(ref(db, `bancadas/${ocupacao.bancada_id}`), {
    status: ocupacoesRestantes.length > 0 ? "ocupada" : "vazia"
  });
}

export async function transplantarParaOutraBancada({
  ocupacao_origem_id,
  bancada_destino_id,
  quantidade_transplantada,
  data_transplante,
  posicao_inicial_destino,
  posicao_final_destino,
  encerrar_ocupacao_origem = false
}) {
  const ocupacaoOrigemSnapshot = await get(
    ref(db, `ocupacoes_bancada/${ocupacao_origem_id}`)
  );

  if (!ocupacaoOrigemSnapshot.exists()) {
    throw new Error("Ocupação de origem não encontrada.");
  }

  const ocupacaoOrigem = ocupacaoOrigemSnapshot.val();

  if (ocupacaoOrigem.status !== "ativa") {
    throw new Error("A ocupação de origem precisa estar ativa.");
  }

  const loteOrigemId = ocupacaoOrigem.lote_producao_id;
  const qtd = Number(quantidade_transplantada);

  if (qtd <= 0) {
    throw new Error("A quantidade transplantada deve ser maior que zero.");
  }

  if (qtd > Number(ocupacaoOrigem.quantidade_alocada)) {
    throw new Error("A quantidade transplantada é maior que a quantidade alocada na ocupação de origem.");
  }

  const sublote = await criarSublote({
    lote_pai_id: loteOrigemId,
    quantidade: qtd,
    data_formacao: data_transplante,
    descontar_do_pai: false
  });

  const novaOcupacao = await registrarOcupacaoBancada({
    lote_producao_id: sublote.id,
    bancada_id: bancada_destino_id,
    posicao_inicial: posicao_inicial_destino,
    posicao_final: posicao_final_destino,
    quantidade_alocada: qtd,
    data_inicio: data_transplante,
    tipo_ocupacao: "transplante",
    ocupacao_origem_id: ocupacao_origem_id
  });

  if (encerrar_ocupacao_origem) {
    await encerrarOcupacaoBancada({
      ocupacao_id: ocupacao_origem_id,
      data_fim: data_transplante
    });
  }

  return {
    sublote,
    nova_ocupacao: novaOcupacao
  };
}