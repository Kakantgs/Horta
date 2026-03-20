import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";
import { obterSaldoDisponivelLote } from "./loteFields";
import { registrarMovimentacaoLote } from "./movimentacaoService";

const TIPOS_OCUPACAO_VALIDOS = [
  "bercario",
  "entrada_direta_final",
  "transplante"
];

function validarTipoOcupacao(tipo) {
  const valor = (tipo || "").trim().toLowerCase();

  if (!TIPOS_OCUPACAO_VALIDOS.includes(valor)) {
    throw new Error(
      "Tipo de ocupação inválido. Use 'bercario', 'entrada_direta_final' ou 'transplante'."
    );
  }

  return valor;
}

export async function listarLotesAtivos() {
  const snapshot = await get(ref(db, "lotes_producao"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).filter((lote) => {
    const saldo = obterSaldoDisponivelLote(lote);
    return lote.status === "ativo" && saldo > 0;
  });
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

export async function listarOcupacoesAtivasPorLote(loteId) {
  const ocupacoes = await listarOcupacoesAtivas();

  return ocupacoes
    .filter((ocupacao) => ocupacao.lote_producao_id === loteId)
    .sort((a, b) => Number(a.posicao_inicial) - Number(b.posicao_inicial));
}

function existeConflitoDeFaixa(ocupacoesAtivas, posIni, posFim) {
  return ocupacoesAtivas.some((ocupacao) => {
    const iniExistente = Number(ocupacao.posicao_inicial);
    const fimExistente = Number(ocupacao.posicao_final);

    const semConflito = posFim < iniExistente || posIni > fimExistente;
    return !semConflito;
  });
}

async function carregarBancada(bancadaId) {
  const snapshot = await get(ref(db, `bancadas/${bancadaId}`));

  if (!snapshot.exists()) {
    throw new Error("Bancada não encontrada.");
  }

  return snapshot.val();
}

async function carregarLote(loteId) {
  const snapshot = await get(ref(db, `lotes_producao/${loteId}`));

  if (!snapshot.exists()) {
    throw new Error("Lote de produção não encontrado.");
  }

  return snapshot.val();
}

function validarCompatibilidadeTipoOcupacaoComBancada(tipoOcupacao, tipoBancada) {
  const tipoOcp = (tipoOcupacao || "").toLowerCase();
  const tipoBan = (tipoBancada || "").toLowerCase();

  if (tipoOcp === "bercario" && tipoBan !== "bercario") {
    throw new Error("O tipo de ocupação 'bercario' só pode ser usado em bancada do tipo 'bercario'.");
  }

  if (
    (tipoOcp === "entrada_direta_final" || tipoOcp === "transplante") &&
    tipoBan !== "final"
  ) {
    throw new Error(
      "Os tipos 'entrada_direta_final' e 'transplante' só podem ser usados em bancada do tipo 'final'."
    );
  }
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
  const lote = await carregarLote(lote_producao_id);
  const bancada = await carregarBancada(bancada_id);

  const quantidade = Number(quantidade_alocada);
  const posIni = Number(posicao_inicial);
  const posFim = Number(posicao_final);
  const tipoOcupacao = validarTipoOcupacao(tipo_ocupacao);

  validarCompatibilidadeTipoOcupacaoComBancada(tipoOcupacao, bancada.tipo);

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

  const saldoDisponivel = obterSaldoDisponivelLote(lote);

  if (quantidade > saldoDisponivel) {
    throw new Error("A quantidade alocada é maior que o saldo disponível do lote.");
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
    tipo_ocupacao: tipoOcupacao,
    status: "ativa"
  };

  const novoSaldo = saldoDisponivel - quantidade;

  const updates = {};
  updates[`ocupacoes_bancada/${ocupacaoId}`] = novaOcupacao;
  updates[`bancadas/${bancada_id}/status`] = "ocupada";

  // CAMPO NOVO OFICIAL
  updates[`lotes_producao/${lote_producao_id}/saldo_disponivel_para_ocupar`] = novoSaldo;

  // CAMPO LEGADO TEMPORÁRIO
  updates[`lotes_producao/${lote_producao_id}/quantidade_atual`] = novoSaldo;

  await update(ref(db), updates);

  await registrarMovimentacaoLote({
    lote_producao_id,
    ocupacao_origem_id,
    ocupacao_destino_id: ocupacaoId,
    bancada_origem_id: null,
    bancada_destino_id: bancada_id,
    quantidade_movimentada: quantidade,
    data_movimentacao: data_inicio,
    tipo_movimentacao:
      tipoOcupacao === "entrada_direta_final"
        ? "entrada_direta_final"
        : "ocupacao_inicial"
  });

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

  return true;
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

  const bancadaOrigem = await carregarBancada(ocupacaoOrigem.bancada_id);
  const bancadaDestino = await carregarBancada(bancada_destino_id);

  if ((bancadaOrigem.tipo || "").toLowerCase() !== "bercario") {
    throw new Error("O transplante operacional só deve sair de bancadas do tipo 'bercario'.");
  }

  if ((bancadaDestino.tipo || "").toLowerCase() !== "final") {
    throw new Error("O transplante operacional só deve ir para bancadas do tipo 'final'.");
  }

  const qtd = Number(quantidade_transplantada);

  if (qtd <= 0) {
    throw new Error("A quantidade transplantada deve ser maior que zero.");
  }

  if (qtd > Number(ocupacaoOrigem.quantidade_alocada)) {
    throw new Error(
      "A quantidade transplantada é maior que a quantidade alocada na ocupação de origem."
    );
  }

  const ocupacoesAtivasDestino = await listarOcupacoesAtivasPorBancada(bancada_destino_id);

  const posIniDestino = Number(posicao_inicial_destino);
  const posFimDestino = Number(posicao_final_destino);

  if (existeConflitoDeFaixa(ocupacoesAtivasDestino, posIniDestino, posFimDestino)) {
    throw new Error("A faixa de destino já está ocupada por outro lote.");
  }

  const ocupacaoDestinoId = gerarId("ocp");

  const novaOcupacao = {
    id: ocupacaoDestinoId,
    lote_producao_id: ocupacaoOrigem.lote_producao_id,
    bancada_id: bancada_destino_id,
    ocupacao_origem_id: ocupacao_origem_id,
    posicao_inicial: posIniDestino,
    posicao_final: posFimDestino,
    quantidade_alocada: qtd,
    data_inicio: data_transplante,
    data_fim: null,
    tipo_ocupacao: "transplante",
    status: "ativa"
  };

  const updates = {};
  updates[`ocupacoes_bancada/${ocupacaoDestinoId}`] = novaOcupacao;
  updates[`bancadas/${bancada_destino_id}/status`] = "ocupada";

  const novaQtdOrigem = Number(ocupacaoOrigem.quantidade_alocada) - qtd;

  if (encerrar_ocupacao_origem || novaQtdOrigem === 0) {
    updates[`ocupacoes_bancada/${ocupacao_origem_id}/status`] = "encerrada";
    updates[`ocupacoes_bancada/${ocupacao_origem_id}/data_fim`] = data_transplante;
  } else {
    updates[`ocupacoes_bancada/${ocupacao_origem_id}/quantidade_alocada`] = novaQtdOrigem;
  }

  await update(ref(db), updates);

  await registrarMovimentacaoLote({
    lote_producao_id: ocupacaoOrigem.lote_producao_id,
    ocupacao_origem_id: ocupacao_origem_id,
    ocupacao_destino_id: ocupacaoDestinoId,
    bancada_origem_id: ocupacaoOrigem.bancada_id,
    bancada_destino_id,
    quantidade_movimentada: qtd,
    data_movimentacao: data_transplante,
    tipo_movimentacao: "transplante"
  });

  if (encerrar_ocupacao_origem || novaQtdOrigem === 0) {
    const ocupacoesRestantesOrigem = await listarOcupacoesAtivasPorBancada(
      ocupacaoOrigem.bancada_id
    );

    await update(ref(db, `bancadas/${ocupacaoOrigem.bancada_id}`), {
      status: ocupacoesRestantesOrigem.length > 0 ? "ocupada" : "vazia"
    });
  }

  return {
    nova_ocupacao: novaOcupacao
  };
}