import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import QRCode from "qrcode";
import { get, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";

async function gerarQrCodeBase64(texto) {
  return QRCode.toDataURL(texto);
}

function montarHtmlEtiqueta({
  unidade,
  loteComercial,
  loteProducao,
  colheita,
  variedadeNome,
  qrCodeDataUrl
}) {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 8px;
            color: #000;
            font-size: 12px;
          }

          .etiqueta {
            border: 1px solid #000;
            padding: 10px;
            width: 280px;
          }

          .titulo {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .linha {
            margin-bottom: 6px;
          }

          .qr {
            text-align: center;
            margin-top: 10px;
          }

          .qr img {
            width: 110px;
            height: 110px;
          }

          .rodape {
            margin-top: 10px;
            font-size: 10px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="etiqueta">
          <div class="titulo">RASTREABILIDADE</div>

          <div class="linha"><strong>Produtor:</strong> ${unidade.name || "-"}</div>
          <div class="linha"><strong>Endereço:</strong> ${unidade.address || "-"}</div>
          <div class="linha"><strong>CNPJ:</strong> ${unidade.cnpj || "-"}</div>

          <div class="linha"><strong>Produto:</strong> Hortaliça hidropônica</div>
          <div class="linha"><strong>Variedade:</strong> ${variedadeNome || loteProducao?.variedade_nome || "-"}</div>
          <div class="linha"><strong>Data Colheita:</strong> ${colheita?.data_colheita || "-"}</div>
          <div class="linha"><strong>Lote Produção:</strong> ${loteProducao?.codigo_lote || "-"}</div>
          <div class="linha"><strong>Lote Comercial:</strong> ${loteComercial?.codigo_lote_comercial || "-"}</div>
          <div class="linha"><strong>Qtd Inicial:</strong> ${loteComercial?.quantidade_inicial ?? "-"}</div>
          <div class="linha"><strong>Qtd Disponível:</strong> ${loteComercial?.quantidade_disponivel ?? "-"}</div>

          <div class="qr">
            <img src="${qrCodeDataUrl}" />
          </div>

          <div class="rodape">
            Consulte o lote pelo código acima
          </div>
        </div>
      </body>
    </html>
  `;
}

async function montarDadosEtiqueta(loteComercialId) {
  const loteComercialSnapshot = await get(
    ref(db, `lotes_comerciais/${loteComercialId}`)
  );

  if (!loteComercialSnapshot.exists()) {
    throw new Error("Lote comercial não encontrado.");
  }

  const loteComercial = loteComercialSnapshot.val();

  const colheitaSnapshot = await get(
    ref(db, `colheitas/${loteComercial.colheita_id}`)
  );

  if (!colheitaSnapshot.exists()) {
    throw new Error("Colheita não encontrada.");
  }

  const colheita = colheitaSnapshot.val();

  const loteProducaoSnapshot = await get(
    ref(db, `lotes_producao/${loteComercial.lote_producao_id}`)
  );

  const loteProducao = loteProducaoSnapshot.exists()
    ? loteProducaoSnapshot.val()
    : null;

  let variedadeNome = loteProducao?.variedade_nome || "";

  if (loteProducao?.variedade_id) {
    const variedadeSnapshot = await get(
      ref(db, `variedades/${loteProducao.variedade_id}`)
    );

    if (variedadeSnapshot.exists()) {
      variedadeNome = variedadeSnapshot.val().nome;
    }
  }

  const unidadeSnapshot = await get(ref(db, "unit_data"));
  const unidade = unidadeSnapshot.exists()
    ? unidadeSnapshot.val()
    : {
        name: "Horta Jales",
        address: "Jales/SP",
        cnpj: ""
      };

  const payloadQr = JSON.stringify({
    lote_comercial: loteComercial.codigo_lote_comercial,
    lote_producao: loteProducao?.codigo_lote || "",
    data_colheita: colheita?.data_colheita || "",
    variedade: variedadeNome
  });

  const qrCodeDataUrl = await gerarQrCodeBase64(payloadQr);

  const html = montarHtmlEtiqueta({
    unidade,
    loteComercial,
    loteProducao,
    colheita,
    variedadeNome,
    qrCodeDataUrl
  });

  return {
    html,
    loteComercial,
    loteProducao,
    colheita
  };
}

export async function gerarEtiquetaPdf(loteComercialId) {
  const dados = await montarDadosEtiqueta(loteComercialId);

  const resultado = await Print.printToFileAsync({
    html: dados.html
  });

  return {
    uri: resultado.uri,
    html: dados.html,
    loteComercial: dados.loteComercial,
    loteProducao: dados.loteProducao,
    colheita: dados.colheita
  };
}

export async function compartilharEtiquetaPdf(uri) {
  const disponivel = await Sharing.isAvailableAsync();

  if (!disponivel) {
    throw new Error("Compartilhamento não disponível neste dispositivo.");
  }

  await Sharing.shareAsync(uri);
}

export async function imprimirEtiquetaHtml(loteComercialId) {
  const dados = await montarDadosEtiqueta(loteComercialId);
  await Print.printAsync({ html: dados.html });
}