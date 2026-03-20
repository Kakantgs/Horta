import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function criarCliente({ nome, tipo_cliente, telefone, email }) {
  const id = gerarId("cli");

  const novoCliente = {
    id,
    nome: nome.trim(),
    tipo_cliente: tipo_cliente?.trim() || "",
    telefone: telefone?.trim() || "",
    email: email?.trim() || ""
  };

  await set(ref(db, `clientes/${id}`), novoCliente);
  return novoCliente;
}

export async function listarClientes() {
  const snapshot = await get(ref(db, "clientes"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val());
}

export async function atualizarCliente(id, dados) {
  await update(ref(db, `clientes/${id}`), dados);
}

export async function excluirCliente(id) {
  await remove(ref(db, `clientes/${id}`));
}