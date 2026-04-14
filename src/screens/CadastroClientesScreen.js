import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  TouchableOpacity
} from "react-native";
import {
  criarCliente,
  listarClientesCadastro,
  atualizarCliente,
  excluirCliente,
  inativarCliente,
  reativarCliente
} from "../services/clienteService";
import OptionSelectField from "../components/OptionSelectField";

function ActionButton({ title, onPress, disabled = false, variant = "primary" }) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === "danger" && styles.actionButtonDanger,
        variant === "secondary" && styles.actionButtonSecondary,
        disabled && styles.actionButtonDisabled
      ]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
    >
      <Text
        style={[
          styles.actionButtonText,
          variant === "secondary" && styles.actionButtonTextSecondary,
          disabled && styles.actionButtonTextDisabled
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export default function CadastroClientesScreen({ onVoltar }) {
  const [nome, setNome] = useState("");
  const [tipoCliente, setTipoCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [usaPrecoPadrao, setUsaPrecoPadrao] = useState("nao");
  const [precoPadrao, setPrecoPadrao] = useState("");
  const [itens, setItens] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editTipoCliente, setEditTipoCliente] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsaPrecoPadrao, setEditUsaPrecoPadrao] = useState("nao");
  const [editPrecoPadrao, setEditPrecoPadrao] = useState("");

  const OPCOES_PRECO_PADRAO = [
    { label: "Não", value: "nao" },
    { label: "Sim", value: "sim" }
  ];

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const lista = await listarClientesCadastro();
      setItens(lista);
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  async function handleCriar() {
    try {
      if (!nome.trim()) {
        Alert.alert("Validação", "Nome é obrigatório.");
        return;
      }

      await criarCliente({
        nome,
        tipo_cliente: tipoCliente,
        telefone,
        email,
        usa_preco_padrao: usaPrecoPadrao === "sim",
        preco_padrao: usaPrecoPadrao === "sim" ? precoPadrao : 0
      });

      setNome("");
      setTipoCliente("");
      setTelefone("");
      setEmail("");
      setUsaPrecoPadrao("nao");
      setPrecoPadrao("");

      Alert.alert("Sucesso", "Cliente cadastrado com sucesso.");
      await carregar();
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  function abrirEdicao(item) {
    setItemEditando(item);
    setEditNome(item.nome || "");
    setEditTipoCliente(item.tipo_cliente || "");
    setEditTelefone(item.telefone || "");
    setEditEmail(item.email || "");
    setEditUsaPrecoPadrao(item.usa_preco_padrao ? "sim" : "nao");
    setEditPrecoPadrao(
      item.usa_preco_padrao && Number(item.preco_padrao || 0) > 0
        ? String(item.preco_padrao).replace(".", ",")
        : ""
    );
    setModalVisible(true);
  }

  async function salvarEdicao() {
    try {
      if (!itemEditando) return;

      await atualizarCliente(itemEditando.id, {
        nome: editNome,
        tipo_cliente: editTipoCliente,
        telefone: editTelefone,
        email: editEmail,
        usa_preco_padrao: editUsaPrecoPadrao === "sim",
        preco_padrao: editUsaPrecoPadrao === "sim" ? editPrecoPadrao : 0
      });

      Alert.alert("Sucesso", "Cliente atualizado com sucesso.");
      setModalVisible(false);
      await carregar();
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  async function handleExcluir(id) {
    try {
      await excluirCliente(id);
      Alert.alert("Sucesso", "Cliente excluído com sucesso.");
      await carregar();
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  async function handleInativar(id) {
    try {
      await inativarCliente(id);
      Alert.alert("Sucesso", "Cliente inativado com sucesso.");
      await carregar();
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  async function handleReativar(id) {
    try {
      await reativarCliente(id);
      Alert.alert("Sucesso", "Cliente reativado com sucesso.");
      await carregar();
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ActionButton title="VOLTAR" onPress={onVoltar} />

      <Text style={styles.titulo}>Cadastro de Clientes</Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput style={styles.input} value={nome} onChangeText={setNome} />

      <Text style={styles.label}>Tipo do cliente</Text>
      <TextInput style={styles.input} value={tipoCliente} onChangeText={setTipoCliente} />

      <Text style={styles.label}>Telefone</Text>
      <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} />

      <OptionSelectField
        label="Usa preço padrão nas vendas?"
        value={usaPrecoPadrao}
        onChange={setUsaPrecoPadrao}
        options={OPCOES_PRECO_PADRAO}
      />

      {usaPrecoPadrao === "sim" ? (
        <>
          <Text style={styles.label}>Preço padrão</Text>
          <TextInput
            style={styles.input}
            value={precoPadrao}
            onChangeText={setPrecoPadrao}
            keyboardType="numeric"
            placeholder="Ex: 2,50"
          />
        </>
      ) : null}

      <ActionButton title="CADASTRAR CLIENTE" onPress={handleCriar} />

      <Text style={styles.subtitulo}>Clientes cadastrados</Text>

      {itens.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitulo}>{item.nome}</Text>
          <Text>Tipo: {item.tipo_cliente || "-"}</Text>
          <Text>Telefone: {item.telefone || "-"}</Text>
          <Text>Email: {item.email || "-"}</Text>
          <Text>Ativo: {item.ativo === false ? "Não" : "Sim"}</Text>
          <Text>
            Usa preço padrão: {item.usa_preco_padrao ? "Sim" : "Não"}
          </Text>
          <Text>
            Preço padrão: {item.usa_preco_padrao ? formatarMoeda(item.preco_padrao || 0) : "-"}
          </Text>

          <View style={styles.linha}>
            <View style={styles.botaoLinha}>
              <ActionButton title="EDITAR" onPress={() => abrirEdicao(item)} />
            </View>

            <View style={styles.botaoLinha}>
              {item.ativo === false ? (
                <ActionButton
                  title="REATIVAR"
                  onPress={() => handleReativar(item.id)}
                />
              ) : (
                <ActionButton
                  title="INATIVAR"
                  onPress={() => handleInativar(item.id)}
                  variant="secondary"
                />
              )}
            </View>

            <View style={styles.botaoLinha}>
              <ActionButton
                title="EXCLUIR"
                onPress={() => handleExcluir(item.id)}
                variant="danger"
              />
            </View>
          </View>
        </View>
      ))}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modal}>
              <Text style={styles.titulo}>Editar Cliente</Text>

              <Text style={styles.label}>Nome</Text>
              <TextInput style={styles.input} value={editNome} onChangeText={setEditNome} />

              <Text style={styles.label}>Tipo do cliente</Text>
              <TextInput style={styles.input} value={editTipoCliente} onChangeText={setEditTipoCliente} />

              <Text style={styles.label}>Telefone</Text>
              <TextInput style={styles.input} value={editTelefone} onChangeText={setEditTelefone} />

              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} />

              <OptionSelectField
                label="Usa preço padrão nas vendas?"
                value={editUsaPrecoPadrao}
                onChange={setEditUsaPrecoPadrao}
                options={OPCOES_PRECO_PADRAO}
              />

              {editUsaPrecoPadrao === "sim" ? (
                <>
                  <Text style={styles.label}>Preço padrão</Text>
                  <TextInput
                    style={styles.input}
                    value={editPrecoPadrao}
                    onChangeText={setEditPrecoPadrao}
                    keyboardType="numeric"
                    placeholder="Ex: 2,50"
                  />
                </>
              ) : null}

              <ActionButton title="SALVAR" onPress={salvarEdicao} />
              <ActionButton
                title="FECHAR"
                onPress={() => setModalVisible(false)}
                variant="secondary"
              />
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
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 16
  },
  label: {
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4
  },
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
    marginTop: 10,
    flexWrap: "wrap"
  },
  botaoLinha: {
    width: "100%",
    marginBottom: 6
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center"
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16
  },
  modal: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10
  },
  actionButton: {
    backgroundColor: "#2196F3",
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  actionButtonSecondary: {
    backgroundColor: "#1976d2"
  },
  actionButtonDanger: {
    backgroundColor: "#d32f2f"
  },
  actionButtonDisabled: {
    backgroundColor: "#9e9e9e"
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase"
  },
  actionButtonTextSecondary: {
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase"
  },
  actionButtonTextDisabled: {
    color: "#f5f5f5",
    fontWeight: "bold",
    textTransform: "uppercase"
  }
});