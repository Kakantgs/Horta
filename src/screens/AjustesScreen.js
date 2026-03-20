import React, { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import CadastroBancadasScreen from "./CadastroBancadasScreen";
import CadastroFornecedoresScreen from "./CadastroFornecedoresScreen";
import CadastroClientesScreen from "./CadastroClientesScreen";
import CadastroVariedadesScreen from "./CadastroVariedadesScreen";
import DadosUnidadeScreen from "./DadosUnidadeScreen";

export default function AjustesScreen() {
  const [modulo, setModulo] = useState("menu");

  if (modulo === "bancadas") {
    return <CadastroBancadasScreen onVoltar={() => setModulo("menu")} />;
  }

  if (modulo === "fornecedores") {
    return <CadastroFornecedoresScreen onVoltar={() => setModulo("menu")} />;
  }

  if (modulo === "clientes") {
    return <CadastroClientesScreen onVoltar={() => setModulo("menu")} />;
  }

  if (modulo === "variedades") {
    return <CadastroVariedadesScreen onVoltar={() => setModulo("menu")} />;
  }

  if (modulo === "unidade") {
    return <DadosUnidadeScreen onVoltar={() => setModulo("menu")} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Ajustes</Text>

      <Button title="Dados da Unidade" onPress={() => setModulo("unidade")} />
      <View style={styles.espaco} />

      <Button title="CRUD de Bancadas" onPress={() => setModulo("bancadas")} />
      <View style={styles.espaco} />

      <Button title="Cadastro de Fornecedores" onPress={() => setModulo("fornecedores")} />
      <View style={styles.espaco} />

      <Button title="Cadastro de Clientes" onPress={() => setModulo("clientes")} />
      <View style={styles.espaco} />

      <Button title="Cadastro de Variedades" onPress={() => setModulo("variedades")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20
  },
  espaco: {
    height: 12
  }
});