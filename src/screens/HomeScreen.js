import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Sistema de Rastreabilidade</Text>

      <Button
        title="Cadastrar Bancadas"
        onPress={() => navigation.navigate("CadastroBancadas")}
      />
      <View style={styles.espaco} />

      <Button
        title="Ir para Entrada de Compras"
        onPress={() => navigation.navigate("Compras")}
      />
      <View style={styles.espaco} />

      <Button
        title="Ir para Mapa de Produção"
        onPress={() => navigation.navigate("MapaProducao")}
      />
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