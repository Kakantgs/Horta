import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Modal,
  ScrollView
} from "react-native";
import {
  criarVariedade,
  listarVariedadesCadastro,
  atualizarVariedade,
  excluirVariedade,
  inativarVariedade,
  reativarVariedade
} from "../services/variedadeService";

export default function CadastroVariedadesScreen({ onVoltar }) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [cicloMedioDias, setCicloMedioDias] = useState("");
  const [itens, setItens] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editCicloMedioDias, setEditCicloMedioDias] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const lista = await listarVariedadesCadastro();
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
        ciclo_medio_dias: cicloMedioDias
      });

      setNome("");
      setCategoria("");
      setCicloMedioDias("");

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
    setEditCicloMedioDias(String(item.ciclo_medio_dias || ""));
    setModalVisible(true);
  }

  async function salvarEdicao() {
    try {
      await atualizarVariedade(itemEditando.id, {
        nome: editNome,
        categoria: editCategoria,
        ciclo_medio_dias: editCicloMedioDias
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

  async function handleInativar(id) {
    try {
      await inativarVariedade(id);
      alert("Variedade inativada com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleReativar(id) {
    try {
      await reativarVariedade(id);
      alert("Variedade reativada com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Button title="Voltar" onPress={onVoltar} />

      <Text style={styles.titulo}>Cadastro de Variedades</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} />

      <Text style={styles.label}>Categoria</Text>
      <TextInput style={styles.input} value={categoria} onChangeText={setCategoria} />

      <Text style={styles.label}>Ciclo médio em dias</Text>
      <TextInput
        style={styles.input}
        value={cicloMedioDias}
        onChangeText={setCicloMedioDias}
        keyboardType="numeric"
      />

      <Button title="Cadastrar Variedade" onPress={handleCriar} />

      <Text style={styles.subtitulo}>Variedades cadastradas</Text>

      {itens.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitulo}>{item.nome}</Text>
          <Text>Categoria: {item.categoria}</Text>
          <Text>Ciclo médio: {item.ciclo_medio_dias} dias</Text>
          <Text>Ativo: {item.ativo === false ? "Não" : "Sim"}</Text>

          <View style={styles.linha}>
            <View style={styles.botao}>
              <Button title="Editar" onPress={() => abrirEdicao(item)} />
            </View>

            {item.ativo === false ? (
              <View style={styles.botao}>
                <Button title="Reativar" onPress={() => handleReativar(item.id)} />
              </View>
            ) : (
              <View style={styles.botao}>
                <Button title="Inativar" onPress={() => handleInativar(item.id)} />
              </View>
            )}

            <View style={styles.botao}>
              <Button title="Excluir" onPress={() => handleExcluir(item.id)} />
            </View>
          </View>
        </View>
      ))}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modal}>
              <Text style={styles.titulo}>Editar Variedade</Text>

              <TextInput style={styles.input} value={editNome} onChangeText={setEditNome} />
              <TextInput style={styles.input} value={editCategoria} onChangeText={setEditCategoria} />
              <TextInput
                style={styles.input}
                value={editCicloMedioDias}
                onChangeText={setEditCicloMedioDias}
                keyboardType="numeric"
              />

              <Button title="Salvar" onPress={salvarEdicao} />
              <View style={{ height: 10 }} />
              <Button title="Fechar" onPress={() => setModalVisible(false)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { flexGrow: 1, padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginVertical: 16 },
  subtitulo: { fontSize: 18, fontWeight: "bold", marginVertical: 16 },
  label: { fontWeight: "bold", marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#999", borderRadius: 8, padding: 10, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 10 },
  cardTitulo: { fontWeight: "bold", fontSize: 16, marginBottom: 4 },
  linha: { flexDirection: "row", marginTop: 10, flexWrap: "wrap" },
  botao: { marginRight: 10, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center" },
  modalScroll: { flexGrow: 1, justifyContent: "center", padding: 16 },
  modal: { width: "100%", backgroundColor: "#fff", padding: 20, borderRadius: 10 }
});