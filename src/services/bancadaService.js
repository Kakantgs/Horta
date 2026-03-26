import { ref, set, get, update, remove } from "firebase/database";
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

function gerarCodigoBancada(setorCodigo, numero) {
  return `${(setorCodigo || "").trim().toUpperCase()}${numero}`;
}

function extrairNumeroCodigo(codigo, setorCodigo) {
  const prefixo = (setorCodigo || "").trim().toUpperCase();
  const codigoNormalizado = (codigo || "").trim().toUpperCase();

  if (!codigoNormalizado.startsWith(prefixo)) return null;

  const parteNumero = codigoNormalizado.slice(prefixo.length);
  const numero = Number(parteNumero);

  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function encontrarMenorNumeroLivre(numerosUsados) {
  let numero = 1;
  const usados = new Set(numerosUsados);

  while (usados.has(numero)) {
    numero++;
  }

  return numero;
}

async function obterProximoNumeroBancada(setor) {
  const bancadasSnapshot = await get(ref(db, "bancadas"));
  const bancadas = bancadasSnapshot.exists()
    ? Object.values(bancadasSnapshot.val())
    : [];

  const numerosUsados = bancadas
    .filter((item) => item.setor_id === setor.id)
    .map((item) => extrairNumeroCodigo(item.codigo, setor.codigo))
    .filter((item) => item !== null);

  return encontrarMenorNumeroLivre(numerosUsados);
}

async function recalcularContadorSetor(setor) {
  const bancadasSnapshot = await get(ref(db, "bancadas"));
  const bancadas = bancadasSnapshot.exists()
    ? Object.values(bancadasSnapshot.val())
    : [];

  const numerosUsados = bancadas
    .filter((item) => item.setor_id === setor.id)
    .map((item) => extrairNumeroCodigo(item.codigo, setor.codigo))
    .filter((item) => item !== null);

  const maior = numerosUsados.length ? Math.max(...numerosUsados) : 0;

  await update(ref(db, `setores/${setor.id}`), {
    contador_bancadas: maior
  });
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

  const proximoNumero = await obterProximoNumeroBancada(setor);
  const codigo = gerarCodigoBancada(setor.codigo, proximoNumero);
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

  await set(ref(db, `bancadas/${id}`), novaBancada);
  await recalcularContadorSetor(setor);

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

  const bancadasSnapshot = await get(ref(db, "bancadas"));
  const bancadasExistentes = bancadasSnapshot.exists()
    ? Object.values(bancadasSnapshot.val())
    : [];

  const numerosUsados = bancadasExistentes
    .filter((item) => item.setor_id === setor.id)
    .map((item) => extrairNumeroCodigo(item.codigo, setor.codigo))
    .filter((item) => item !== null);

  const usados = new Set(numerosUsados);

  const updates = {};
  const criadas = [];

  let numeroAtual = 1;

  for (let i = 1; i <= qtd; i++) {
    while (usados.has(numeroAtual)) {
      numeroAtual++;
    }

    const codigo = gerarCodigoBancada(setor.codigo, numeroAtual);
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
    usados.add(numeroAtual);
    numeroAtual++;
  }

  await update(ref(db), updates);
  await recalcularContadorSetor(setor);

  return criadas;
}

export async function listarBancadas() {
  const snapshot = await get(ref(db, "bancadas"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true })
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
  const [ocupacoesSnapshot, bancadaSnapshot] = await Promise.all([
    get(ref(db, "ocupacoes_bancada")),
    get(ref(db, `bancadas/${id}`))
  ]);

  if (!bancadaSnapshot.exists()) {
    throw new Error("Bancada não encontrada.");
  }

  const bancada = bancadaSnapshot.val();

  const ocupacoes = ocupacoesSnapshot.exists()
    ? Object.values(ocupacoesSnapshot.val())
    : [];

  const ocupacoesDaBancada = ocupacoes.filter((item) => item.bancada_id === id);

  if (ocupacoesDaBancada.length > 0) {
    const existeAtiva = ocupacoesDaBancada.some((item) => item.status === "ativa");

    if (existeAtiva) {
      throw new Error("Não é possível excluir a bancada porque ela possui ocupação ativa.");
    }

    throw new Error("Não é possível excluir a bancada porque ela possui histórico de ocupações.");
  }

  await remove(ref(db, `bancadas/${id}`));

  if (bancada.setor_id) {
    const setorSnapshot = await get(ref(db, `setores/${bancada.setor_id}`));
    if (setorSnapshot.exists()) {
      await recalcularContadorSetor(setorSnapshot.val());
    }
  }
}

export async function inativarBancada(id) {
  const ocupacoesSnapshot = await get(ref(db, "ocupacoes_bancada"));

  const ocupacoes = ocupacoesSnapshot.exists()
    ? Object.values(ocupacoesSnapshot.val())
    : [];

  const existeOcupacaoAtiva = ocupacoes.some(
    (item) => item.bancada_id === id && item.status === "ativa"
  );

  if (existeOcupacaoAtiva) {
    throw new Error("Não é possível inativar a bancada porque ela possui ocupação ativa.");
  }

  await update(ref(db, `bancadas/${id}`), {
    active: false,
    status: "inativa"
  });
}

export async function reativarBancada(id) {
  await update(ref(db, `bancadas/${id}`), {
    active: true,
    status: "vazia"
  });
}