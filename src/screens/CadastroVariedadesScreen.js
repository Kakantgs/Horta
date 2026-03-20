import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  Modal
} from "react-native";
import {
  criarVariedade,
  listarVariedades,
  atualizarVariedade,
  excluirVariedade
} from "../services/variedadeService";

export default function CadastroVariedadesScreen({ onVoltar }) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ciclo, setCiclo] = useState("");
  const [itens, setItens] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editCiclo, setEditCiclo] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const lista = await listarVariedades();
    setItens(lista);
  }

  async function handleCriar() {
    try {
      if (!nome) {
        alert("Nome é obrigatório.");
        return;
      }

      await criarVariedade({
        nome,
        categoria,
        ciclo_medio_dias: ciclo
      });

      setNome("");
      setCategoria("");
      setCiclo("");

      alert("Variedade cadastrada com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  function abrirEdicao(item) {
    setItemEditando(item);
    setEditNome(item.nome);
    setEditCategoria(item.categoria);
    setEditCiclo(String(item.ciclo_medio_dias));
    setModalVisible(true);
  }

  async function salvarEdicao() {
    try {
      await atualizarVariedade(itemEditando.id, {
        nome: editNome,
        categoria: editCategoria,
        ciclo_medio_dias: Number(editCiclo)
      });

      alert("Variedade atualizada com sucesso!");
      setModalVisible(false);
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleExcluir(id) {
    try {
      await excluirVariedade(id);
      alert("Variedade excluída com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Voltar" onPress={onVoltar} />
      <Text style={styles.titulo}>Cadastro de Variedades</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} />

      <Text style={styles.label}>Categoria</Text>
      <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} />

      <Text style={styles.label}>Ciclo médio (dias)</Text>
      <TextInput style={styles.input} value={ciclo} onChangeText={setCiclo} keyboardType="numeric" />

      <Button title="Cadastrar Variedade" onPress={handleCriar} />

      <Text style={styles.subtitulo}>Variedades cadastradas</Text>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>{item.nome}</Text>
            <Text>Categoria: {item.categoria}</Text>
            <Text>Ciclo médio: {item.ciclo_medio_dias} dias</Text>

            <View style={styles.linha}>
              <View style={styles.botao}>
                <Button title="Editar" onPress={() => abrirEdicao(item)} />
              </View>
              <View style={styles.botao}>
                <Button title="Excluir" onPress={() => handleExcluir(item.id)} />
              </View>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.titulo}>Editar Variedade</Text>

            <TextInput style={styles.input} value={editNome} onChangeText={setEditNome} />
            <TextInput style={styles.input} value={editCategoria} onChangeText={setEditCategoria} />
            <TextInput style={styles.input} value={editCiclo} onChangeText={setEditCiclo} keyboardType="numeric" />

            <Button title="Salvar" onPress={salvarEdicao} />
            <View style={{ height: 10 }} />
            <Button title="Fechar" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  titulo: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginVertical: 16 },
  subtitulo: { fontSize: 18, fontWeight: "bold", marginVertical: 16 },
  label: { fontWeight: "bold", marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#999", borderRadius: 8, padding: 10, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 10 },
  cardTitulo: { fontWeight: "bold", fontSize: 16, marginBottom: 4 },
  linha: { flexDirection: "row", marginTop: 10 },
  botao: { marginRight: 10 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modal: { width: "90%", backgroundColor: "#fff", padding: 20, borderRadius: 10 }
});