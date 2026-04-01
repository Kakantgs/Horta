import { get, ref, set } from "firebase/database";
import { db } from "../config/firebaseConfig";

const CAMINHO_DADOS_UNIDADE = "dados_unidade/principal";

export async function obterDadosUnidade() {
  const snapshot = await get(ref(db, CAMINHO_DADOS_UNIDADE));

  if (!snapshot.exists()) {
    return {
      nome_unidade: "",
      produtor_nome: "",
      cnpj: "",
      origem_padrao: "",
      local_producao_padrao: "",
      telefone: "",
      email: "",
      site: ""
    };
  }

  return snapshot.val();
}

export async function salvarDadosUnidade(dados) {
  const payload = {
    nome_unidade: (dados.nome_unidade || "").trim(),
    produtor_nome: (dados.produtor_nome || "").trim(),
    cnpj: (dados.cnpj || "").trim(),
    origem_padrao: (dados.origem_padrao || "").trim(),
    local_producao_padrao: (dados.local_producao_padrao || "").trim(),
    telefone: (dados.telefone || "").trim(),
    email: (dados.email || "").trim(),
    site: (dados.site || "").trim()
  };

  await set(ref(db, CAMINHO_DADOS_UNIDADE), payload);

  return payload;
}