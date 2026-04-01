import { get, ref } from "firebase/database";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import QRCode from "qrcode";
import { db } from "../config/firebaseConfig";

async function lerNo(caminho) {
  const snapshot = await get(ref(db, caminho));
  if (!snapshot.exists()) return [];
  return Object.values(snapshot.val());
}

function formatarData(dataISO) {
  if (!dataISO) return "-";

  const [ano, mes, dia] = dataISO.split("-");
  if (!ano || !mes || !dia) return dataISO;

  return `${dia}/${mes}/${ano}`;
}

function escaparHtml(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function montarOrigemAutomatica({
  localProducaoPadrao,
  setorCodigo,
  bancadaCodigo,
  origemPadrao
}) {
  const partes = [];

  if (localProducaoPadrao) partes.push(localProducaoPadrao);
  if (setorCodigo) partes.push(`Setor ${setorCodigo}`);
  if (bancadaCodigo) partes.push(`Bancada ${bancadaCodigo}`);

  if (partes.length > 0) {
    return partes.join(" - ");
  }

  return origemPadrao || "";
}

function escolherUltimaOcupacaoFinal(ocupacoes, bancadas, setores) {
  const ocupacoesFinais = ocupacoes
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
    })
    .filter((item) => item.bancada?.tipo === "final")
    .sort((a, b) => (b.data_inicio || "").localeCompare(a.data_inicio || ""));

  return ocupacoesFinais[0] || null;
}

function obterConfiguracaoLayout(layoutEtiqueta) {
  if (layoutEtiqueta === "80x100") {
    return {
      larguraMm: 80,
      alturaMm: 100,
      produtoFont: 22,
      textoFont: 13,
      loteFont: 18,
      qrSize: 150,
      padding: 12
    };
  }

  return {
    larguraMm: 100,
    alturaMm: 150,
    produtoFont: 26,
    textoFont: 15,
    loteFont: 22,
    qrSize: 180,
    padding: 16
  };
}

export async function listarLotesComerciaisParaEtiqueta() {
  const [lotesComerciais, lotesProducao, variedades] = await Promise.all([
    lerNo("lotes_comerciais"),
    lerNo("lotes_producao"),
    lerNo("variedades")
  ]);

  return lotesComerciais
    .map((lc) => {
      const loteProducao = lotesProducao.find((lp) => lp.id === lc.lote_producao_id);
      const variedade = loteProducao
        ? variedades.find((v) => v.id === loteProducao.variedade_id)
        : null;

      return {
        ...lc,
        codigo_lote_producao: loteProducao?.codigo_lote || "-",
        variedade_nome:
          variedade?.nome || loteProducao?.variedade_nome || "Sem variedade"
      };
    })
    .sort((a, b) => (b.data_formacao || "").localeCompare(a.data_formacao || ""));
}

export async function montarDadosEtiqueta({
  loteComercialId,
  produtorNome,
  produtorCnpj,
  origemTexto,
  origemPadrao,
  dataEmbalagem,
  qrBaseUrl,
  sistemaCultivo = "Hidropônico",
  localProducao = "",
  destino = "",
  certificacoes = "",
  insumosUtilizados = "",
  layoutEtiqueta = "100x150"
}) {
  const [
    lotesComerciais,
    lotesProducao,
    variedades,
    entradas,
    colheitas,
    ocupacoes,
    bancadas,
    setores
  ] = await Promise.all([
    lerNo("lotes_comerciais"),
    lerNo("lotes_producao"),
    lerNo("variedades"),
    lerNo("entradas"),
    lerNo("colheitas"),
    lerNo("ocupacoes_bancada"),
    lerNo("bancadas"),
    lerNo("setores")
  ]);

  const loteComercial = lotesComerciais.find((item) => item.id === loteComercialId);
  if (!loteComercial) {
    throw new Error("Lote comercial não encontrado.");
  }

  const loteProducao = lotesProducao.find(
    (item) => item.id === loteComercial.lote_producao_id
  );
  if (!loteProducao) {
    throw new Error("Lote de produção não encontrado.");
  }

  const variedade =
    variedades.find((item) => item.id === loteProducao.variedade_id) || null;

  const entrada =
    entradas.find((item) => item.id === loteProducao.entrada_id) || null;

  const colheita =
    colheitas.find((item) => item.id === loteComercial.colheita_id) || null;

  const ocupacoesDoLote = ocupacoes.filter(
    (item) => item.lote_producao_id === loteProducao.id
  );

  const ultimaFinal = escolherUltimaOcupacaoFinal(
    ocupacoesDoLote,
    bancadas,
    setores
  );

  const origemCalculada = montarOrigemAutomatica({
    localProducaoPadrao: localProducao,
    setorCodigo: ultimaFinal?.setor?.codigo || ultimaFinal?.bancada?.setor_codigo || "",
    bancadaCodigo: ultimaFinal?.bancada?.codigo || "",
    origemPadrao: origemPadrao || origemTexto || ""
  });

  const produto = variedade?.nome || loteProducao.variedade_nome || "Produto";
  const lote = loteComercial.codigo_lote_comercial;
  const dataPlantio = entrada?.data_entrada || loteProducao.data_formacao || "";
  const dataColheita = colheita?.data_colheita || loteComercial.data_formacao || "";
  const dataEmb = dataEmbalagem || loteComercial.data_formacao || "";

  const qrPayload = {
    produto,
    lote,
    data_plantio: dataPlantio,
    data_colheita: dataColheita,
    sistema_cultivo: sistemaCultivo,
    insumos_utilizados: insumosUtilizados || "Não informado",
    local_producao: origemCalculada || "Não informado",
    destino: destino || "",
    certificacoes: certificacoes || "",
    url_rastreio: qrBaseUrl ? `${qrBaseUrl}?lote=${encodeURIComponent(lote)}` : ""
  };

  const qrTexto = qrPayload.url_rastreio || JSON.stringify(qrPayload, null, 2);
  const qrDataUrl = await QRCode.toDataURL(qrTexto, {
    margin: 1,
    width: 260
  });

  return {
    produto,
    variedade: variedade?.nome || loteProducao.variedade_nome || "-",
    produtorNome,
    produtorCnpj,
    origemTexto: origemCalculada,
    lote,
    dataPlantio,
    dataColheita,
    dataEmbalagem: dataEmb,
    sistemaCultivo,
    localProducao,
    destino,
    certificacoes,
    insumosUtilizados,
    qrPayload,
    qrDataUrl,
    loteComercial,
    loteProducao,
    entrada,
    colheita,
    ultimaFinal,
    layoutEtiqueta
  };
}

export function gerarHtmlEtiqueta(dados) {
  const cfg = obterConfiguracaoLayout(dados.layoutEtiqueta);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${cfg.larguraMm}mm ${cfg.alturaMm}mm;
            margin: 0;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #000;
          }

          .pagina {
            width: ${cfg.larguraMm}mm;
            min-height: ${cfg.alturaMm}mm;
            box-sizing: border-box;
            padding: ${cfg.padding}px;
          }

          .etiqueta {
            border: 2px solid #000;
            padding: ${cfg.padding}px;
            box-sizing: border-box;
          }

          .produto {
            font-size: ${cfg.produtoFont}px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 8px;
            line-height: 1.2;
          }

          .linha {
            margin-bottom: 6px;
            font-size: ${cfg.textoFont}px;
            line-height: 1.3;
          }

          .lote {
            font-size: ${cfg.loteFont}px;
            font-weight: bold;
            margin: 12px 0;
            line-height: 1.2;
          }

          .qr {
            text-align: center;
            margin-top: 16px;
          }

          .qr img {
            width: ${cfg.qrSize}px;
            height: ${cfg.qrSize}px;
          }

          .rodape {
            text-align: center;
            margin-top: 8px;
            font-size: ${Math.max(11, cfg.textoFont - 1)}px;
          }
        </style>
      </head>
      <body>
        <div class="pagina">
          <div class="etiqueta">
            <div class="produto">${escaparHtml(dados.produto)}</div>

            <div class="linha"><strong>Variedade:</strong> ${escaparHtml(dados.variedade)}</div>
            <div class="linha"><strong>Produtor:</strong> ${escaparHtml(dados.produtorNome || "-")}</div>
            <div class="linha"><strong>CNPJ:</strong> ${escaparHtml(dados.produtorCnpj || "-")}</div>
            <div class="linha"><strong>Origem:</strong> ${escaparHtml(dados.origemTexto || "-")}</div>

            <div class="lote">Lote: ${escaparHtml(dados.lote)}</div>

            <div class="linha"><strong>Colheita:</strong> ${formatarData(dados.dataColheita)}</div>
            <div class="linha"><strong>Embalagem:</strong> ${formatarData(dados.dataEmbalagem)}</div>

            <div class="qr">
              <img src="${dados.qrDataUrl}" />
            </div>

            <div class="rodape">Rastreabilidade completa</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function gerarPdfEtiqueta(dados) {
  const html = gerarHtmlEtiqueta(dados);

  const resultado = await Print.printToFileAsync({
    html
  });

  return {
    uri: resultado.uri,
    html
  };
}

export async function compartilharPdfEtiqueta(dados) {
  const resultado = await gerarPdfEtiqueta(dados);

  const podeCompartilhar = await Sharing.isAvailableAsync();
  if (!podeCompartilhar) {
    throw new Error("Compartilhamento não disponível neste dispositivo.");
  }

  await Sharing.shareAsync(resultado.uri);
  return resultado;
}