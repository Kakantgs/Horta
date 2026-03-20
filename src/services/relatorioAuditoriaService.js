import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { buscarAuditoriaCompletaPorLote } from "./auditoriaService";

function linha(label, valor) {
  return `<p><strong>${label}:</strong> ${valor ?? "-"}</p>`;
}

function blocoTitulo(titulo) {
  return `<h2 style="margin-top:24px; margin-bottom:10px; color:#1f2937;">${titulo}</h2>`;
}

function cardHtml(conteudo) {
  return `
    <div style="
      border:1px solid #d1d5db;
      border-radius:8px;
      padding:12px;
      margin-bottom:10px;
      background:#ffffff;
    ">
      ${conteudo}
    </div>
  `;
}

function montarHtmlAuditoria(auditoria) {
  const { lote, entrada, fornecedor, ocupacoes, movimentacoes, monitoramentos, ocorrencias, colheitas, lotes_comerciais, pedidos } =
    auditoria;

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            color: #111827;
            background: #f9fafb;
          }
          h1 {
            margin-bottom: 8px;
            color: #111827;
          }
          h2 {
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 4px;
          }
          p {
            margin: 4px 0;
            font-size: 13px;
          }
          .muted {
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <h1>Relatório de Auditoria do Lote</h1>
        <p class="muted">Gerado automaticamente pelo sistema de rastreabilidade hidropônica.</p>

        ${blocoTitulo("Origem")}
        ${cardHtml(`
          ${linha("Código do lote", lote.codigo_lote)}
          ${linha("Variedade", lote.variedade_nome)}
          ${linha("Data de formação", lote.data_formacao)}
          ${linha("Quantidade inicial", lote.quantidade_inicial)}
          ${linha("Saldo disponível para ocupar", lote.saldo_disponivel_para_ocupar ?? lote.quantidade_atual)}
          ${linha("Status", lote.status)}
          ${linha("Entrada", entrada?.id)}
          ${linha("Data da entrada", entrada?.data_entrada)}
          ${linha("Fornecedor", fornecedor?.nome)}
          ${linha("Lote do fornecedor", entrada?.lote_fornecedor)}
        `)}

        ${blocoTitulo("Ocupações")}
        ${
          ocupacoes.length === 0
            ? `<p>Nenhuma ocupação encontrada.</p>`
            : ocupacoes
                .map((item) =>
                  cardHtml(`
                    ${linha("ID", item.id)}
                    ${linha("Bancada", item.bancada?.codigo || item.bancada_id)}
                    ${linha("Tipo da bancada", item.bancada?.tipo)}
                    ${linha("Faixa", `${item.posicao_inicial} até ${item.posicao_final}`)}
                    ${linha("Quantidade", item.quantidade_alocada)}
                    ${linha("Data início", item.data_inicio)}
                    ${linha("Data fim", item.data_fim)}
                    ${linha("Tipo ocupação", item.tipo_ocupacao)}
                    ${linha("Status", item.status)}
                  `)
                )
                .join("")
        }

        ${blocoTitulo("Movimentações")}
        ${
          movimentacoes.length === 0
            ? `<p>Nenhuma movimentação encontrada.</p>`
            : movimentacoes
                .map((item) =>
                  cardHtml(`
                    ${linha("ID", item.id)}
                    ${linha("Tipo", item.tipo_movimentacao)}
                    ${linha("Quantidade", item.quantidade_movimentada)}
                    ${linha("Data", item.data_movimentacao)}
                    ${linha("Bancada origem", item.bancada_origem_id)}
                    ${linha("Bancada destino", item.bancada_destino_id)}
                    ${linha("Ocupação origem", item.ocupacao_origem_id)}
                    ${linha("Ocupação destino", item.ocupacao_destino_id)}
                  `)
                )
                .join("")
        }

        ${blocoTitulo("Monitoramentos")}
        ${
          monitoramentos.length === 0
            ? `<p>Nenhum monitoramento encontrado.</p>`
            : monitoramentos
                .map((item) =>
                  cardHtml(`
                    ${linha("Data/hora", item.data_hora)}
                    ${linha("Bancada", item.bancada_id)}
                    ${linha("pH", item.ph)}
                    ${linha("CE", item.ce)}
                    ${linha("Temperatura da água", item.temperatura_agua)}
                    ${linha("Observações", item.observacoes)}
                  `)
                )
                .join("")
        }

        ${blocoTitulo("Ocorrências")}
        ${
          ocorrencias.length === 0
            ? `<p>Nenhuma ocorrência encontrada.</p>`
            : ocorrencias
                .map((item) =>
                  cardHtml(`
                    ${linha("Tipo", item.tipo_ocorrencia)}
                    ${linha("Ocupação", item.ocupacao_bancada_id)}
                    ${linha("Descrição", item.descricao)}
                    ${linha("Ação corretiva", item.acao_corretiva)}
                    ${linha("Data/hora", item.data_hora)}
                    ${linha("Status", item.status)}
                  `)
                )
                .join("")
        }

        ${blocoTitulo("Colheitas")}
        ${
          colheitas.length === 0
            ? `<p>Nenhuma colheita encontrada.</p>`
            : colheitas
                .map((item) =>
                  cardHtml(`
                    ${linha("ID", item.id)}
                    ${linha("Data colheita", item.data_colheita)}
                    ${linha("Ocupação", item.ocupacao_bancada_id)}
                    ${linha("Quantidade colhida", item.quantidade_colhida)}
                    ${linha("Quantidade perda", item.quantidade_perda)}
                    ${linha("Tipo", item.tipo_colheita)}
                  `)
                )
                .join("")
        }

        ${blocoTitulo("Lotes Comerciais")}
        ${
          lotes_comerciais.length === 0
            ? `<p>Nenhum lote comercial encontrado.</p>`
            : lotes_comerciais
                .map((item) =>
                  cardHtml(`
                    ${linha("Código", item.codigo_lote_comercial)}
                    ${linha("Data formação", item.data_formacao)}
                    ${linha("Quantidade inicial", item.quantidade_inicial)}
                    ${linha("Quantidade disponível", item.quantidade_disponivel)}
                    ${linha("Status", item.status)}
                  `)
                )
                .join("")
        }

        ${blocoTitulo("Vendas")}
        ${
          pedidos.length === 0
            ? `<p>Nenhuma venda encontrada.</p>`
            : pedidos
                .map((pedido) =>
                  cardHtml(`
                    ${linha("Pedido", pedido.id)}
                    ${linha("Cliente", pedido.cliente_nome)}
                    ${linha("Data venda", pedido.data_venda)}
                    ${linha("Status", pedido.status)}
                    <div style="margin-top:8px;">
                      <strong>Itens</strong>
                      ${
                        pedido.itens.length === 0
                          ? `<p>-</p>`
                          : pedido.itens
                              .map(
                                (item) => `
                                <p>
                                  Lote comercial: ${item.codigo_lote_comercial} |
                                  Quantidade: ${item.quantidade} |
                                  Preço unitário: ${item.preco_unitario}
                                </p>
                              `
                              )
                              .join("")
                      }
                    </div>
                  `)
                )
                .join("")
        }
      </body>
    </html>
  `;
}

export async function gerarPdfAuditoriaPorLote(loteId) {
  const auditoria = await buscarAuditoriaCompletaPorLote(loteId);
  const html = montarHtmlAuditoria(auditoria);

  const resultado = await Print.printToFileAsync({
    html,
    base64: false
  });

  return {
    uri: resultado.uri,
    auditoria
  };
}

export async function compartilharPdfAuditoria(uri) {
  const disponivel = await Sharing.isAvailableAsync();

  if (!disponivel) {
    throw new Error("Compartilhamento não disponível neste dispositivo.");
  }

  await Sharing.shareAsync(uri);
}