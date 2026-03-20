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
  await remove(ref(db, `variedades/${id}`));
}