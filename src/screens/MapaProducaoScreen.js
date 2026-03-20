import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Button
} from "react-native";
import { onValue, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { moverBancada } from "../services/bancadaService";

const TOTAL_COLUNAS = 6;
const TOTAL_LINHAS = 12;

export default function MapaProducaoScreen() {
  const [bancadas, setBancadas] = useState([]);
  const [bancadaSelecionada, setBancadaSelecionada] = useState(null);
  const [modoMover, setModoMover] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const bancadaRef = ref(db, "bancadas");

    const unsubscribe = onValue(bancadaRef, (snapshot) => {
      if (snapshot.exists()) {
        setBancadas(Object.values(snapshot.val()));
      } else {
        setBancadas([]);
      }
    });

    return () => unsubscribe();
  }, []);

  function obterCorBancada(item) {
    if (item.status === "vazia") return "#bfc9ca";
    if (item.fase_visual === "recem_chegado") return "#f4d03f";
    if (item.fase_visual === "em_crescimento") return "#82e0aa";
    if (item.fase_visual === "pronto_colheita") return "#196f3d";
    if (item.fase_visual === "alerta") return "#e74c3c";
    return "#95a5a6";
  }

  function encontrarBancadaNaCelula(x, y) {
    return bancadas.find(
      (bancada) =>
        bancada.coordenada?.x === x &&
        bancada.coordenada?.y === y
    );
  }

  async function handleCliqueCelula(x, y) {
    try {
      if (modoMover && bancadaSelecionada) {
        await moverBancada(bancadaSelecionada.id_bancada, x, y);
        setModoMover(false);
        setBancadaSelecionada(null);
        setModalVisible(false);
        return;
      }

      const bancada = encontrarBancadaNaCelula(x, y);

      if (bancada) {
        setBancadaSelecionada(bancada);
        setModalVisible(true);
      }
    } catch (error) {
      alert(error.message);
    }
  }

  function renderizarGrade() {
    const linhas = [];

    for (let y = 0; y < TOTAL_LINHAS; y++) {
      const colunas = [];

      for (let x = 0; x < TOTAL_COLUNAS; x++) {
        const bancada = encontrarBancadaNaCelula(x, y);

        colunas.push(
          <TouchableOpacity
            key={`${x}-${y}`}
            style={[
              styles.celula,
              bancada
                ? { backgroundColor: obterCorBancada(bancada) }
                : styles.celulaVazia
            ]}
            onPress={() => handleCliqueCelula(x, y)}
          >
            {bancada ? (
              <>
                <Text style={styles.idTexto}>{bancada.id_bancada}</Text>
                <Text style={styles.tipoTexto}>{bancada.tipo}</Text>
              </>
            ) : (
              <Text style={styles.vazioTexto}>Livre</Text>
            )}
          </TouchableOpacity>
        );
      }

      linhas.push(
        <View key={y} style={styles.linha}>
          {colunas}
        </View>
      );
    }

    return linhas;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Mapa da Produção</Text>
      <Text style={styles.legenda}>
        Toque em uma bancada para abrir opções. Para mover, toque em "Mover" e depois em uma célula livre.
      </Text>

      <View style={styles.grade}>{renderizarGrade()}</View>

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>
              Bancada {bancadaSelecionada?.id_bancada}
            </Text>
            <Text>Nome: {bancadaSelecionada?.nome}</Text>
            <Text>Tipo: {bancadaSelecionada?.tipo}</Text>
            <Text>Status: {bancadaSelecionada?.status}</Text>
            <Text>
              Posição: ({bancadaSelecionada?.coordenada?.x},{" "}
              {bancadaSelecionada?.coordenada?.y})
            </Text>

            <View style={{ height: 10 }} />
            <Button
              title="Mover bancada"
              onPress={() => {
                setModoMover(true);
                setModalVisible(false);
              }}
            />

            <View style={{ height: 10 }} />
            <Button title="Fechar" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8
  },
  legenda: {
    textAlign: "center",
    marginBottom: 12
  },
  grade: {
    alignItems: "center"
  },
  linha: {
    flexDirection: "row"
  },
  celula: {
    width: 55,
    height: 55,
    margin: 4,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#999"
  },
  celulaVazia: {
    backgroundColor: "#ecf0f1"
  },
  idTexto: {
    fontWeight: "bold",
    fontSize: 12
  },
  tipoTexto: {
    fontSize: 9,
    textAlign: "center"
  },
  vazioTexto: {
    fontSize: 10,
    color: "#666"
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center"
  },
  modal: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10
  }
});