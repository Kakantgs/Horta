import { get, ref, remove, set, update } from "firebase/database";
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

export async function criarBancada({
  codigo,
  tipo,
  capacidade_total,
  status = "vazia",
  x,
  y
}) {
  const id = gerarId("ban");

  const codigoNormalizado = (codigo || "").trim().toUpperCase();
  const tipoValidado = validarTipoBancada(tipo);
  const statusValidado = validarStatusBancada(status);

  if (!codigoNormalizado) {
    throw new Error("Código da bancada é obrigatório.");
  }

  if (Number(capacidade_total) <= 0) {
    throw new Error("Capacidade total deve ser maior que zero.");
  }

  const snapshot = await get(ref(db, "bancadas"));
  const existentes = snapshot.exists() ? Object.values(snapshot.val()) : [];

  const codigoJaExiste = existentes.some(
    (item) => (item.codigo || "").trim().toUpperCase() === codigoNormalizado
  );

  if (codigoJaExiste) {
    throw new Error("Já existe uma bancada com esse código.");
  }

  const novaBancada = {
    id,
    codigo: codigoNormalizado,
    tipo: tipoValidado,
    capacidade_total: Number(capacidade_total),
    status: statusValidado,
    x: Number(x),
    y: Number(y),
    active: true
  };

  await set(ref(db, `bancadas/${id}`), novaBancada);
  return novaBancada;
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
  await remove(ref(db, `bancadas/${id}`));
}