import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView
} from "react-native";

import CadastroSetoresScreen from "./CadastroSetoresScreen";
import CadastroBancadasScreen from "./CadastroBancadasScreen";
import MonitoramentoSetoresScreen from "./MonitoramentoSetoresScreen";
import OcorrenciasSetoresScreen from "./OcorrenciasSetoresScreen";
import CadastroFornecedoresScreen from "./CadastroFornecedoresScreen";
import CadastroClientesScreen from "./CadastroClientesScreen";
import CadastroVariedadesScreen from "./CadastroVariedadesScreen";
import DadosUnidadeScreen from "./DadosUnidadeScreen";
import EtiquetasScreen from "./EtiquetasScreen";

export default function AjustesScreen() {
  const [telaAtual, setTelaAtual] = useState("menu");

  if (telaAtual === "setores") {
    return <CadastroSetoresScreen onVoltar={() => setTelaAtual("menu")} />;
  }

  if (telaAtual === "bancadas") {
    return <CadastroBancadasScreen onVoltar={() => setTelaAtual("menu")} />;
  }

  if (telaAtual === "monitoramento_setor") {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <Button title="Voltar" onPress={() => setTelaAtual("menu")} />
        </View>
        <MonitoramentoSetoresScreen />
      </View>
    );
  }

  if (telaAtual === "ocorrencias_setor") {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <Button title="Voltar" onPress={() => setTelaAtual("menu")} />
        </View>
        <OcorrenciasSetoresScreen />
      </View>
    );
  }

  if (telaAtual === "fornecedores") {
    return <CadastroFornecedoresScreen onVoltar={() => setTelaAtual("menu")} />;
  }

  if (telaAtual === "clientes") {
    return <CadastroClientesScreen onVoltar={() => setTelaAtual("menu")} />;
  }

  if (telaAtual === "variedades") {
    return <CadastroVariedadesScreen onVoltar={() => setTelaAtual("menu")} />;
  }

  if (telaAtual === "dados_unidade") {
    return <DadosUnidadeScreen onVoltar={() => setTelaAtual("menu")} />;
  }

  if (telaAtual === "etiquetas") {
    return <EtiquetasScreen onVoltar={() => setTelaAtual("menu")} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Ajustes do Sistema</Text>
      <Text style={styles.subtitulo}>
        Cadastros e operações administrativas
      </Text>

      <View style={styles.bloco}>
        <Text style={styles.blocoTitulo}>Estrutura</Text>

        <View style={styles.botao}>
          <Button
            title="CRUD de Setores"
            onPress={() => setTelaAtual("setores")}
          />
        </View>

        <View style={styles.botao}>
          <Button
            title="CRUD de Bancadas"
            onPress={() => setTelaAtual("bancadas")}
          />
        </View>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.blocoTitulo}>Operação por Setor</Text>

        <View style={styles.botao}>
          <Button
            title="Monitoramento por Setor"
            onPress={() => setTelaAtual("monitoramento_setor")}
          />
        </View>

        <View style={styles.botao}>
          <Button
            title="Ocorrências por Setor"
            onPress={() => setTelaAtual("ocorrencias_setor")}
          />
        </View>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.blocoTitulo}>Cadastros Base</Text>

        <View style={styles.botao}>
          <Button
            title="Fornecedores"
            onPress={() => setTelaAtual("fornecedores")}
          />
        </View>

        <View style={styles.botao}>
          <Button
            title="Clientes"
            onPress={() => setTelaAtual("clientes")}
          />
        </View>

        <View style={styles.botao}>
          <Button
            title="Variedades"
            onPress={() => setTelaAtual("variedades")}
          />
        </View>

        <View style={styles.botao}>
          <Button
            title="Dados da Unidade"
            onPress={() => setTelaAtual("dados_unidade")}
          />
        </View>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.blocoTitulo}>Rastreabilidade</Text>

        <View style={styles.botao}>
          <Button
            title="Etiquetas Térmicas"
            onPress={() => setTelaAtual("etiquetas")}
          />
        </View>
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
    marginBottom: 8
  },
  subtitulo: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20
  },
  bloco: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16
  },
  blocoTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12
  },
  botao: {
    marginBottom: 10
  }
});