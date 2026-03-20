import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function criarBancada({
  codigo,
  tipo,
  capacidade_total,
  status,
  x,
  y
}) {
  const id = gerarId("banc");

  const snapshot = await get(ref(db, "bancadas"));

  if (snapshot.exists()) {
    const bancadas = Object.values(snapshot.val());

    const codigoDuplicado = bancadas.find(
      (bancada) => bancada.codigo?.toUpperCase() === codigo.trim().toUpperCase()
    );

    if (codigoDuplicado) {
      throw new Error("Já existe uma bancada com esse código.");
    }

    const posicaoDuplicada = bancadas.find(
      (bancada) =>
        Number(bancada.x) === Number(x) &&
        Number(bancada.y) === Number(y)
    );

    if (posicaoDuplicada) {
      throw new Error("Já existe uma bancada nessa posição do mapa.");
    }
  }

  const novaBancada = {
    id,
    codigo: codigo.trim().toUpperCase(),
    tipo: tipo.trim().toLowerCase(),
    capacidade_total: Number(capacidade_total),
    status: status.trim().toLowerCase(),
    x: Number(x),
    y: Number(y),
    ativo: true
  };

  await set(ref(db, `bancadas/${id}`), novaBancada);
  return novaBancada;
}

export async function listarBancadas() {
  const snapshot = await get(ref(db, "bancadas"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val());
}

export async function atualizarBancada(id, dados) {
  await update(ref(db, `bancadas/${id}`), dados);
}

export async function excluirBancada(id) {
  await remove(ref(db, `bancadas/${id}`));
}