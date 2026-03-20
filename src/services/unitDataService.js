import { get, ref, set } from "firebase/database";
import { db } from "../config/firebaseConfig";

export async function salvarDadosUnidade({ name, address, cnpj }) {
  const dados = {
    name: name?.trim() || "",
    address: address?.trim() || "",
    cnpj: cnpj?.trim() || ""
  };

  await set(ref(db, "unit_data"), dados);
  return dados;
}

export async function buscarDadosUnidade() {
  const snapshot = await get(ref(db, "unit_data"));

  if (!snapshot.exists()) {
    return {
      name: "",
      address: "",
      cnpj: ""
    };
  }

  return snapshot.val();
}