import { useEffect, useState } from "react";
import {
    Button,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import DateTimePickerField from "../components/DateTimePickerField";
import OptionSelectField from "../components/OptionSelectField";
import SelectCardList from "../components/SelectCardList";
import {
    listarOcorrenciasSetor,
    registrarOcorrenciaSetor,
    resolverOcorrenciaSetor
} from "../services/setorOcorrenciaService";
import { listarSetores } from "../services/setorService";

export default function OcorrenciasSetoresScreen() {
  const [setores, setSetores] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);

  const [setorId, setSetorId] = useState("");
  const [tipoOcorrencia, setTipoOcorrencia] = useState("falha_bomba");
  const [descricao, setDescricao] = useState("");
  const [acaoCorretiva, setAcaoCorretiva] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [status, setStatus] = useState("aberta");

  const OPCOES_TIPO = [
    { label: "Falha de bomba", value: "falha_bomba" },
    { label: "pH fora do padrão", value: "ph_fora_padrao" },
    { label: "CE fora do padrão", value: "ce_fora_padrao" },
    { label: "Falta de energia", value: "falta_energia" },
    { label: "Vazamento", value: "vazamento" },
    { label: "Outro", value: "outro" }
  ];

  const OPCOES_STATUS = [
    { label: "Aberta", value: "aberta" },
    { label: "Resolvida", value: "resolvida" }
  ];

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      const [listaSetores, listaOcorrencias] = await Promise.all([
        listarSetores(),
        listarOcorrenciasSetor()
      ]);

      setSetores(listaSetores.filter((item) => item.ativo));
      setOcorrencias(listaOcorrencias);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleRegistrar() {
    try {
      if (!setorId || !tipoOcorrencia || !descricao || !dataHora) {
        alert("Preencha setor, tipo, descrição e data/hora.");
        return;
      }

      await registrarOcorrenciaSetor({
        setor_id: setorId,
        tipo_ocorrencia: tipoOcorrencia,
        descricao,
        acao_corretiva: acaoCorretiva,
        data_hora: dataHora,
        status
      });

      alert("Ocorrência do setor registrada com sucesso!");

      setSetorId("");
      setTipoOcorrencia("falha_bomba");
      setDescricao("");
      setAcaoCorretiva("");
      setDataHora("");
      setStatus("aberta");

      carregarTudo();
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleResolver(id) {
    try {
      await resolverOcorrenciaSetor(id);
      alert("Ocorrência marcada como resolvida!");
      carregarTudo();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Ocorrências por Setor</Text>

      <SelectCardList
        title="Selecionar setor"
        items={setores}
        selectedId={setorId}
        onSelect={setSetorId}
        emptyMessage="Nenhum setor ativo cadastrado."
        getTitle={(item) => `${item.codigo} - ${item.nome}`}
        getSubtitle={(item) => item.descricao || "Sem descrição"}
      />

      <OptionSelectField
        label="Tipo da ocorrência"
        value={tipoOcorrencia}
        onChange={setTipoOcorrencia}
        options={OPCOES_TIPO}
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={styles.input}
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Descreva a ocorrência"
      />

      <Text style={styles.label}>Ação corretiva</Text>
      <TextInput
        style={styles.input}
        value={acaoCorretiva}
        onChangeText={setAcaoCorretiva}
        placeholder="Opcional"
      />

      <DateTimePickerField
        label="Data e hora"
        value={dataHora}
        onChange={setDataHora}
        placeholder="Selecionar data e hora"
      />

      <OptionSelectField
        label="Status"
        value={status}
        onChange={setStatus}
        options={OPCOES_STATUS}
      />

      <Button title="Registrar ocorrência" onPress={handleRegistrar} />

      <Text style={styles.subtitulo}>Histórico</Text>
      {ocorrencias.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitulo}>
            {item.setor_codigo} - {item.setor_nome}
          </Text>
          <Text>Tipo: {item.tipo_ocorrencia}</Text>
          <Text>Descrição: {item.descricao}</Text>
          <Text>Ação corretiva: {item.acao_corretiva || "-"}</Text>
          <Text>Data/hora: {item.data_hora}</Text>
          <Text>Status: {item.status}</Text>

          {item.status !== "resolvida" && (
            <View style={{ marginTop: 8 }}>
              <Button
                title="Marcar como resolvida"
                onPress={() => handleResolver(item.id)}
              />
            </View>
          )}
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