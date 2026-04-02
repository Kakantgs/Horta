import { get, ref, update } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { gerarId } from "../utils/idGenerator";
import { obterSaldoDisponivelLote } from "./loteFields";

function gerarCodigoSublote(variedadeNome, dataFormacao) {
  const dataSemTraco = dataFormacao.replaceAll("-", "");
  const variedadeLimpa = variedadeNome
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  const numero = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `SUBLOT-${dataSemTraco}-${variedadeLimpa}-${numero}`;
}

export async function criarSublote({
  lote_pai_id,
  quantidade,
  data_formacao,
  descontar_do_pai = true
}) {
  const lotePaiSnapshot = await get(ref(db, `lotes_producao/${lote_pai_id}`));

  if (!lotePaiSnapshot.exists()) {
    throw new Error("Lote pai não encontrado.");
  }

  const lotePai = lotePaiSnapshot.val();
  const qtd = Number(quantidade);
  const saldoPai = obterSaldoDisponivelLote(lotePai);

  if (qtd <= 0) {
    throw new Error("A quantidade do sublote deve ser maior que zero.");
  }

  if (descontar_do_pai && qtd > saldoPai) {
    throw new Error("A quantidade do sublote é maior que o saldo atual do lote pai.");
  }

  const subloteId = gerarId("lot");
  const codigoSublote = gerarCodigoSublote(
    lotePai.variedade_nome,
    data_formacao
  );

  const novoSublote = {
    id: subloteId,
    codigo_lote: codigoSublote,
    entrada_id: lotePai.entrada_id,
    lote_pai_id: lote_pai_id,
    variedade_id: lotePai.variedade_id,
    variedade_nome: lotePai.variedade_nome,
    data_formacao,
    quantidade_inicial: qtd,
    saldo_disponivel_para_ocupar: qtd,
    quantidade_atual: qtd,
    tipo_lote: "sublote",
    status: "ativo",
    preparado_para_sublote: false
  };

  const updates = {};
  updates[`lotes_producao/${subloteId}`] = novoSublote;

  if (descontar_do_pai) {
    const novoSaldoPai = saldoPai - qtd;

    updates[`lotes_producao/${lote_pai_id}/saldo_disponivel_para_ocupar`] = novoSaldoPai;

    // legado temporário
    if (lotePai.quantidade_atual !== undefined) {
      updates[`lotes_producao/${lote_pai_id}/quantidade_atual`] = novoSaldoPai;
    }

    if (novoSaldoPai === 0) {
      updates[`lotes_producao/${lote_pai_id}/status`] = "transplantado";
    }
  }

  await update(ref(db), updates);

  return novoSublote;
}