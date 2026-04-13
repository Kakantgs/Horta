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

export async function listarLotesComerciaisPaginado({
  limit = 20,
  cursor = null
}) {
  const rawBatch = await carregarPaginaBrutaLotesComerciais({
    limit,
    cursor
  });

  if (!rawBatch.length) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false
    };
  }

  const items = [...rawBatch].reverse();
  const nextCursor = montarCursor(items[items.length - 1]);
  const hasMore = rawBatch.length === limit;

  return {
    items,
    nextCursor: hasMore ? nextCursor : null,
    hasMore
  };
}

export async function listarLotesComerciais() {
  const snapshot = await get(ref(db, "lotes_comerciais"));

  if (!snapshot.exists()) return [];

  return Object.values(snapshot.val()).sort((a, b) =>
    (b.data_formacao || "").localeCompare(a.data_formacao || "")
  );
}

export async function listarLotesComerciaisPorStatus(status) {
  const lotes = await listarLotesComerciais();

  return lotes.filter(
    (item) => (item.status || "").toLowerCase() === status.toLowerCase()
  );
}

export async function buscarLoteComercialComOrigem(loteComercialId) {
  const loteSnapshot = await get(ref(db, `lotes_comerciais/${loteComercialId}`));

  if (!loteSnapshot.exists()) {
    throw new Error("Lote comercial não encontrado.");
  }

  const loteComercial = loteSnapshot.val();

  const colheitaSnapshot = await get(
    ref(db, `colheitas/${loteComercial.colheita_id}`)
  );
  const colheita = colheitaSnapshot.exists() ? colheitaSnapshot.val() : null;

  const loteProducaoSnapshot = await get(
    ref(db, `lotes_producao/${loteComercial.lote_producao_id}`)
  );
  const loteProducao = loteProducaoSnapshot.exists()
    ? loteProducaoSnapshot.val()
    : null;

  let entrada = null;
  let fornecedor = null;
  let variedade = null;

  if (loteProducao?.entrada_id) {
    const entradaSnapshot = await get(
      ref(db, `entradas/${loteProducao.entrada_id}`)
    );
    entrada = entradaSnapshot.exists() ? entradaSnapshot.val() : null;
  }

  if (entrada?.fornecedor_id) {
    const fornecedorSnapshot = await get(
      ref(db, `fornecedores/${entrada.fornecedor_id}`)
    );
    fornecedor = fornecedorSnapshot.exists() ? fornecedorSnapshot.val() : null;
  }

  if (loteProducao?.variedade_id) {
    const variedadeSnapshot = await get(
      ref(db, `variedades/${loteProducao.variedade_id}`)
    );
    variedade = variedadeSnapshot.exists() ? variedadeSnapshot.val() : null;
  }

  return {
    loteComercial,
    colheita,
    loteProducao,
    entrada,
    fornecedor,
    variedade
  };
}

export async function recalcularStatusLoteComercial(loteComercialId) {
  const snapshot = await get(ref(db, `lotes_comerciais/${loteComercialId}`));

  if (!snapshot.exists()) {
    throw new Error("Lote comercial não encontrado.");
  }

  const lote = snapshot.val();
  const qtd = Number(lote.quantidade_disponivel);

  let status = "encerrado";

  if (qtd > 0 && qtd === Number(lote.quantidade_inicial)) {
    status = "disponivel";
  } else if (qtd > 0 && qtd < Number(lote.quantidade_inicial)) {
    status = "parcial";
  } else if (qtd === 0) {
    status = "vendido";
  }

  await update(ref(db, `lotes_comerciais/${loteComercialId}`), { status });

  return status;
}