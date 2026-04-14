import { ref, set, get, update, remove } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function normalizarBoolean(valor) {
  return valor === true || String(valor).toLowerCase() === "true";
}

function normalizarPreco(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === "") {
    return 0;
  }

  const numero = Number(String(valor).replace(/\s+/g, "").replace(",", "."));

  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error("Preço padrão inválido.");
  }

  return Number(numero.toFixed(2));
}

function mapearCliente(item) {
  return {
    ...item,
    usa_preco_padrao: Boolean(item.usa_preco_padrao),
    preco_padrao: Number(item.preco_padrao || 0)
  };
}

export async function criarCliente({
  nome,
  tipo_cliente,
  telefone,
  email,
  usa_preco_padrao = false,
  preco_padrao = 0
}) {
  if (!nome || !nome.trim()) {
    throw new Error("Nome do cliente é obrigatório.");
  }

  const id = gerarId("cli");
  const usaPrecoPadrao = normalizarBoolean(usa_preco_padrao);
  const precoPadraoNormalizado = normalizarPreco(preco_padrao);

  const novoCliente = {
    id,
    nome: normalizarTexto(nome),
    tipo_cliente: normalizarTexto(tipo_cliente),
    telefone: normalizarTexto(telefone),
    email: normalizarTexto(email),
    usa_preco_padrao: usaPrecoPadrao,
    preco_padrao: usaPrecoPadrao ? precoPadraoNormalizado : 0,
    ativo: true
  };

  await set(ref(db, `clientes/${id}`), novoCliente);
  return novoCliente;
}

export async function listarClientesCadastro() {
  const snapshot = await get(ref(db, "clientes"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val())
    .map(mapearCliente)
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
}

export async function atualizarCliente(id, dados) {
  const payload = { ...dados };

  if (payload.nome !== undefined) {
    payload.nome = normalizarTexto(payload.nome);
  }

  if (payload.tipo_cliente !== undefined) {
    payload.tipo_cliente = normalizarTexto(payload.tipo_cliente);
  }

  if (payload.telefone !== undefined) {
    payload.telefone = normalizarTexto(payload.telefone);
  }

  if (payload.email !== undefined) {
    payload.email = normalizarTexto(payload.email);
  }

  if (payload.usa_preco_padrao !== undefined) {
    payload.usa_preco_padrao = normalizarBoolean(payload.usa_preco_padrao);
  }

  if (payload.preco_padrao !== undefined) {
    payload.preco_padrao = normalizarPreco(payload.preco_padrao);
  }

  if (payload.usa_preco_padrao === false && payload.preco_padrao === undefined) {
    payload.preco_padrao = 0;
  }

  if (payload.usa_preco_padrao === false) {
    payload.preco_padrao = 0;
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