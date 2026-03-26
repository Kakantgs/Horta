import { get, ref, remove, set, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

function normalizarCodigo(codigo) {
  return (codigo || "").trim().toUpperCase();
}

export async function criarSetor({
  codigo,
  nome,
  descricao = "",
  ativo = true
}) {
  const codigoNormalizado = normalizarCodigo(codigo);

  if (!codigoNormalizado) {
    throw new Error("Código do setor é obrigatório.");
  }

  const snapshot = await get(ref(db, "setores"));
  const setores = snapshot.exists() ? Object.values(snapshot.val()) : [];

  const codigoJaExiste = setores.some(
    (item) => normalizarCodigo(item.codigo) === codigoNormalizado
  );

  if (codigoJaExiste) {
    throw new Error("Já existe um setor com esse código.");
  }

  const id = gerarId("set");
  const novoSetor = {
    id,
    codigo: codigoNormalizado,
    nome: (nome || "").trim() || `Setor ${codigoNormalizado}`,
    descricao: (descricao || "").trim(),
    ativo: Boolean(ativo),
    contador_bancadas: 0
  };

  await set(ref(db, `setores/${id}`), novoSetor);
  return novoSetor;
}

export async function listarSetores() {
  const snapshot = await get(ref(db, "setores"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (a.codigo || "").localeCompare(b.codigo || "")
  );
}

export async function buscarSetorPorId(id) {
  const snapshot = await get(ref(db, `setores/${id}`));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function atualizarSetor(id, dados) {
  const payload = { ...dados };

  if (payload.codigo !== undefined) {
    payload.codigo = normalizarCodigo(payload.codigo);
  }

  if (payload.nome !== undefined) {
    payload.nome = (payload.nome || "").trim();
  }

  if (payload.descricao !== undefined) {
    payload.descricao = (payload.descricao || "").trim();
  }

  await update(ref(db, `setores/${id}`), payload);
}

export async function excluirSetor(id) {
  const [bancadasSnapshot, monitoramentosSnapshot, ocorrenciasSnapshot] =
    await Promise.all([
      get(ref(db, "bancadas")),
      get(ref(db, "monitoramentos_setor")),
      get(ref(db, "ocorrencias_setor"))
    ]);

  const bancadas = bancadasSnapshot.exists()
    ? Object.values(bancadasSnapshot.val())
    : [];

  const monitoramentos = monitoramentosSnapshot.exists()
    ? Object.values(monitoramentosSnapshot.val())
    : [];

  const ocorrencias = ocorrenciasSnapshot.exists()
    ? Object.values(ocorrenciasSnapshot.val())
    : [];

  const existeBancadaNoSetor = bancadas.some((item) => item.setor_id === id);
  if (existeBancadaNoSetor) {
    throw new Error("Não é possível excluir um setor que possui bancadas vinculadas.");
  }

  const existeMonitoramento = monitoramentos.some((item) => item.setor_id === id);
  if (existeMonitoramento) {
    throw new Error("Não é possível excluir um setor que possui monitoramentos vinculados.");
  }

  const existeOcorrencia = ocorrencias.some((item) => item.setor_id === id);
  if (existeOcorrencia) {
    throw new Error("Não é possível excluir um setor que possui ocorrências vinculadas.");
  }

  await remove(ref(db, `setores/${id}`));
}

export async function inativarSetor(id) {
  const bancadasSnapshot = await get(ref(db, "bancadas"));

  const bancadas = bancadasSnapshot.exists()
    ? Object.values(bancadasSnapshot.val())
    : [];

  const existeBancadaAtiva = bancadas.some(
    (item) => item.setor_id === id && item.active !== false
  );

  if (existeBancadaAtiva) {
    throw new Error("Não é possível inativar o setor porque ele ainda possui bancadas ativas.");
  }

  await update(ref(db, `setores/${id}`), {
    ativo: false
  });
}

export async function reativarSetor(id) {
  await update(ref(db, `setores/${id}`), {
    ativo: true
  });
}