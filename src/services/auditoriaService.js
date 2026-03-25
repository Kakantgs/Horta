import { get, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";

async function lerNo(caminho) {
  const snapshot = await get(ref(db, caminho));
  return snapshot.exists() ? snapshot.val() : null;
}

function valores(obj) {
  return obj ? Object.values(obj) : [];
}

export async function listarLotesParaAuditoria() {
  const lotes = valores(await lerNo("lotes_producao"));

  return lotes.sort((a, b) =>
    (b.data_formacao || "").localeCompare(a.data_formacao || "")
  );
}

export async function buscarAuditoriaCompletaPorLote(loteId) {
  const lote = await lerNo(`lotes_producao/${loteId}`);

  if (!lote) {
    throw new Error("Lote de produção não encontrado.");
  }

  const [
    entrada,
    ocupacoesObj,
    movimentacoesObj,
    ocorrenciasObj,
    colheitasObj,
    lotesComerciaisObj,
    pedidosObj,
    itensPedidoObj,
    bancadasObj,
    setoresObj,
    monitoramentosSetorObj,
    ocorrenciasSetorObj
  ] = await Promise.all([
    lote.entrada_id ? lerNo(`entradas/${lote.entrada_id}`) : null,
    lerNo("ocupacoes_bancada"),
    lerNo("movimentacoes_lote"),
    lerNo("ocorrencias"),
    lerNo("colheitas"),
    lerNo("lotes_comerciais"),
    lerNo("pedidos_venda"),
    lerNo("itens_pedido_venda"),
    lerNo("bancadas"),
    lerNo("setores"),
    lerNo("monitoramentos_setor"),
    lerNo("ocorrencias_setor")
  ]);

  let fornecedorFinal = null;
  if (entrada?.fornecedor_id) {
    fornecedorFinal = await lerNo(`fornecedores/${entrada.fornecedor_id}`);
  }

  const bancadas = valores(bancadasObj);
  const setores = valores(setoresObj);

  const ocupacoes = valores(ocupacoesObj).filter(
    (item) => item.lote_producao_id === loteId
  );

  const ocupacaoIds = ocupacoes.map((item) => item.id);
  const bancadaIds = [...new Set(ocupacoes.map((item) => item.bancada_id))];

  const bancadasRelacionadas = bancadas.filter((item) => bancadaIds.includes(item.id));
  const setorIdsRelacionados = [
    ...new Set(bancadasRelacionadas.map((item) => item.setor_id).filter(Boolean))
  ];

  const movimentacoes = valores(movimentacoesObj).filter(
    (item) => item.lote_producao_id === loteId
  );

  const ocorrencias = valores(ocorrenciasObj).filter((item) =>
    ocupacaoIds.includes(item.ocupacao_bancada_id)
  );

  const colheitas = valores(colheitasObj).filter(
    (item) => item.lote_producao_id === loteId
  );

  const colheitaIds = colheitas.map((item) => item.id);

  const lotesComerciais = valores(lotesComerciaisObj).filter((item) =>
    colheitaIds.includes(item.colheita_id)
  );

  const loteComercialIds = lotesComerciais.map((item) => item.id);

  const itensPedido = valores(itensPedidoObj).filter((item) =>
    loteComercialIds.includes(item.lote_comercial_id)
  );

  const pedidoIds = [...new Set(itensPedido.map((item) => item.pedido_venda_id))];
  const pedidos = valores(pedidosObj).filter((item) => pedidoIds.includes(item.id));

  const monitoramentosSetor = valores(monitoramentosSetorObj).filter((item) =>
    setorIdsRelacionados.includes(item.setor_id)
  );

  const ocorrenciasSetor = valores(ocorrenciasSetorObj).filter((item) =>
    setorIdsRelacionados.includes(item.setor_id)
  );

  const ocupacoesComBancada = ocupacoes.map((ocp) => ({
    ...ocp,
    bancada: bancadas.find((b) => b.id === ocp.bancada_id) || null
  }));

  const pedidosComItens = pedidos.map((pedido) => ({
    ...pedido,
    itens: itensPedido.filter((item) => item.pedido_venda_id === pedido.id)
  }));

  const setoresRelacionados = setores.filter((item) =>
    setorIdsRelacionados.includes(item.id)
  );

  return {
    lote,
    entrada,
    fornecedor: fornecedorFinal,
    ocupacoes: ocupacoesComBancada.sort((a, b) =>
      (a.data_inicio || "").localeCompare(b.data_inicio || "")
    ),
    movimentacoes: movimentacoes.sort((a, b) =>
      (a.data_movimentacao || "").localeCompare(b.data_movimentacao || "")
    ),
    ocorrencias: ocorrencias.sort((a, b) =>
      (a.data_hora || "").localeCompare(b.data_hora || "")
    ),
    colheitas: colheitas.sort((a, b) =>
      (a.data_colheita || "").localeCompare(b.data_colheita || "")
    ),
    lotes_comerciais: lotesComerciais.sort((a, b) =>
      (a.data_formacao || "").localeCompare(b.data_formacao || "")
    ),
    pedidos: pedidosComItens.sort((a, b) =>
      (a.data_venda || "").localeCompare(b.data_venda || "")
    ),
    setores: setoresRelacionados,
    monitoramentos_setor: monitoramentosSetor.sort((a, b) =>
      (a.data_hora || "").localeCompare(b.data_hora || "")
    ),
    ocorrencias_setor: ocorrenciasSetor.sort((a, b) =>
      (a.data_hora || "").localeCompare(b.data_hora || "")
    )
  };
}