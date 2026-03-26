import React, { useEffect, useMemo, useState } from "react";
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
  criarBancada,
  criarMultiplasBancadas,
  listarBancadas,
  atualizarBancada,
  excluirBancada,
  inativarBancada,
  reativarBancada
} from "../services/bancadaService";
import { listarSetores } from "../services/setorService";
import OptionSelectField from "../components/OptionSelectField";
import SelectCardList from "../components/SelectCardList";

export default function CadastroBancadasScreen({ onVoltar }) {
  const [setores, setSetores] = useState([]);
  const [setorId, setSetorId] = useState("");
  const [tipo, setTipo] = useState("bercario");
  const [capacidadeTotal, setCapacidadeTotal] = useState("");
  const [status, setStatus] = useState("vazia");
  const [x, setX] = useState("");
  const [y, setY] = useState("");

  const [modoLote, setModoLote] = useState(false);
  const [quantidadeLote, setQuantidadeLote] = useState("1");
  const [eixoIncremento, setEixoIncremento] = useState("x");

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

  const OPCOES_EIXO = [
    { label: "Incrementar no X", value: "x" },
    { label: "Incrementar no Y", value: "y" }
  ];

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const [listaBancadas, listaSetores] = await Promise.all([
        listarBancadas(),
        listarSetores()
      ]);

      setBancadas(listaBancadas);
      setSetores(listaSetores.filter((item) => item.ativo));
    } catch (error) {
      alert(error.message);
    }
  }

  const setorSelecionado = useMemo(
    () => setores.find((item) => item.id === setorId) || null,
    [setores, setorId]
  );

  async function handleCriar() {
    try {
      if (!setorId || !tipo || !capacidadeTotal || x === "" || y === "") {
        alert("Preencha os campos obrigatórios.");
        return;
      }

      if (modoLote) {
        const criadas = await criarMultiplasBancadas({
          setor_id: setorId,
          tipo,
          capacidade_total: capacidadeTotal,
          status,
          quantidade: quantidadeLote,
          x_inicial: x,
          y_inicial: y,
          eixo_incremento: eixoIncremento
        });

        alert(`${criadas.length} bancadas criadas com sucesso!`);
      } else {
        const bancada = await criarBancada({
          setor_id: setorId,
          tipo,
          capacidade_total: capacidadeTotal,
          status,
          x,
          y
        });

        alert(`Bancada ${bancada.codigo} cadastrada com sucesso!`);
      }

      setSetorId("");
      setTipo("bercario");
      setCapacidadeTotal("");
      setStatus("vazia");
      setX("");
      setY("");
      setModoLote(false);
      setQuantidadeLote("1");
      setEixoIncremento("x");

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

  async function handleInativar(id) {
    try {
      await inativarBancada(id);
      alert("Bancada inativada com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleReativar(id) {
    try {
      await reativarBancada(id);
      alert("Bancada reativada com sucesso!");
      carregar();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
    >
      <Button title="Voltar" onPress={onVoltar} />

      <Text style={styles.titulo}>CRUD de Bancadas</Text>

      <SelectCardList
        title="Selecionar setor"
        items={setores}
        selectedId={setorId}
        onSelect={setSetorId}
        emptyMessage="Nenhum setor ativo cadastrado."
        getTitle={(item) => `${item.codigo} - ${item.nome}`}
        getSubtitle={(item) => `Contador atual: ${item.contador_bancadas || 0}`}
      />

      {setorSelecionado && (
        <Text style={styles.selecionado}>
          Próxima bancada do setor {setorSelecionado.codigo}:{" "}
          {setorSelecionado.codigo}
          {Number(setorSelecionado.contador_bancadas || 0) + 1}
        </Text>
      )}

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

      <Text style={styles.label}>Posição X inicial</Text>
      <TextInput
        style={styles.input}
        value={x}
        onChangeText={setX}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Posição Y inicial</Text>
      <TextInput
        style={styles.input}
        value={y}
        onChangeText={setY}
        keyboardType="numeric"
      />

      <View style={styles.linhaModo}>
        <View style={styles.botaoModo}>
          <Button
            title={modoLote ? "Modo: várias bancadas" : "Modo: 1 bancada"}
            onPress={() => setModoLote(!modoLote)}
          />
        </View>
      </View>

      {modoLote && (
        <>
          <Text style={styles.label}>Quantidade de bancadas</Text>
          <TextInput
            style={styles.input}
            value={quantidadeLote}
            onChangeText={setQuantidadeLote}
            keyboardType="numeric"
          />

          <OptionSelectField
            label="Eixo de incremento"
            value={eixoIncremento}
            onChange={setEixoIncremento}
            options={OPCOES_EIXO}
          />
        </>
      )}

      <Button
        title={modoLote ? "Criar bancadas em lote" : "Cadastrar bancada"}
        onPress={handleCriar}
      />

      <Text style={styles.subtitulo}>Bancadas cadastradas</Text>

      {bancadas.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitulo}>{item.codigo}</Text>
          <Text>Setor: {item.setor_codigo}</Text>
          <Text>Tipo: {item.tipo}</Text>
          <Text>Capacidade: {item.capacidade_total}</Text>
          <Text>Status: {item.status}</Text>
          <Text>
            Posição: ({item.x}, {item.y})
          </Text>
          <Text>Ativa: {item.active === false ? "Não" : "Sim"}</Text>

          <View style={styles.linha}>
            <View style={styles.botao}>
              <Button title="Editar" onPress={() => abrirEdicao(item)} />
            </View>

            {item.active === false ? (
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
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  container: {
    padding: 16,
    paddingBottom: 40
  },
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
    marginTop: 10
  },
  botao: {
    marginRight: 10
  },
  linhaModo: {
    marginVertical: 10
  },
  botaoModo: {
    marginBottom: 8
  },
  selecionado: {
    marginTop: 4,
    marginBottom: 10,
    fontWeight: "bold"
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
  }
});