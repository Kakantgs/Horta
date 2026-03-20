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
  criarFornecedor,
  listarFornecedores,
  atualizarFornecedor,
  excluirFornecedor
} from "../services/fornecedorService";

export default function CadastroFornecedoresScreen({ onVoltar }) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [itens, setItens] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const lista = await listarFornecedores();
    setItens(lista);
  }

  async function handleCriar() {
    try {
      if (!nome) {
        alert("Nome é obrigatório.");
        return;
      }

      await criarFornecedor({ nome, cnpj, telefone, email });

      setNome("");
      setCnpj("");
      setTelefone("");
      setEmail("");

      alert("Fornecedor cadastrado com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  function abrirEdicao(item) {
    setItemEditando(item);
    setEditNome(item.nome);
    setEditCnpj(item.cnpj);
    setEditTelefone(item.telefone);
    setEditEmail(item.email);
    setModalVisible(true);
  }

  async function salvarEdicao() {
    try {
      await atualizarFornecedor(itemEditando.id, {
        nome: editNome,
        cnpj: editCnpj,
        telefone: editTelefone,
        email: editEmail
      });

      alert("Fornecedor atualizado com sucesso!");
      setModalVisible(false);
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleExcluir(id) {
    try {
      await excluirFornecedor(id);
      alert("Fornecedor excluído com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Voltar" onPress={onVoltar} />
      <Text style={styles.titulo}>Cadastro de Fornecedores</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} />

      <Text style={styles.label}>CNPJ</Text>
      <TextInput style={styles.input} value={cnpj} onChangeText={setCnpj} />

      <Text style={styles.label}>Telefone</Text>
      <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} />

      <Button title="Cadastrar Fornecedor" onPress={handleCriar} />

      <Text style={styles.subtitulo}>Fornecedores cadastrados</Text>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitulo}>{item.nome}</Text>
            <Text>CNPJ: {item.cnpj}</Text>
            <Text>Telefone: {item.telefone}</Text>
            <Text>Email: {item.email}</Text>

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
            <Text style={styles.titulo}>Editar Fornecedor</Text>

            <TextInput style={styles.input} value={editNome} onChangeText={setEditNome} />
            <TextInput style={styles.input} value={editCnpj} onChangeText={setEditCnpj} />
            <TextInput style={styles.input} value={editTelefone} onChangeText={setEditTelefone} />
            <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} />

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