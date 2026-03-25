import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function criarVariedade({ nome, categoria, ciclo_medio_dias }) {
  const id = gerarId("var");

  const novaVariedade = {
    id,
    nome: nome.trim(),
    categoria: categoria?.trim() || "",
    ciclo_medio_dias: Number(ciclo_medio_dias) || 0
  };

  await set(ref(db, `variedades/${id}`), novaVariedade);
  return novaVariedade;
}

export async function listarVariedades() {
  const snapshot = await get(ref(db, "variedades"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val());
}

export async function atualizarVariedade(id, dados) {
  await update(ref(db, `variedades/${id}`), dados);
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