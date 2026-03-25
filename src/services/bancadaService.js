import { get, ref, remove, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

const TIPOS_VALIDOS_BANCADA = ["bercario", "final"];
const STATUS_VALIDOS_BANCADA = ["vazia", "ocupada", "alerta", "manutencao", "inativa"];

function normalizarTipo(tipo) {
  return (tipo || "").trim().toLowerCase();
}

function normalizarStatus(status) {
  return (status || "").trim().toLowerCase();
}

function validarTipoBancada(tipo) {
  const valor = normalizarTipo(tipo);

  if (!TIPOS_VALIDOS_BANCADA.includes(valor)) {
    throw new Error("Tipo de bancada inválido. Use apenas 'bercario' ou 'final'.");
  }

  return valor;
}

function validarStatusBancada(status) {
  const valor = normalizarStatus(status || "vazia");

  if (!STATUS_VALIDOS_BANCADA.includes(valor)) {
    throw new Error("Status de bancada inválido.");
  }

  return valor;
}

async function buscarSetorObrigatorio(setorId) {
  const snapshot = await get(ref(db, `setores/${setorId}`));

  if (!snapshot.exists()) {
    throw new Error("Setor não encontrado.");
  }

  const setor = snapshot.val();

  if (!setor.ativo) {
    throw new Error("O setor selecionado está inativo.");
  }

  return setor;
}

function gerarCodigoBancada(setorCodigo, contador) {
  return `${(setorCodigo || "").trim().toUpperCase()}${contador}`;
}

export async function criarBancada({
  setor_id,
  tipo,
  capacidade_total,
  status = "vazia",
  x,
  y
}) {
  const setor = await buscarSetorObrigatorio(setor_id);

  const tipoValidado = validarTipoBancada(tipo);
  const statusValidado = validarStatusBancada(status);

  if (Number(capacidade_total) <= 0) {
    throw new Error("Capacidade total deve ser maior que zero.");
  }

  const novoContador = Number(setor.contador_bancadas || 0) + 1;
  const codigo = gerarCodigoBancada(setor.codigo, novoContador);
  const id = gerarId("ban");

  const novaBancada = {
    id,
    codigo,
    setor_id: setor.id,
    setor_codigo: setor.codigo,
    tipo: tipoValidado,
    capacidade_total: Number(capacidade_total),
    status: statusValidado,
    x: Number(x),
    y: Number(y),
    active: true
  };

  const updates = {};
  updates[`bancadas/${id}`] = novaBancada;
  updates[`setores/${setor.id}/contador_bancadas`] = novoContador;

  await update(ref(db), updates);

  return novaBancada;
}

export async function criarMultiplasBancadas({
  setor_id,
  tipo,
  capacidade_total,
  status = "vazia",
  quantidade,
  x_inicial = 0,
  y_inicial = 0,
  eixo_incremento = "x"
}) {
  const setor = await buscarSetorObrigatorio(setor_id);

  const tipoValidado = validarTipoBancada(tipo);
  const statusValidado = validarStatusBancada(status);
  const qtd = Number(quantidade);

  if (Number(capacidade_total) <= 0) {
    throw new Error("Capacidade total deve ser maior que zero.");
  }

  if (qtd <= 0) {
    throw new Error("A quantidade de bancadas deve ser maior que zero.");
  }

  if (!["x", "y"].includes((eixo_incremento || "").toLowerCase())) {
    throw new Error("O eixo de incremento deve ser 'x' ou 'y'.");
  }

  const contadorInicial = Number(setor.contador_bancadas || 0);
  const updates = {};
  const criadas = [];

  for (let i = 1; i <= qtd; i++) {
    const contadorAtual = contadorInicial + i;
    const codigo = gerarCodigoBancada(setor.codigo, contadorAtual);
    const id = gerarId("ban");

    const x = (eixo_incremento || "").toLowerCase() === "x"
      ? Number(x_inicial) + (i - 1)
      : Number(x_inicial);

    const y = (eixo_incremento || "").toLowerCase() === "y"
      ? Number(y_inicial) + (i - 1)
      : Number(y_inicial);

    const bancada = {
      id,
      codigo,
      setor_id: setor.id,
      setor_codigo: setor.codigo,
      tipo: tipoValidado,
      capacidade_total: Number(capacidade_total),
      status: statusValidado,
      x,
      y,
      active: true
    };

    updates[`bancadas/${id}`] = bancada;
    criadas.push(bancada);
  }

  updates[`setores/${setor.id}/contador_bancadas`] = contadorInicial + qtd;

  await update(ref(db), updates);

  return criadas;
}

export async function listarBancadas() {
  const snapshot = await get(ref(db, "bancadas"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (a.codigo || "").localeCompare(b.codigo || "")
  );
}

export async function atualizarBancada(id, dados) {
  const payload = { ...dados };

  if (payload.tipo !== undefined) {
    payload.tipo = validarTipoBancada(payload.tipo);
  }

  if (payload.status !== undefined) {
    payload.status = validarStatusBancada(payload.status);
  }

  if (payload.capacidade_total !== undefined) {
    payload.capacidade_total = Number(payload.capacidade_total);
  }

  if (payload.x !== undefined) {
    payload.x = Number(payload.x);
  }

  if (payload.y !== undefined) {
    payload.y = Number(payload.y);
  }

  await update(ref(db, `bancadas/${id}`), payload);
}

export async function excluirBancada(id) {
  const [ocupacoesSnapshot, colheitasSnapshot] = await Promise.all([
    get(ref(db, "ocupacoes_bancada")),
    get(ref(db, "colheitas"))
  ]);

  const ocupacoes = ocupacoesSnapshot.exists()
    ? Object.values(ocupacoesSnapshot.val())
    : [];

  const colheitas = colheitasSnapshot.exists()
    ? Object.values(colheitasSnapshot.val())
    : [];

  const ocupacoesDaBancada = ocupacoes.filter((item) => item.bancada_id === id);

  if (ocupacoesDaBancada.length > 0) {
    const existeAtiva = ocupacoesDaBancada.some((item) => item.status === "ativa");

    if (existeAtiva) {
      throw new Error("Não é possível excluir a bancada porque ela possui ocupação ativa.");
    }

    throw new Error("Não é possível excluir a bancada porque ela possui histórico de ocupações.");
  }

  const ocupacaoIds = ocupacoesDaBancada.map((item) => item.id);

  const existeColheitaVinculada = colheitas.some((item) =>
    ocupacaoIds.includes(item.ocupacao_bancada_id)
  );

  if (existeColheitaVinculada) {
    throw new Error("Não é possível excluir a bancada porque ela possui colheitas vinculadas.");
  }

  await remove(ref(db, `bancadas/${id}`));
}