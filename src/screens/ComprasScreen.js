import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { criarLote } from "../services/loteService";

export default function ComprasScreen() {
  const [fornecedorId, setFornecedorId] = useState("");
  const [variedade, setVariedade] = useState("");
  const [quantidadeBandejas, setQuantidadeBandejas] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");

  async function handleSalvar() {
    try {
      if (!fornecedorId || !variedade || !quantidadeBandejas || !dataEntrada) {
        alert("Preencha todos os campos.");
        return;
      }

      const lote = await criarLote({
        fornecedor_id: fornecedorId,
        variedade,
        quantidade_bandejas: quantidadeBandejas,
        data_entrada: dataEntrada
      });

      alert(`Lote criado com sucesso!\nID: ${lote.id_lote}\nSaldo inicial: ${lote.saldo_atual}`);

      setFornecedorId("");
      setVariedade("");
      setQuantidadeBandejas("");
      setDataEntrada("");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Entrada de Compras</Text>

      <Text style={styles.label}>Fornecedor ID</Text>
      <TextInput
        style={styles.input}
        value={fornecedorId}
        onChangeText={setFornecedorId}
        placeholder="forn_001"
      />

      <Text style={styles.label}>Variedade</Text>
      <TextInput
        style={styles.input}
        value={variedade}
        onChangeText={setVariedade}
        placeholder="Crespa"
      />

      <Text style={styles.label}>Quantidade de Bandejas</Text>
      <TextInput
        style={styles.input}
        value={quantidadeBandejas}
        onChangeText={setQuantidadeBandejas}
        placeholder="20"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Data de Entrada</Text>
      <TextInput
        style={styles.input}
        value={dataEntrada}
        onChangeText={setDataEntrada}
        placeholder="2026-03-06"
      />

      <Button title="Gerar Lote" onPress={handleSalvar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center"
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  }
});