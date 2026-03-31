import { get, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";

async function lerNo(caminho) {
  const snapshot = await get(ref(db, caminho));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val());
}

export async function listarLotesParaAuditoria() {
  const lotes = await lerNo("lotes_producao");

  return lotes.sort((a, b) =>
    (b.data_formacao || "").localeCompare(a.data_formacao || "")
  );
}

export async function buscarAuditoriaCompletaPorLote(loteId) {
  const [
    entradas,
    lotesProducao,
    ocupacoes,
    movimentacoes,
    monitoramentosSetor,
    ocorrenciasSetor,
    colheitas,
    lotesComerciais,
    pedidosVenda,
    itensPedido,
    clientes,
    fornecedores,
    variedades,
    bancadas,
    setores
  ] = await Promise.all([
    lerNo("entradas"),
    lerNo("lotes_producao"),
    lerNo("ocupacoes_bancada"),
    lerNo("movimentacoes_lote"),
    lerNo("monitoramentos_setor"),
    lerNo("ocorrencias_setor"),
    lerNo("colheitas"),
    lerNo("lotes_comerciais"),
    lerNo("pedidos_venda"),
    lerNo("itens_pedido_venda"),
    lerNo("clientes"),
    lerNo("fornecedores"),
    lerNo("variedades"),
    lerNo("bancadas"),
    lerNo("setores")
  ]);

  const lote = lotesProducao.find((item) => item.id === loteId);

  if (!lote) {
    throw new Error("Lote não encontrado.");
  }

  const entrada = entradas.find((ent) => ent.id === lote.entrada_id) || null;
  const fornecedor =
    entrada ? fornecedores.find((f) => f.id === entrada.fornecedor_id) || null : null;
  const variedade =
    variedades.find((v) => v.id === lote.variedade_id) || null;

  const ocupacoesDoLote = ocupacoes
    .filter((ocp) => ocp.lote_producao_id === lote.id)
    .map((ocp) => {
      const bancada = bancadas.find((b) => b.id === ocp.bancada_id) || null;
      const setor = bancada
        ? setores.find((s) => s.id === bancada.setor_id) || null
        : null;

      return {
        ...ocp,
        bancada,
        setor
      };
    });

  const setorIds = new Set(
    ocupacoesDoLote.map((ocp) => ocp.setor?.id).filter(Boolean)
  );

  const movimentacoesDoLote = movimentacoes.filter(
    (mov) => mov.lote_producao_id === lote.id
  );

  const monitoramentosRelacionados = monitoramentosSetor.filter((mon) =>
    setorIds.has(mon.setor_id)
  );

  const ocorrenciasRelacionadas = ocorrenciasSetor.filter((ocr) =>
    setorIds.has(ocr.setor_id)
  );

  const colheitasRelacionadas = colheitas.filter(
    (col) => col.lote_producao_id === lote.id
  );

  const colheitaIds = new Set(colheitasRelacionadas.map((col) => col.id));

  const lotesComerciaisRelacionados = lotesComerciais.filter(
    (lc) =>
      lc.lote_producao_id === lote.id ||
      colheitaIds.has(lc.colheita_id)
  );

  const loteComercialIds = new Set(
    lotesComerciaisRelacionados.map((lc) => lc.id)
  );

  const itensRelacionados = itensPedido.filter((item) =>
    loteComercialIds.has(item.lote_comercial_id)
  );

  const pedidoIds = new Set(itensRelacionados.map((item) => item.pedido_venda_id));

  const pedidosRelacionados = pedidosVenda
    .filter((ped) => pedidoIds.has(ped.id))
    .map((pedido) => {
      const cliente = clientes.find((c) => c.id === pedido.cliente_id) || null;
      const itens = itensRelacionados.filter(
        (item) => item.pedido_venda_id === pedido.id
      );

      return {
        ...pedido,
        cliente,
        itens
      };
    });

  return {
    lote: {
      ...lote,
      variedade_nome: variedade?.nome || lote.variedade_nome || "-"
    },
    entrada,
    fornecedor,
    variedade,
    ocupacoes: ocupacoesDoLote,
    movimentacoes: movimentacoesDoLote.sort((a, b) =>
      (a.data_movimentacao || "").localeCompare(b.data_movimentacao || "")
    ),
    monitoramentos: monitoramentosRelacionados.sort((a, b) =>
      (a.data_hora_monitoramento || "").localeCompare(b.data_hora_monitoramento || "")
    ),
    ocorrencias: ocorrenciasRelacionadas.sort((a, b) =>
      (a.data_hora_ocorrencia || "").localeCompare(b.data_hora_ocorrencia || "")
    ),
    colheitas: colheitasRelacionadas.sort((a, b) =>
      (a.data_colheita || "").localeCompare(b.data_colheita || "")
    ),
    lotes_comerciais: lotesComerciaisRelacionados.sort((a, b) =>
      (a.data_formacao || "").localeCompare(b.data_formacao || "")
    ),
    pedidos: pedidosRelacionados.sort((a, b) =>
      (a.data_venda || "").localeCompare(b.data_venda || "")
    )
  };
}