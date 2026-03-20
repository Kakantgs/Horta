import { get, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";

async function lerNo(caminho) {
  const snapshot = await get(ref(db, caminho));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val());
}

export async function buscarAuditoria({
  termoLoteProducao = "",
  termoLoteComercial = "",
  termoCliente = ""
}) {
  const [
    entradas,
    lotesProducao,
    ocupacoes,
    monitoramentos,
    ocorrencias,
    colheitas,
    lotesComerciais,
    pedidosVenda,
    itensPedido,
    clientes,
    fornecedores,
    variedades
  ] = await Promise.all([
    lerNo("entradas"),
    lerNo("lotes_producao"),
    lerNo("ocupacoes_bancada"),
    lerNo("monitoramentos"),
    lerNo("ocorrencias"),
    lerNo("colheitas"),
    lerNo("lotes_comerciais"),
    lerNo("pedidos_venda"),
    lerNo("itens_pedido_venda"),
    lerNo("clientes"),
    lerNo("fornecedores"),
    lerNo("variedades")
  ]);

  const termoLP = termoLoteProducao.trim().toLowerCase();
  const termoLC = termoLoteComercial.trim().toLowerCase();
  const termoCli = termoCliente.trim().toLowerCase();

  let lotesBase = [...lotesProducao];

  if (termoLP) {
    lotesBase = lotesBase.filter((lote) =>
      (lote.codigo_lote || "").toLowerCase().includes(termoLP)
    );
  }

  if (termoLC) {
    const lotesComerciaisFiltrados = lotesComerciais.filter((lc) =>
      (lc.codigo_lote_comercial || "").toLowerCase().includes(termoLC)
    );

    const loteProducaoIds = new Set(
      lotesComerciaisFiltrados.map((lc) => lc.lote_producao_id).filter(Boolean)
    );

    lotesBase = lotesBase.filter((lp) => loteProducaoIds.has(lp.id));
  }

  if (termoCli) {
    const clientesFiltrados = clientes.filter((cli) =>
      (cli.nome || "").toLowerCase().includes(termoCli)
    );

    const clienteIds = new Set(clientesFiltrados.map((cli) => cli.id));

    const pedidosFiltrados = pedidosVenda.filter((ped) =>
      clienteIds.has(ped.cliente_id)
    );

    const pedidoIds = new Set(pedidosFiltrados.map((ped) => ped.id));

    const itensFiltrados = itensPedido.filter((item) =>
      pedidoIds.has(item.pedido_venda_id)
    );

    const loteComercialIds = new Set(
      itensFiltrados.map((item) => item.lote_comercial_id)
    );

    const lotesComerciaisRelacionados = lotesComerciais.filter((lc) =>
      loteComercialIds.has(lc.id)
    );

    const loteProducaoIds = new Set(
      lotesComerciaisRelacionados.map((lc) => lc.lote_producao_id).filter(Boolean)
    );

    lotesBase = lotesBase.filter((lp) => loteProducaoIds.has(lp.id));
  }

  const relatorios = lotesBase.map((lote) => {
    const entrada = entradas.find((ent) => ent.id === lote.entrada_id) || null;
    const fornecedor =
      entrada ? fornecedores.find((f) => f.id === entrada.fornecedor_id) || null : null;
    const variedade =
      variedades.find((v) => v.id === lote.variedade_id) || null;

    const ocupacoesDoLote = ocupacoes.filter(
      (ocp) => ocp.lote_producao_id === lote.id
    );

    const ocupacaoIds = new Set(ocupacoesDoLote.map((ocp) => ocp.id));
    const bancadaIds = new Set(ocupacoesDoLote.map((ocp) => ocp.bancada_id));

    const monitoramentosRelacionados = monitoramentos.filter((mon) =>
      bancadaIds.has(mon.bancada_id)
    );

    const ocorrenciasRelacionadas = ocorrencias.filter((ocr) =>
      ocupacaoIds.has(ocr.ocupacao_bancada_id)
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

    const pedidosRelacionados = pedidosVenda.filter((ped) =>
      pedidoIds.has(ped.id)
    );

    const destinos = pedidosRelacionados.map((pedido) => {
      const cliente = clientes.find((c) => c.id === pedido.cliente_id) || null;
      const itensDoPedido = itensRelacionados.filter(
        (item) => item.pedido_venda_id === pedido.id
      );

      return {
        pedido,
        cliente,
        itens: itensDoPedido
      };
    });

    return {
      lote_producao: lote,
      entrada,
      fornecedor,
      variedade,
      ocupacoes: ocupacoesDoLote,
      monitoramentos: monitoramentosRelacionados,
      ocorrencias: ocorrenciasRelacionadas,
      colheitas: colheitasRelacionadas,
      lotes_comerciais: lotesComerciaisRelacionados,
      destinos
    };
  });

  return relatorios;
}