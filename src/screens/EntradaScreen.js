import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal
} from "react-native";
import { get, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";
import {
  registrarEntradaComLote,
  listarEntradas,
  validarDataISO
} from "../services/entradaService";
import { calcularResumoLotes } from "../services/saldoLoteService";
import { listarBancadas } from "../services/bancadaService";
import { registrarOcupacaoBancada } from "../services/ocupacaoService";
import {
  calcularDiasDesdeEntrada,
  obterStatusVisualLote
} from "../services/statusLoteService";
import DatePickerField from "../components/DatePickerField";
import OptionSelectField from "../components/OptionSelectField";
import SelectCardList from "../components/SelectCardList";

export default function EntradaScreen() {
  const [fornecedores, setFornecedores] = useState([]);
  const [variedades, setVariedades] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [bancadas, setBancadas] = useState([]);

  const [fornecedorId, setFornecedorId] = useState("");
  const [variedadeId, setVariedadeId] = useState("");
  const [dataEntrada, setDataEntrada] = useState("");
  const [quantidadeRecebida, setQuantidadeRecebida] = useState("");
  const [unidade, setUnidade] = useState("bandeja");
  const [tipoOrigem, setTipoOrigem] = useState("muda");
  const [loteFornecedor, setLoteFornecedor] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [modalOcupacaoVisible, setModalOcupacaoVisible] = useState(false);
  const [novoLoteCriado, setNovoLoteCriado] = useState(null);
  const [bancadaSelecionadaId, setBancadaSelecionadaId] = useState("");
  const [posicaoInicial, setPosicaoInicial] = useState("1");
  const [posicaoFinal, setPosicaoFinal] = useState("");
  const [quantidadeAlocada, setQuantidadeAlocada] = useState("");
  const [dataInicioOcupacao, setDataInicioOcupacao] = useState("");

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
      const [
        fornecedoresSnapshot,
        variedadesSnapshot,
        listaLotes,
        listaEntradas,
        listaBancadas
      ] = await Promise.all([
        get(ref(db, "fornecedores")),
        get(ref(db, "variedades")),
        calcularResumoLotes(),
        listarEntradas(),
        listarBancadas()
      ]);

      setFornecedores(
        fornecedoresSnapshot.exists() ? Object.values(fornecedoresSnapshot.val()) : []
      );

      setVariedades(
        variedadesSnapshot.exists() ? Object.values(variedadesSnapshot.val()) : []
      );

      setEntradas(listaEntradas);
      setLotes(
        listaLotes.sort((a, b) => b.data_formacao.localeCompare(a.data_formacao))
      );
      setBancadas(listaBancadas.filter((item) => item.active !== false));
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

  const bancadaSelecionada = useMemo(
    () => bancadas.find((item) => item.id === bancadaSelecionadaId) || null,
    [bancadas, bancadaSelecionadaId]
  );

  function tipoOcupacaoDaBancada() {
    if (!bancadaSelecionada) return "";
    return bancadaSelecionada.tipo === "bercario" ? "bercario" : "entrada_direta_final";
  }

  useEffect(() => {
    if (!novoLoteCriado) return;

    setQuantidadeAlocada(String(novoLoteCriado.quantidade_inicial || ""));
    setDataInicioOcupacao(dataEntrada || "");
  }, [novoLoteCriado, dataEntrada]);

  useEffect(() => {
    if (!bancadaSelecionada || !quantidadeAlocada) return;

    const qtd = Number(quantidadeAlocada);
    if (qtd > 0) {
      setPosicaoInicial("1");
      setPosicaoFinal(String(qtd));
    }
  }, [bancadaSelecionada, quantidadeAlocada]);

  function obterStatusVisualEntrada(lote) {
    const diasEntrada = calcularDiasDesdeEntrada(lote.data_formacao);

    return obterStatusVisualLote({
      lote,
      bancadaTipo: lote.total_alocado_em_bancadas > 0 ? "bercario" : "",
      diasDesdeEntrada: diasEntrada,
      diasNaOcupacao: diasEntrada,
      temColheita: false
    });
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
        lote_fornecedor: loteFornecedor,
        observacoes
      });

      alert(
        `Entrada registrada!\n\nFornecedor: ${resultado.entrada.fornecedor_nome}\nVariedade: ${resultado.entrada.variedade_nome}\nLote gerado: ${resultado.lote.codigo_lote}\nQuantidade inicial: ${resultado.lote.quantidade_inicial}`
      );

      setNovoLoteCriado(resultado.lote);
      setBancadaSelecionadaId("");
      setPosicaoInicial("1");
      setPosicaoFinal(String(resultado.lote.quantidade_inicial || ""));
      setQuantidadeAlocada(String(resultado.lote.quantidade_inicial || ""));
      setDataInicioOcupacao(resultado.lote.data_formacao || "");

      setFornecedorId("");
      setVariedadeId("");
      setQuantidadeRecebida("");
      setUnidade("bandeja");
      setTipoOrigem("muda");
      setLoteFornecedor("");
      setObservacoes("");

      await carregarTudo();
      setModalOcupacaoVisible(true);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleOcuparAgora() {
    try {
      if (!novoLoteCriado) {
        alert("Nenhum lote recém-criado encontrado.");
        return;
      }

      if (
        !bancadaSelecionadaId ||
        !posicaoInicial ||
        !posicaoFinal ||
        !quantidadeAlocada ||
        !dataInicioOcupacao
      ) {
        alert("Preencha os dados da ocupação.");
        return;
      }

      if (!validarDataISO(dataInicioOcupacao.trim())) {
        alert("A data da ocupação deve estar no formato YYYY-MM-DD e ser válida.");
        return;
      }

      await registrarOcupacaoBancada({
        lote_producao_id: novoLoteCriado.id,
        bancada_id: bancadaSelecionadaId,
        posicao_inicial: posicaoInicial,
        posicao_final: posicaoFinal,
        quantidade_alocada: quantidadeAlocada,
        data_inicio: dataInicioOcupacao.trim(),
        tipo_ocupacao: tipoOcupacaoDaBancada()
      });

      alert("Lote ocupado com sucesso!");

      setModalOcupacaoVisible(false);
      setNovoLoteCriado(null);
      setBancadaSelecionadaId("");
      setPosicaoInicial("1");
      setPosicaoFinal("");
      setQuantidadeAlocada("");
      setDataInicioOcupacao("");

      await carregarTudo();
    } catch (error) {
      alert(error.message);
    }
  }

  function fecharModalSemOcupar() {
    setModalOcupacaoVisible(false);
    setNovoLoteCriado(null);
    setBancadaSelecionadaId("");
    setPosicaoInicial("1");
    setPosicaoFinal("");
    setQuantidadeAlocada("");
    setDataInicioOcupacao("");
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

      <Text style={styles.label}>Observações</Text>
      <TextInput
        style={styles.input}
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Opcional"
      />

      <Button title="Registrar Entrada e Gerar Lote" onPress={handleRegistrar} />

      <Text style={styles.subtitulo}>Lotes gerados</Text>
      {lotes.map((item) => (
        <View key={item.id} style={styles.cardDestaque}>
          <Text style={styles.cardTitulo}>{item.codigo_lote}</Text>
          <Text>Variedade: {item.variedade_nome}</Text>
          <Text>Data: {item.data_formacao}</Text>
          <Text>Quantidade inicial: {item.quantidade_inicial}</Text>
          <Text>Saldo disponível para ocupar: {item.saldo_disponivel_para_ocupar}</Text>
          <Text>Total alocado em bancadas: {item.total_alocado_em_bancadas}</Text>
          <Text>Total em produção: {item.total_em_producao}</Text>
          <Text>Tipo do lote: {item.tipo_lote}</Text>
          <Text>Status do banco: {item.status}</Text>
          <Text>Status visual: {obterStatusVisualEntrada(item)}</Text>
          <Text>Dias desde a entrada: {calcularDiasDesdeEntrada(item.data_formacao)}</Text>
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
          <Text>Obs.: {item.observacoes || "-"}</Text>
        </View>
      ))}

      <Modal visible={modalOcupacaoVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.modal}>
              <Text style={styles.tituloModal}>Ocupar lote agora?</Text>

              <Text style={styles.modalTexto}>
                Lote: {novoLoteCriado?.codigo_lote || "-"}
              </Text>
              <Text style={styles.modalTexto}>
                Variedade: {novoLoteCriado?.variedade_nome || "-"}
              </Text>
              <Text style={styles.modalTexto}>
                Quantidade inicial: {novoLoteCriado?.quantidade_inicial || "-"}
              </Text>

              <SelectCardList
                title="Escolha a bancada"
                items={bancadas}
                selectedId={bancadaSelecionadaId}
                onSelect={setBancadaSelecionadaId}
                emptyMessage="Nenhuma bancada cadastrada."
                getTitle={(item) => item.codigo}
                getSubtitle={(item) =>
                  `${item.tipo} | Capacidade: ${item.capacidade_total} | Status: ${item.status}`
                }
              />

              {bancadaSelecionada ? (
                <Text style={styles.selecionado}>
                  Tipo de ocupação:{" "}
                  {bancadaSelecionada.tipo === "bercario"
                    ? "bercario"
                    : "entrada_direta_final"}
                </Text>
              ) : null}

              <Text style={styles.label}>Quantidade alocada</Text>
              <TextInput
                style={styles.input}
                value={quantidadeAlocada}
                onChangeText={setQuantidadeAlocada}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Posição inicial</Text>
              <TextInput
                style={styles.input}
                value={posicaoInicial}
                onChangeText={setPosicaoInicial}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Posição final</Text>
              <TextInput
                style={styles.input}
                value={posicaoFinal}
                onChangeText={setPosicaoFinal}
                keyboardType="numeric"
              />

              <DatePickerField
                label="Data de início"
                value={dataInicioOcupacao}
                onChange={setDataInicioOcupacao}
                placeholder="Selecionar data"
              />

              <Button title="Ocupar agora" onPress={handleOcuparAgora} />
              <View style={{ height: 10 }} />
              <Button title="Deixar para depois" onPress={fecharModalSemOcupar} />
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  tituloModal: {
    fontSize: 20,
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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20
  },
  modalTexto: {
    marginBottom: 4
  }
});