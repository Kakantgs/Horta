import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  ScrollView
} from "react-native";
import { listarSetores } from "../services/setorService";
import {
  registrarMonitoramentoSetor,
  listarMonitoramentosSetor
} from "../services/setorMonitoramentoService";
import SelectCardList from "../components/SelectCardList";
import DateTimePickerField from "../components/DateTimePickerField";

export default function MonitoramentoSetoresScreen() {
  const [setores, setSetores] = useState([]);
  const [monitoramentos, setMonitoramentos] = useState([]);

  const [setorId, setSetorId] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [ph, setPh] = useState("");
  const [ce, setCe] = useState("");
  const [temperaturaAgua, setTemperaturaAgua] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [responsavel, setResponsavel] = useState("");

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      const [listaSetores, listaMonitoramentos] = await Promise.all([
        listarSetores(),
        listarMonitoramentosSetor()
      ]);

      setSetores(listaSetores.filter((item) => item.ativo));
      setMonitoramentos(listaMonitoramentos);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleRegistrar() {
    try {
      if (!setorId || !dataHora || ph === "" || ce === "") {
        alert("Preencha setor, data/hora, pH e CE.");
        return;
      }

      await registrarMonitoramentoSetor({
        setor_id: setorId,
        data_hora: dataHora,
        ph,
        ce,
        temperatura_agua: temperaturaAgua,
        observacoes,
        responsavel
      });

      alert("Monitoramento do setor registrado com sucesso!");

      setSetorId("");
      setDataHora("");
      setPh("");
      setCe("");
      setTemperaturaAgua("");
      setObservacoes("");
      setResponsavel("");

      carregarTudo();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Monitoramento por Setor</Text>

      <SelectCardList
        title="Selecionar setor"
        items={setores}
        selectedId={setorId}
        onSelect={setSetorId}
        emptyMessage="Nenhum setor ativo cadastrado."
        getTitle={(item) => `${item.codigo} - ${item.nome}`}
        getSubtitle={(item) => item.descricao || "Sem descrição"}
      />

      <DateTimePickerField
        label="Data e hora"
        value={dataHora}
        onChange={setDataHora}
        placeholder="Selecionar data e hora"
      />

      <Text style={styles.label}>pH</Text>
      <TextInput
        style={styles.input}
        value={ph}
        onChangeText={setPh}
        keyboardType="numeric"
        placeholder="5.8"
      />

      <Text style={styles.label}>CE</Text>
      <TextInput
        style={styles.input}
        value={ce}
        onChangeText={setCe}
        keyboardType="numeric"
        placeholder="1.4"
      />

      <Text style={styles.label}>Temperatura da água</Text>
      <TextInput
        style={styles.input}
        value={temperaturaAgua}
        onChangeText={setTemperaturaAgua}
        keyboardType="numeric"
        placeholder="22.5"
      />

      <Text style={styles.label}>Observações</Text>
      <TextInput
        style={styles.input}
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Opcional"
      />

      <Text style={styles.label}>Responsável</Text>
      <TextInput
        style={styles.input}
        value={responsavel}
        onChangeText={setResponsavel}
        placeholder="Opcional"
      />

      <Button title="Registrar monitoramento" onPress={handleRegistrar} />

      <Text style={styles.subtitulo}>Histórico</Text>
      {monitoramentos.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitulo}>
            {item.setor_codigo} - {item.setor_nome}
          </Text>
          <Text>Data/hora: {item.data_hora}</Text>
          <Text>pH: {item.ph}</Text>
          <Text>CE: {item.ce}</Text>
          <Text>Temperatura: {item.temperatura_agua ?? "-"}</Text>
          <Text>Observações: {item.observacoes || "-"}</Text>
          <Text>Responsável: {item.responsavel || "-"}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6
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
  }
});