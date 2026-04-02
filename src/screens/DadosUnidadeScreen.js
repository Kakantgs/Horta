import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Button,
  View
} from "react-native";
import {
  obterDadosUnidade,
  salvarDadosUnidade
} from "../services/unitDataService";

export default function DadosUnidadeScreen({ onVoltar }) {
  const [nomeUnidade, setNomeUnidade] = useState("");
  const [produtorNome, setProdutorNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [origemPadrao, setOrigemPadrao] = useState("");
  const [localProducaoPadrao, setLocalProducaoPadrao] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [site, setSite] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const dados = await obterDadosUnidade();

      setNomeUnidade(dados.nome_unidade || "");
      setProdutorNome(dados.produtor_nome || "");
      setCnpj(dados.cnpj || "");
      setOrigemPadrao(dados.origem_padrao || "");
      setLocalProducaoPadrao(dados.local_producao_padrao || "");
      setTelefone(dados.telefone || "");
      setEmail(dados.email || "");
      setSite(dados.site || "");
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleSalvar() {
    try {
      setSalvando(true);

      await salvarDadosUnidade({
        nome_unidade: nomeUnidade,
        produtor_nome: produtorNome,
        cnpj,
        
        local_producao_padrao: localProducaoPadrao,
        telefone,
        email,
        site
      });

      alert("Dados da unidade salvos com sucesso!");
    } catch (error) {
      alert(error.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {onVoltar ? <Button title="Voltar" onPress={onVoltar} /> : null}

      <Text style={styles.titulo}>Dados da Unidade</Text>

      <Text style={styles.label}>Nome da unidade</Text>
      <TextInput
        style={styles.input}
        value={nomeUnidade}
        onChangeText={setNomeUnidade}
        placeholder="Ex: Horta Smarsi"
      />

      <Text style={styles.label}>Produtor</Text>
      <TextInput
        style={styles.input}
        value={produtorNome}
        onChangeText={setProdutorNome}
        placeholder="Ex: Kauã Smarsi"
      />

      <Text style={styles.label}>CNPJ</Text>
      <TextInput
        style={styles.input}
        value={cnpj}
        onChangeText={setCnpj}
        placeholder="00.000.000/0001-00"
      />

      

      <Text style={styles.label}>Local da produção padrão</Text>
      <TextInput
        style={styles.input}
        value={localProducaoPadrao}
        onChangeText={setLocalProducaoPadrao}
        placeholder="Ex: Estufa 1"
      />

      <Text style={styles.label}>Telefone</Text>
      <TextInput
        style={styles.input}
        value={telefone}
        onChangeText={setTelefone}
        placeholder="Opcional"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Opcional"
      />

      <Text style={styles.label}>Site</Text>
      <TextInput
        style={styles.input}
        value={site}
        onChangeText={setSite}
        placeholder="Opcional"
      />

      <View style={{ marginTop: 10 }}>
        <Button
          title={salvando ? "Salvando..." : "Salvar dados da unidade"}
          onPress={handleSalvar}
          disabled={salvando}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16
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
  }
});