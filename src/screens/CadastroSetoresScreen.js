import { useEffect, useState } from "react";
import {
    Button,
    FlatList,
    Modal,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from "react-native";
import {
    atualizarSetor,
    criarSetor,
    excluirSetor,
    listarSetores
} from "../services/setorService";

export default function CadastroSetoresScreen({ onVoltar }) {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [setores, setSetores] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [editCodigo, setEditCodigo] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const lista = await listarSetores();
      setSetores(lista);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleCriar() {
    try {
      if (!codigo) {
        alert("Código do setor é obrigatório.");
        return;
      }

      await criarSetor({
        codigo,
        nome,
        descricao,
        ativo
      });

      alert("Setor cadastrado com sucesso!");

      setCodigo("");
      setNome("");
      setDescricao("");
      setAtivo(true);

      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  function abrirEdicao(item) {
    setItemEditando(item);
    setEditCodigo(item.codigo);
    setEditNome(item.nome);
    setEditDescricao(item.descricao || "");
    setEditAtivo(Boolean(item.ativo));
    setModalVisible(true);
  }

  async function salvarEdicao() {
    try {
      await atualizarSetor(itemEditando.id, {
        codigo: editCodigo,
        nome: editNome,
        descricao: editDescricao,
        ativo: editAtivo
      });

      alert("Setor atualizado com sucesso!");
      setModalVisible(false);
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleExcluir(id) {
    try {
      await excluirSetor(id);
      alert("Setor excluído com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Voltar" onPress={onVoltar} />

      <Text style={styles.titulo}>CRUD de Setores</Text>

      <Text style={styles.label}>Código do setor</Text>
      <TextInput
        style={styles.input}
        value={codigo}
        onChangeText={setCodigo}
        placeholder="A, B, C..."
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Setor A"
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={styles.input}
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Opcional"
      />

      <View style={styles.linhaSwitch}>
        <Text>Ativo</Text>
        <Switch value={ativo} onValueChange={setAtivo} />
      </View>

      <Button title="Cadastrar setor" onPress={handleCriar} />

      <Text style={styles.subtitulo}>Setores cadastrados</Text>

      <FlatList
        data={setores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>
              {item.codigo} - {item.nome}
            </Text>
            <Text>Descrição: {item.descricao || "-"}</Text>
            <Text>Ativo: {item.ativo ? "Sim" : "Não"}</Text>
            <Text>Contador de bancadas: {item.contador_bancadas || 0}</Text>

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
            <Text style={styles.titulo}>Editar setor</Text>

            <TextInput
              style={styles.input}
              value={editCodigo}
              onChangeText={setEditCodigo}
              placeholder="Código"
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.input}
              value={editNome}
              onChangeText={setEditNome}
              placeholder="Nome"
            />

            <TextInput
              style={styles.input}
              value={editDescricao}
              onChangeText={setEditDescricao}
              placeholder="Descrição"
            />

            <View style={styles.linhaSwitch}>
              <Text>Ativo</Text>
              <Switch value={editAtivo} onValueChange={setEditAtivo} />
            </View>

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
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  card: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10
  },
  cardTitulo: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4
  },
  linha: {
    flexDirection: "row",
    marginTop: 10
  },
  botao: {
    marginRight: 10
  },
  linhaSwitch: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10
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
    padding: 20,
    borderRadius: 10
  }
});