import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import {
  salvarDadosUnidade,
  buscarDadosUnidade
} from "../services/unitDataService";

export default function DadosUnidadeScreen({ onVoltar }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [cnpj, setCnpj] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const dados = await buscarDadosUnidade();
      setName(dados.name || "");
      setAddress(dados.address || "");
      setCnpj(dados.cnpj || "");
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleSalvar() {
    try {
      await salvarDadosUnidade({ name, address, cnpj });
      alert("Dados da unidade salvos com sucesso!");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Voltar" onPress={onVoltar} />

      <Text style={styles.titulo}>Dados da Unidade</Text>

      <Text style={styles.label}>Nome da unidade</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Endereço</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} />

      <Text style={styles.label}>CNPJ</Text>
      <TextInput style={styles.input} value={cnpj} onChangeText={setCnpj} />

      <Button title="Salvar dados da unidade" onPress={handleSalvar} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center"
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  }
});