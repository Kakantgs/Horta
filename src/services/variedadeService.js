import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function normalizarCicloMedio(valor) {
  const numero = Number(valor || 0);

  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error("Ciclo médio da variedade inválido.");
  }

  return numero;
}

export async function criarVariedade({
  nome,
  categoria,
  ciclo_medio_dias
}) {
  const nomeNormalizado = normalizarTexto(nome);

  if (!nomeNormalizado) {
    throw new Error("Nome da variedade é obrigatório.");
  }

  const id = gerarId("var");

  const novaVariedade = {
    id,
    nome: nomeNormalizado,
    categoria: normalizarTexto(categoria),
    ciclo_medio_dias: normalizarCicloMedio(ciclo_medio_dias),
    ativo: true
  };

  await set(ref(db, `variedades/${id}`), novaVariedade);
  return novaVariedade;
}

export async function listarVariedadesCadastro() {
  const snapshot = await get(ref(db, "variedades"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || "")
  );
}

export async function atualizarVariedade(id, dados) {
  const payload = { ...dados };

  if (payload.nome !== undefined) {
    payload.nome = normalizarTexto(payload.nome);

    if (!payload.nome) {
      throw new Error("Nome da variedade é obrigatório.");
    }
  }

  if (payload.categoria !== undefined) {
    payload.categoria = normalizarTexto(payload.categoria);
  }

  if (payload.ciclo_medio_dias !== undefined) {
    payload.ciclo_medio_dias = normalizarCicloMedio(payload.ciclo_medio_dias);
  }

  await update(ref(db, `variedades/${id}`), payload);
}

export async function excluirVariedade(id) {
  const [entradasSnapshot, lotesSnapshot] = await Promise.all([
    get(ref(db, "entradas")),
    get(ref(db, "lotes_producao"))
  ]);

  const entradas = entradasSnapshot.exists()
    ? Object.values(entradasSnapshot.val())
    : [];

  const lotes = lotesSnapshot.exists()
    ? Object.values(lotesSnapshot.val())
    : [];

  const existeEntrada = entradas.some((item) => item.variedade_id === id);
  if (existeEntrada) {
    throw new Error("Não é possível excluir a variedade porque ela possui entradas vinculadas.");
  }

  const existeLote = lotes.some((item) => item.variedade_id === id);
  if (existeLote) {
    throw new Error("Não é possível excluir a variedade porque ela possui lotes vinculados.");
  }

  await remove(ref(db, `variedades/${id}`));
}

export async function inativarVariedade(id) {
  await update(ref(db, `variedades/${id}`), {
    ativo: false
  });
}

export async function reativarVariedade(id) {
  await update(ref(db, `variedades/${id}`), {
    ativo: true
  });
}
