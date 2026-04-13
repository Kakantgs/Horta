import {
  get,
  ref,
  update,
  query,
  orderByChild,
  limitToLast,
  endBefore
} from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";
import { validarDataISO } from "./entradaService";

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function parseNumeroInteiro(valor) {
  return Number(String(valor || "").replace(/\s+/g, ""));
}

function parseNumeroDecimal(valor) {
  return Number(String(valor || "").replace(",", ".").replace(/\s+/g, ""));
}

function montarStatusLoteComercial(lote, novaQuantidadeDisponivel) {
  if (novaQuantidadeDisponivel === 0) return "vendido";
  if (novaQuantidadeDisponivel < Number(lote.quantidade_inicial || 0)) return "parcial";
  return "disponivel";
}

function montarCursor(item) {
  if (!item) return null;

  return {
    value: item.data_formacao || "",
    key: item._cursorKey || item.id
  };
}

async function carregarPaginaBrutaLotesComerciais({ limit, cursor = null }) {
  const constraints = [orderByChild("data_formacao")];

  if (cursor?.value !== undefined && cursor?.key) {
    constraints.push(endBefore(cursor.value, cursor.key));
  }

  constraints.push(limitToLast(limit));

  const snapshot = await get(query(ref(db, "lotes_comerciais"), ...constraints));

  if (!snapshot.exists()) return [];

  const itens = [];
  snapshot.forEach((childSnapshot) => {
    const valor = childSnapshot.val() || {};
    itens.push({
      ...valor,
      id: valor.id || childSnapshot.key,
      _cursorKey: childSnapshot.key
    });
  });

  return itens;
}

function enriquecerLoteComercial({
  loteComercial,
  lotesProducao,
  variedades,
  colheitas,
  entradas
}) {
  const loteProducao =
    lotesProducao.find((lp) => lp.id === loteComercial.lote_producao_id) || null;

  const variedade = loteProducao
    ? variedades.find((v) => v.id === loteProducao.variedade_id) || null
    : null;

  const colheita =
    colheitas.find((c) => c.id === loteComercial.colheita_id) || null;

  const entrada = loteProducao?.entrada_id
    ? entradas.find((e) => e.id === loteProducao.entrada_id) || null
    : null;

  return {
    ...loteComercial,
    codigo_lote_producao: loteProducao?.codigo_lote || "-",
    variedade_nome:
      variedade?.nome || loteProducao?.variedade_nome || "Sem variedade",
    data_colheita: colheita?.data_colheita || "-",
    data_entrada: entrada?.data_entrada || loteProducao?.data_formacao || "-"
  };
}

async function carregarBasesAuxiliaresLotes() {
  const [
    lotesProducaoSnapshot,
    variedadesSnapshot,
    colheitasSnapshot,
    entradasSnapshot
  ] = await Promise.all([
    get(ref(db, "lotes_producao")),
    get(ref(db, "variedades")),
    get(ref(db, "colheitas")),
    get(ref(db, "entradas"))
  ]);

  return {
    lotesProducao: lotesProducaoSnapshot.exists()
      ? Object.values(lotesProducaoSnapshot.val())
      : [],
    variedades: variedadesSnapshot.exists()
      ? Object.values(variedadesSnapshot.val())
      : [],
    colheitas: colheitasSnapshot.exists()
      ? Object.values(colheitasSnapshot.val())
      : [],
    entradas: entradasSnapshot.exists()
      ? Object.values(entradasSnapshot.val())
      : []
  };
}

export async function listarClientes() {
  const snapshot = await get(ref(db, "clientes"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val())
    .filter((item) => item.ativo !== false)
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
}

export async function listarLotesComerciaisDisponiveisPaginado({
  limit = 20,
  cursor = null
}) {
  const bases = await carregarBasesAuxiliaresLotes();
  const rawBatchSize = Math.max(limit * 4, 60);

  let itensPagina = [];
  let cursorInterno = cursor;
  let safety = 0;

  while (itensPagina.length < limit && safety < 10) {
    safety += 1;

    const rawBatch = await carregarPaginaBrutaLotesComerciais({
      limit: rawBatchSize,
      cursor: cursorInterno
    });

    if (!rawBatch.length) {
      return {
        items: itensPagina,
        nextCursor: null,
        hasMore: false
      };
    }

    const disponiveisDesc = rawBatch
      .filter((item) => Number(item.quantidade_disponivel || 0) > 0)
      .map((item) =>
        enriquecerLoteComercial({
          loteComercial: item,
          ...bases
        })
      )
      .reverse();

    const faltantes = limit - itensPagina.length;

    if (disponiveisDesc.length > 0) {
      itensPagina.push(...disponiveisDesc.slice(0, faltantes));
    }

    if (itensPagina.length >= limit) {
      const ultimoRetornado = itensPagina[itensPagina.length - 1];
      const maisAntigoDoBatch = rawBatch[0];

      const cursorUltimoRetornado = montarCursor(ultimoRetornado);
      const cursorMaisAntigoDoBatch = montarCursor(maisAntigoDoBatch);

      const hasMore =
        rawBatch.length === rawBatchSize ||
        cursorUltimoRetornado?.key !== cursorMaisAntigoDoBatch?.key ||
        cursorUltimoRetornado?.value !== cursorMaisAntigoDoBatch?.value;

      return {
        items: itensPagina,
        nextCursor: hasMore ? cursorUltimoRetornado : null,
        hasMore
      };
    }

    if (rawBatch.length < rawBatchSize) {
      return {
        items: itensPagina,
        nextCursor: null,
        hasMore: false
      };
    }

    cursorInterno = montarCursor(rawBatch[0]);
  }

  return {
    items: itensPagina,
    nextCursor: itensPagina.length ? montarCursor(itensPagina[itensPagina.length - 1]) : null,
    hasMore: itensPagina.length === limit
  };
}

export async function listarLotesComerciaisDisponiveis() {
  const lotesSnapshot = await get(ref(db, "lotes_comerciais"));

  if (!lotesSnapshot.exists()) return [];

  const lotesComerciais = Object.values(lotesSnapshot.val());
  const bases = await carregarBasesAuxiliaresLotes();

  return lotesComerciais
    .filter((item) => Number(item.quantidade_disponivel || 0) > 0)
    .map((item) =>
      enriquecerLoteComercial({
        loteComercial: item,
        ...bases
      })
    )
    .sort((a, b) => (b.data_formacao || "").localeCompare(a.data_formacao || ""));
}

export async function registrarVenda({
  cliente_id,
  lote_comercial_id,
  quantidade,
  preco_unitario,
  data_venda
}) {
  const [clienteSnapshot, loteSnapshot, lotesProducaoSnapshot, variedadesSnapshot] =
    await Promise.all([
      get(ref(db, `clientes/${cliente_id}`)),
      get(ref(db, `lotes_comerciais/${lote_comercial_id}`)),
      get(ref(db, "lotes_producao")),
      get(ref(db, "variedades"))
    ]);

  if (!clienteSnapshot.exists()) {
    throw new Error("Cliente não encontrado.");
  }

  if (!loteSnapshot.exists()) {
    throw new Error("Lote comercial não encontrado.");
  }

  if (!validarDataISO(normalizarTexto(data_venda))) {
    throw new Error("A data da venda deve estar no formato YYYY-MM-DD e ser válida.");
  }

  const cliente = clienteSnapshot.val();
  const lote = loteSnapshot.val();

  const lotesProducao = lotesProducaoSnapshot.exists()
    ? Object.values(lotesProducaoSnapshot.val())
    : [];
  const variedades = variedadesSnapshot.exists()
    ? Object.values(variedadesSnapshot.val())
    : [];

  const loteProducao =
    lotesProducao.find((lp) => lp.id === lote.lote_producao_id) || null;
  const variedade = loteProducao
    ? variedades.find((v) => v.id === loteProducao.variedade_id) || null
    : null;

  const qtd = parseNumeroInteiro(quantidade);
  const preco = parseNumeroDecimal(preco_unitario);
  const quantidadeDisponivelAtual = Number(lote.quantidade_disponivel || 0);

  if (!Number.isFinite(qtd) || qtd <= 0) {
    throw new Error("A quantidade vendida deve ser maior que zero.");
  }

  if (!Number.isFinite(preco) || preco < 0) {
    throw new Error("O preço unitário não pode ser negativo.");
  }

  if (quantidadeDisponivelAtual <= 0) {
    throw new Error("Esse lote comercial não possui saldo disponível.");
  }

  if (qtd > quantidadeDisponivelAtual) {
    throw new Error("A quantidade vendida é maior que o saldo disponível do lote comercial.");
  }

  const pedidoId = gerarId("ped");
  const itemId = gerarId("item");
  const valorTotal = Number((qtd * preco).toFixed(2));
  const novaQuantidadeDisponivel = quantidadeDisponivelAtual - qtd;
  const novoStatusLote = montarStatusLoteComercial(lote, novaQuantidadeDisponivel);

  const novoPedido = {
    id: pedidoId,
    cliente_id,
    cliente_nome: cliente.nome,
    data_venda: normalizarTexto(data_venda),
    status: "concluido",
    quantidade_total_itens: qtd,
    valor_total_pedido: valorTotal
  };

  const novoItem = {
    id: itemId,
    pedido_venda_id: pedidoId,
    lote_comercial_id,
    codigo_lote_comercial: lote.codigo_lote_comercial,
    codigo_lote_producao: loteProducao?.codigo_lote || "-",
    variedade_nome:
      variedade?.nome || loteProducao?.variedade_nome || "Sem variedade",
    quantidade: qtd,
    preco_unitario: preco,
    valor_total: valorTotal
  };

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

  return Object.values(snapshot.val()).sort((a, b) =>
    (a.codigo_lote_comercial || "").localeCompare(b.codigo_lote_comercial || "")
  );
}