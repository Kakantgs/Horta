import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function criarFornecedor({ nome, cnpj, telefone, email }) {
  const id = gerarId("forn");

  const novoFornecedor = {
    id,
    nome: nome.trim(),
    cnpj: cnpj?.trim() || "",
    telefone: telefone?.trim() || "",
    email: email?.trim() || ""
  };

  await set(ref(db, `fornecedores/${id}`), novoFornecedor);
  return novoFornecedor;
}

export async function listarFornecedores() {
  const snapshot = await get(ref(db, "fornecedores"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val());
}

export async function atualizarFornecedor(id, dados) {
  await update(ref(db, `fornecedores/${id}`), dados);
}

export async function excluirFornecedor(id) {
  const entradasSnapshot = await get(ref(db, "entradas"));

  const entradas = entradasSnapshot.exists()
    ? Object.values(entradasSnapshot.val())
    : [];

  const existeEntrada = entradas.some((item) => item.fornecedor_id === id);

  if (existeEntrada) {
    throw new Error("Não é possível excluir o fornecedor porque ele possui entradas vinculadas.");
  }

  await remove(ref(db, `fornecedores/${id}`));
}