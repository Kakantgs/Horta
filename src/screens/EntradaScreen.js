import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from "react-native";
import { get, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";
import {
  registrarEntradaComLote,
  listarEntradas,
  validarDataISO
} from "../services/entradaService";
import { calcularResumoLotes } from "../services/saldoLoteService";
import DatePickerField from "../components/DatePickerField";
import OptionSelectField from "../components/OptionSelectField";

export default function EntradaScreen() {
  const [fornecedores, setFornecedores] = useState([]);
  const [variedades, setVariedades] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [lotes, setLotes] = useState([]);

  const [fornecedorId, setFornecedorId] = useState("");
  const [variedadeId, setVariedadeId] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [quantidadeRecebida, setQuantidadeRecebida] = useState("");
  const [unidade, setUnidade] = useState("bandeja");
  const [tipoOrigem, setTipoOrigem] = useState("muda");
  const [loteFornecedor, setLoteFornecedor] = useState("");

  const OPCOES_UNIDADE = [
    { label: "Bandeja", value: "bandeja" },
    { label: "Muda", value: "muda" },
    { label: "Unidade", value: "unidade" }
  ];

  const OPCOES_TIPO_ORIGEM = [
    { label: "Muda", value: "muda" },
    { label: "Semente", value: "semente" }
  ];

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      const fornecedoresSnapshot = await get(ref(db, "fornecedores"));
      const variedadesSnapshot = await get(ref(db, "variedades"));

      if (fornecedoresSnapshot.exists()) {
        setFornecedores(Object.values(fornecedoresSnapshot.val()));
      } else {
        setFornecedores([]);
      }

      if (variedadesSnapshot.exists()) {
        setVariedades(Object.values(variedadesSnapshot.val()));
      } else {
        setVariedades([]);
      }

      const listaEntradas = await listarEntradas();
      setEntradas(listaEntradas);

      const listaLotes = await calcularResumoLotes();
      setLotes(
        listaLotes.sort((a, b) => b.data_formacao.localeCompare(a.data_formacao))
      );
    } catch (error) {
      alert(error.message);
    }
  }

  function fornecedorSelecionado() {
    return fornecedores.find((item) => item.id === fornecedorId);
  }

  function variedadeSelecionada() {
    return variedades.find((item) => item.id === variedadeId);
  }

  async function handleRegistrar() {
    try {
      if (
        !fornecedorId ||
        !variedadeId ||
        !dataEntrada ||
        !quantidadeRecebida ||
        !unidade ||
        !tipoOrigem
      ) {
        alert("Preencha os campos obrigatórios.");
        return;
      }

      if (!validarDataISO(dataEntrada.trim())) {
        alert("A data deve estar no formato YYYY-MM-DD e ser válida.");
        return;
      }

      const resultado = await registrarEntradaComLote({
        fornecedor_id: fornecedorId,
        variedade_id: variedadeId,
        data_entrada: dataEntrada.trim(),
        quantidade_recebida: quantidadeRecebida,
        unidade,
        tipo_origem: tipoOrigem,
        lote_fornecedor: loteFornecedor
      });

      alert(
        `Entrada registrada!\n\nFornecedor: ${resultado.entrada.fornecedor_nome}\nVariedade: ${resultado.entrada.variedade_nome}\nLote gerado: ${resultado.lote.codigo_lote}\nQuantidade inicial: ${resultado.lote.quantidade_inicial}`
      );

      setFornecedorId("");
      setVariedadeId("");
      setDataEntrada("");
      setQuantidadeRecebida("");
      setUnidade("bandeja");
      setTipoOrigem("muda");
      setLoteFornecedor("");

      carregarTudo();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Entrada de Lotes</Text>

      <Text style={styles.label}>Fornecedor</Text>
      {fornecedores.length === 0 ? (
        <Text style={styles.aviso}>Nenhum fornecedor cadastrado.</Text>
      ) : (
        fornecedores.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.opcao,
              fornecedorId === item.id && styles.opcaoSelecionada
            ]}
            onPress={() => setFornecedorId(item.id)}
          >
            <Text style={styles.opcaoTitulo}>{item.nome}</Text>
            <Text style={styles.opcaoTexto}>{item.id}</Text>
          </TouchableOpacity>
        ))
      )}

      {fornecedorSelecionado() && (
        <Text style={styles.selecionado}>
          Fornecedor selecionado: {fornecedorSelecionado().nome}
        </Text>
      )}

      <Text style={styles.label}>Variedade</Text>
      {variedades.length === 0 ? (
        <Text style={styles.aviso}>Nenhuma variedade cadastrada.</Text>
      ) : (
        variedades.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.opcao,
              variedadeId === item.id && styles.opcaoSelecionada
            ]}
            onPress={() => setVariedadeId(item.id)}
          >
            <Text style={styles.opcaoTitulo}>{item.nome}</Text>
            <Text style={styles.opcaoTexto}>
              {item.id} | Categoria: {item.categoria}
            </Text>
          </TouchableOpacity>
        ))
      )}

      {variedadeSelecionada() && (
        <Text style={styles.selecionado}>
          Variedade selecionada: {variedadeSelecionada().nome}
        </Text>
      )}

      <DatePickerField
        label="Data de Entrada"
        value={dataEntrada}
        onChange={setDataEntrada}
        placeholder="Selecionar data da compra"
      />

      <Text style={styles.label}>Quantidade Recebida</Text>
      <TextInput
        style={styles.input}
        value={quantidadeRecebida}
        onChangeText={setQuantidadeRecebida}
        keyboardType="numeric"
        placeholder="20"
      />

      <OptionSelectField
        label="Unidade"
        value={unidade}
        onChange={setUnidade}
        options={OPCOES_UNIDADE}
      />

      <OptionSelectField
        label="Tipo de Origem"
        value={tipoOrigem}
        onChange={setTipoOrigem}
        options={OPCOES_TIPO_ORIGEM}
      />

      <Text style={styles.label}>Lote do Fornecedor</Text>
      <TextInput
        style={styles.input}
        value={loteFornecedor}
        onChangeText={setLoteFornecedor}
        placeholder="Opcional"
      />

      <Button title="Registrar Entrada e Gerar Lote" onPress={handleRegistrar} />

      <Text style={styles.subtitulo}>Lotes gerados</Text>
      {lotes.map((item) => (
        <View key={item.id} style={styles.cardDestaque}>
          <Text style={styles.cardTitulo}>{item.codigo_lote}</Text>
          <Text>Variedade: {item.variedade_nome}</Text>
          <Text>Data: {item.data_formacao}</Text>
          <Text>Total em produção: {item.total_em_producao}</Text>
          <Text>Saldo disponível para ocupar: {item.saldo_disponivel_para_ocupar}</Text>
          <Text>Total alocado em bancadas: {item.total_alocado_em_bancadas}</Text>
          <Text>Tipo do lote: {item.tipo_lote}</Text>
          <Text>Status: {item.status}</Text>
          <Text>Pronto para sublote: {item.preparado_para_sublote ? "Sim" : "Não"}</Text>
        </View>
      ))}

      <Text style={styles.subtitulo}>Entradas registradas</Text>
      {entradas.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitulo}>{item.id}</Text>
          <Text>Fornecedor: {item.fornecedor_nome}</Text>
          <Text>Variedade: {item.variedade_nome}</Text>
          <Text>Data: {item.data_entrada}</Text>
          <Text>Quantidade recebida: {item.quantidade_recebida}</Text>
          <Text>Unidade: {item.unidade}</Text>
          <Text>Tipo origem: {item.tipo_origem}</Text>
          <Text>Lote fornecedor: {item.lote_fornecedor || "-"}</Text>
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
  aviso: {
    color: "#666",
    marginBottom: 8
  },
  selecionado: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "bold"
  },
  opcao: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  opcaoSelecionada: {
    borderColor: "#2e86de",
    backgroundColor: "#eaf3ff"
  },
  opcaoTitulo: {
    fontWeight: "bold"
  },
  opcaoTexto: {
    fontSize: 12,
    color: "#555"
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
  cardDestaque: {
    borderWidth: 1,
    borderColor: "#7fb3d5",
    backgroundColor: "#eef7fc",
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