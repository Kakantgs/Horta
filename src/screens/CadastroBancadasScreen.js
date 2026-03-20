import { useEffect, useState } from "react";
import {
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import OptionSelectField from "../components/OptionSelectField";
import {
  atualizarBancada,
  criarBancada,
  excluirBancada,
  listarBancadas
} from "../services/bancadaService";

export default function CadastroBancadasScreen({ onVoltar }) {
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState("bercario");
  const [capacidadeTotal, setCapacidadeTotal] = useState("");
  const [status, setStatus] = useState("vazia");
  const [x, setX] = useState("");
  const [y, setY] = useState("");
  const [bancadas, setBancadas] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);

  const [editTipo, setEditTipo] = useState("bercario");
  const [editCapacidade, setEditCapacidade] = useState("");
  const [editStatus, setEditStatus] = useState("vazia");
  const [editX, setEditX] = useState("");
  const [editY, setEditY] = useState("");

  const OPCOES_TIPO_BANCADA = [
    { label: "Berçário", value: "bercario" },
    { label: "Final", value: "final" }
  ];

  const OPCOES_STATUS_BANCADA = [
    { label: "Vazia", value: "vazia" },
    { label: "Ocupada", value: "ocupada" },
    { label: "Alerta", value: "alerta" },
    { label: "Manutenção", value: "manutencao" },
    { label: "Inativa", value: "inativa" }
  ];

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const lista = await listarBancadas();
      setBancadas(lista);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleCriar() {
    try {
      if (!codigo || !tipo || !capacidadeTotal || x === "" || y === "") {
        alert("Preencha os campos obrigatórios.");
        return;
      }

      await criarBancada({
        codigo,
        tipo,
        capacidade_total: capacidadeTotal,
        status,
        x,
        y
      });

      alert("Bancada cadastrada com sucesso!");

      setCodigo("");
      setTipo("bercario");
      setCapacidadeTotal("");
      setStatus("vazia");
      setX("");
      setY("");

      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  function abrirEdicao(item) {
    setItemEditando(item);
    setEditTipo(item.tipo);
    setEditCapacidade(String(item.capacidade_total));
    setEditStatus(item.status);
    setEditX(String(item.x));
    setEditY(String(item.y));
    setModalVisible(true);
  }

  async function salvarEdicao() {
    try {
      await atualizarBancada(itemEditando.id, {
        tipo: editTipo,
        capacidade_total: Number(editCapacidade),
        status: editStatus,
        x: Number(editX),
        y: Number(editY)
      });

      alert("Bancada atualizada com sucesso!");
      setModalVisible(false);
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleExcluir(id) {
    try {
      await excluirBancada(id);
      alert("Bancada excluída com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  function renderItem({ item }) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitulo}>{item.codigo}</Text>
        <Text>Tipo: {item.tipo}</Text>
        <Text>Capacidade: {item.capacidade_total}</Text>
        <Text>Status: {item.status}</Text>
        <Text>Posição: ({item.x}, {item.y})</Text>

        <View style={styles.linha}>
          <View style={styles.botao}>
            <Button title="Editar" onPress={() => abrirEdicao(item)} />
          </View>
          <View style={styles.botao}>
            <Button title="Excluir" onPress={() => handleExcluir(item.id)} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button title="Voltar" onPress={onVoltar} />

      <Text style={styles.titulo}>CRUD de Bancadas</Text>

      <Text style={styles.label}>Código</Text>
      <TextInput
        style={styles.input}
        value={codigo}
        onChangeText={setCodigo}
        placeholder="B01 ou F01"
      />

      <OptionSelectField
        label="Tipo"
        value={tipo}
        onChange={setTipo}
        options={OPCOES_TIPO_BANCADA}
      />

      <Text style={styles.label}>Capacidade Total</Text>
      <TextInput
        style={styles.input}
        value={capacidadeTotal}
        onChangeText={setCapacidadeTotal}
        keyboardType="numeric"
      />

      <OptionSelectField
        label="Status"
        value={status}
        onChange={setStatus}
        options={OPCOES_STATUS_BANCADA}
      />

      <Text style={styles.label}>Posição X</Text>
      <TextInput
        style={styles.input}
        value={x}
        onChangeText={setX}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Posição Y</Text>
      <TextInput
        style={styles.input}
        value={y}
        onChangeText={setY}
        keyboardType="numeric"
      />

      <Button title="Cadastrar Bancada" onPress={handleCriar} />

      <Text style={styles.subtitulo}>Bancadas cadastradas</Text>

      <FlatList
        data={bancadas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.titulo}>Editar {itemEditando?.codigo}</Text>

            <OptionSelectField
              label="Tipo"
              value={editTipo}
              onChange={setEditTipo}
              options={OPCOES_TIPO_BANCADA}
            />

            <Text style={styles.label}>Capacidade</Text>
            <TextInput
              style={styles.input}
              value={editCapacidade}
              onChangeText={setEditCapacidade}
              keyboardType="numeric"
            />

            <OptionSelectField
              label="Status"
              value={editStatus}
              onChange={setEditStatus}
              options={OPCOES_STATUS_BANCADA}
            />

            <Text style={styles.label}>Posição X</Text>
            <TextInput
              style={styles.input}
              value={editX}
              onChangeText={setEditX}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Posição Y</Text>
            <TextInput
              style={styles.input}
              value={editY}
              onChangeText={setEditY}
              keyboardType="numeric"
            />

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