import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";

export async function listarClientes() {
  const snapshot = await get(ref(db, "clientes"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val())
    .filter((item) => item.ativo !== false)
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
}

export async function listarLotesComerciaisDisponiveis() {
  const [
    lotesComerciaisSnapshot,
    lotesProducaoSnapshot,
    variedadesSnapshot
  ] = await Promise.all([
    get(ref(db, "lotes_comerciais")),
    get(ref(db, "lotes_producao")),
    get(ref(db, "variedades"))
  ]);

  if (!lotesComerciaisSnapshot.exists()) return [];

  const lotesComerciais = Object.values(lotesComerciaisSnapshot.val());
  const lotesProducao = lotesProducaoSnapshot.exists()
    ? Object.values(lotesProducaoSnapshot.val())
    : [];
  const variedades = variedadesSnapshot.exists()
    ? Object.values(variedadesSnapshot.val())
    : [];

  return lotesComerciais
    .filter((item) => Number(item.quantidade_disponivel) > 0)
    .map((item) => {
      const loteProducao = lotesProducao.find(
        (lp) => lp.id === item.lote_producao_id
      );

      const variedade = loteProducao
        ? variedades.find((v) => v.id === loteProducao.variedade_id)
        : null;

      return {
        ...item,
        codigo_lote_producao: loteProducao?.codigo_lote || "-",
        variedade_nome:
          variedade?.nome || loteProducao?.variedade_nome || "Sem variedade"
      };
    })
    .sort((a, b) => (b.data_formacao || "").localeCompare(a.data_formacao || ""));
}

export async function registrarVenda({
  cliente_id,
  lote_comercial_id,
  quantidade,
  preco_unitario,
  data_venda
}) {
  const [clienteSnapshot, loteSnapshot] = await Promise.all([
    get(ref(db, `clientes/${cliente_id}`)),
    get(ref(db, `lotes_comerciais/${lote_comercial_id}`))
  ]);

  if (!clienteSnapshot.exists()) {
    throw new Error("Cliente não encontrado.");
  }

  if (!loteSnapshot.exists()) {
    throw new Error("Lote comercial não encontrado.");
  }

  const cliente = clienteSnapshot.val();
  const lote = loteSnapshot.val();

  const qtd = Number(quantidade);
  const preco = Number(preco_unitario);

  if (qtd <= 0) {
    throw new Error("A quantidade vendida deve ser maior que zero.");
  }

  if (preco < 0) {
    throw new Error("O preço unitário não pode ser negativo.");
  }

  if (qtd > Number(lote.quantidade_disponivel)) {
    throw new Error("A quantidade vendida é maior que o saldo disponível do lote comercial.");
  }

  const pedidoId = gerarId("ped");
  const itemId = gerarId("item");

  const novoPedido = {
    id: pedidoId,
    cliente_id,
    cliente_nome: cliente.nome,
    data_venda,
    status: "concluido"
  };

  const novoItem = {
    id: itemId,
    pedido_venda_id: pedidoId,
    lote_comercial_id,
    codigo_lote_comercial: lote.codigo_lote_comercial,
    quantidade: qtd,
    preco_unitario: preco
  };

  const novaQuantidadeDisponivel = Number(lote.quantidade_disponivel) - qtd;

  let novoStatusLote = "disponivel";
  if (novaQuantidadeDisponivel === 0) {
    novoStatusLote = "vendido";
  } else if (novaQuantidadeDisponivel < Number(lote.quantidade_inicial)) {
    novoStatusLote = "parcial";
  }

  const updates = {};
  updates[`pedidos_venda/${pedidoId}`] = novoPedido;
  updates[`itens_pedido_venda/${itemId}`] = novoItem;
  updates[`lotes_comerciais/${lote_comercial_id}/quantidade_disponivel`] =
    novaQuantidadeDisponivel;
  updates[`lotes_comerciais/${lote_comercial_id}/status`] = novoStatusLote;

  await update(ref(db), updates);

  return {
    pedido: novoPedido,
    item: novoItem,
    lote_atualizado: {
      ...lote,
      quantidade_disponivel: novaQuantidadeDisponivel,
      status: novoStatusLote
    }
  };
}

export async function listarPedidosVenda() {
  const snapshot = await get(ref(db, "pedidos_venda"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (b.data_venda || "").localeCompare(a.data_venda || "")
  );
}

export async function listarItensPedido() {
  const snapshot = await get(ref(db, "itens_pedido_venda"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val());
}