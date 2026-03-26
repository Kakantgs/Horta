import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function criarFornecedor({ nome, cnpj, telefone, email }) {
  if (!nome || !nome.trim()) {
    throw new Error("Nome do fornecedor é obrigatório.");
  }

  const id = gerarId("for");

  const novoFornecedor = {
    id,
    nome: nome.trim(),
    cnpj: (cnpj || "").trim(),
    telefone: (telefone || "").trim(),
    email: (email || "").trim(),
    ativo: true
  };

  await set(ref(db, `fornecedores/${id}`), novoFornecedor);
  return novoFornecedor;
}

export async function listarFornecedores() {
  const snapshot = await get(ref(db, "fornecedores"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || "")
  );
}

export async function atualizarFornecedor(id, dados) {
  const payload = { ...dados };

  if (payload.nome !== undefined) {
    payload.nome = (payload.nome || "").trim();
  }

  if (payload.cnpj !== undefined) {
    payload.cnpj = (payload.cnpj || "").trim();
  }

  if (payload.telefone !== undefined) {
    payload.telefone = (payload.telefone || "").trim();
  }

  if (payload.email !== undefined) {
    payload.email = (payload.email || "").trim();
  }

  await update(ref(db, `fornecedores/${id}`), payload);
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

export async function inativarFornecedor(id) {
  const entradasSnapshot = await get(ref(db, "entradas"));

  const entradas = entradasSnapshot.exists()
    ? Object.values(entradasSnapshot.val())
    : [];

  const existeEntrada = entradas.some((item) => item.fornecedor_id === id);

  if (existeEntrada) {
    throw new Error("Esse fornecedor possui histórico de entradas. Use inativação apenas se quiser manter o histórico.");
  }

  await update(ref(db, `fornecedores/${id}`), {
    ativo: false
  });
}

export async function reativarFornecedor(id) {
  await update(ref(db, `fornecedores/${id}`), {
    ativo: true
  });
}