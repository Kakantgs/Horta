  import { ref, get, update } from "firebase/database";
  import { db } from "../config/firebaseConfig";
  import { gerarId } from "../utils/idGenerator";
  import { obterSaldoDisponivelLote } from "./loteFields";

  function gerarCodigoLote(variedadeNome, dataEntrada) {
    const dataSemTraco = dataEntrada.replaceAll("-", "");
    const variedadeLimpa = variedadeNome
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

    const numero = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    return `LOT-${dataSemTraco}-${variedadeLimpa}-${numero}`;
  }

  function calcularQuantidadeTotal(quantidadeRecebida, unidade) {
    if ((unidade || "").trim().toLowerCase() === "bandeja") {
      return Number(quantidadeRecebida) * 128;
    }

    return Number(quantidadeRecebida);
  }

  export function validarDataISO(data) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;

    if (!regex.test(data)) {
      return false;
    }

    const [ano, mes, dia] = data.split("-").map(Number);
    const dataObj = new Date(data + "T00:00:00");

    return (
      dataObj.getFullYear() === ano &&
      dataObj.getMonth() + 1 === mes &&
      dataObj.getDate() === dia
    );
  }

  export async function registrarEntradaComLote({
    fornecedor_id,
    variedade_id,
    data_entrada,
    quantidade_recebida,
    unidade,
    tipo_origem,
    lote_fornecedor,
    observacoes = ""
  }) {
    const fornecedorSnapshot = await get(ref(db, `fornecedores/${fornecedor_id}`));
    if (!fornecedorSnapshot.exists()) {
      throw new Error("Fornecedor não encontrado.");
    }

    const variedadeSnapshot = await get(ref(db, `variedades/${variedade_id}`));
    if (!variedadeSnapshot.exists()) {
      throw new Error("Variedade não encontrada.");
    }

    const fornecedor = fornecedorSnapshot.val();
    const variedade = variedadeSnapshot.val();

    const entradaId = gerarId("ent");
    const loteId = gerarId("lot");

    const quantidadeTotal = calcularQuantidadeTotal(quantidade_recebida, unidade);
    const codigoLote = gerarCodigoLote(variedade.nome, data_entrada);

    const novaEntrada = {
      id: entradaId,
      fornecedor_id,
      variedade_id,
      fornecedor_nome: fornecedor.nome,
      variedade_nome: variedade.nome,
      data_entrada,
      quantidade_recebida: Number(quantidade_recebida),
      unidade: unidade.trim().toLowerCase(),
      tipo_origem: tipo_origem.trim().toLowerCase(),
      lote_fornecedor: lote_fornecedor?.trim() || "",
      observacoes: observacoes?.trim() || ""
    };

    const novoLote = {
      id: loteId,
      codigo_lote: codigoLote,
      entrada_id: entradaId,
      lote_pai_id: null,
      variedade_id,
      variedade_nome: variedade.nome,
      data_formacao: data_entrada,
      quantidade_inicial: quantidadeTotal,

      // NOVO CAMPO OFICIAL
      saldo_disponivel_para_ocupar: quantidadeTotal,

      // CAMPO LEGADO TEMPORÁRIO PARA NÃO QUEBRAR AINDA
      quantidade_atual: quantidadeTotal,

      status: "ativo",
      tipo_lote: "principal"
    };

    const updates = {};
    updates[`entradas/${entradaId}`] = novaEntrada;
    updates[`lotes_producao/${loteId}`] = novoLote;

    await update(ref(db), updates);

    return {
      entrada: novaEntrada,
      lote: novoLote
    };
  }

  export async function listarEntradas() {
    const snapshot = await get(ref(db, "entradas"));

    if (!snapshot.exists()) return [];

    return Object.values(snapshot.val()).sort((a, b) =>
      b.data_entrada.localeCompare(a.data_entrada)
    );
  }

  export async function listarLotesProducao() {
    const snapshot = await get(ref(db, "lotes_producao"));

    if (!snapshot.exists()) return [];

    return Object.values(snapshot.val())
      .map((item) => ({
        ...item,
        saldo_disponivel_para_ocupar: obterSaldoDisponivelLote(item)
      }))
      .sort((a, b) => b.data_formacao.localeCompare(a.data_formacao));
  }