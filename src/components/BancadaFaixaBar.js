import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BancadaFaixaBar({
  capacidadeTotal,
  faixasOcupadas = [],
  altura = 28
}) {
  const capacidade = Number(capacidadeTotal) || 1;

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { height: altura }]}>
        {faixasOcupadas.map((faixa) => {
          const left = ((faixa.inicio - 1) / capacidade) * 100;
          const width = (faixa.tamanho / capacidade) * 100;

          return (
            <View
              key={faixa.id}
              style={[
                styles.segmentoOcupado,
                {
                  left: `${left}%`,
                  width: `${width}%`,
                  height: altura
                }
              ]}
            />
          );
        })}
      </View>

      <View style={styles.legendaLinha}>
        <Text style={styles.legendaTexto}>1</Text>
        <Text style={styles.legendaTexto}>{capacidade}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10
  },
  bar: {
    width: "100%",
    backgroundColor: "#ecf0f1",
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#bdc3c7"
  },  
  segmentoOcupado: {
    position: "absolute",
    top: 0,
    backgroundColor: "#2e86de"
  },
  legendaLinha: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  legendaTexto: {
    fontSize: 12,
    color: "#555"
  }
});