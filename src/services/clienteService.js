import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function criarCliente({
  nome,
  tipo_cliente,
  telefone,
  email
}) {
  if (!nome || !nome.trim()) {
    throw new Error("Nome do cliente é obrigatório.");
  }

  const id = gerarId("cli");

  const novoCliente = {
    id,
    nome: nome.trim(),
    tipo_cliente: (tipo_cliente || "").trim(),
    telefone: (telefone || "").trim(),
    email: (email || "").trim(),
    ativo: true
  };

  await set(ref(db, `clientes/${id}`), novoCliente);
  return novoCliente;
}

export async function listarClientesCadastro() {
  const snapshot = await get(ref(db, "clientes"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || "")
  );
}

export async function atualizarCliente(id, dados) {
  const payload = { ...dados };

  if (payload.nome !== undefined) {
    payload.nome = (payload.nome || "").trim();
  }

  if (payload.tipo_cliente !== undefined) {
    payload.tipo_cliente = (payload.tipo_cliente || "").trim();
  }

  if (payload.telefone !== undefined) {
    payload.telefone = (payload.telefone || "").trim();
  }

  if (payload.email !== undefined) {
    payload.email = (payload.email || "").trim();
  }

  await update(ref(db, `clientes/${id}`), payload);
}

export async function excluirCliente(id) {
  const pedidosSnapshot = await get(ref(db, "pedidos_venda"));

  const pedidos = pedidosSnapshot.exists()
    ? Object.values(pedidosSnapshot.val())
    : [];

  const existePedido = pedidos.some((item) => item.cliente_id === id);

  if (existePedido) {
    throw new Error("Não é possível excluir o cliente porque ele possui pedidos de venda vinculados.");
  }

  await remove(ref(db, `clientes/${id}`));
}

export async function inativarCliente(id) {
  await update(ref(db, `clientes/${id}`), {
    ativo: false
  });
}

export async function reativarCliente(id) {
  await update(ref(db, `clientes/${id}`), {
    ativo: true
  });
}