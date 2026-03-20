import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Button,
  TextInput,
  Switch
} from "react-native";
import { get, ref } from "firebase/database";
import { db } from "../config/firebaseConfig";
import {
  listarOcupacoesAtivasPorBancada,
  registrarOcupacaoBancada,
  encerrarOcupacaoBancada,
  transplantarParaOutraBancada
} from "../services/ocupacaoService";
import { validarDataISO } from "../services/entradaService";
import {
  registrarMonitoramento,
  listarMonitoramentosPorBancada
} from "../services/monitoramentoService";
import {
  registrarOcorrencia,
  listarOcorrenciasPorOcupacao,
  resolverOcorrencia
} from "../services/ocorrenciaService";
import {
  colherOcupacao,
  listarColheitasPorOcupacao
} from "../services/colheitaService";
import {
  calcularResumoCapacidade,
  sugerirProximaFaixaLivre
} from "../services/faixaBancadaService";
import { calcularResumoLotes } from "../services/saldoLoteService";
import DatePickerField from "../components/DatePickerField";
import DateTimePickerField from "../components/DateTimePickerField";
import OptionSelectField from "../components/OptionSelectField";
import SelectCardList from "../components/SelectCardList";
import BancadaFaixaBar from "../components/BancadaFaixaBar";

export default function DashboardScreen() {
  const [bancadas, setBancadas] = useState([]);
  const [lotesAtivos, setLotesAtivos] = useState([]);
  const [bancadaSelecionada, setBancadaSelecionada] = useState(null);

  const [ocupacoesAtivasBancada, setOcupacoesAtivasBancada] = useState([]);
  const [ocupacaoSelecionadaId, setOcupacaoSelecionadaId] = useState("");

  const [monitoramentos, setMonitoramentos] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [colheitas, setColheitas] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);

  const [loteSelecionadoId, setLoteSelecionadoId] = useState("");
  const [posicaoInicial, setPosicaoInicial] = useState("");
  const [posicaoFinal, setPosicaoFinal] = useState("");
  const [quantidadeAlocada, setQuantidadeAlocada] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [tipoOcupacao, setTipoOcupacao] = useState("bercario");

  const [dataHoraMonitoramento, setDataHoraMonitoramento] = useState("");
  const [ph, setPh] = useState("");
  const [ce, setCe] = useState("");
  const [temperaturaAgua, setTemperaturaAgua] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [bancadaDestinoId, setBancadaDestinoId] = useState("");
  const [buscaBancadaDestino, setBuscaBancadaDestino] = useState("");
  const [quantidadeTransplantada, setQuantidadeTransplantada] = useState("");
  const [dataTransplante, setDataTransplante] = useState("");
  const [posicaoInicialDestino, setPosicaoInicialDestino] = useState("");
  const [posicaoFinalDestino, setPosicaoFinalDestino] = useState("");
  const [encerrarOrigem, setEncerrarOrigem] = useState(false);

  const [tipoOcorrencia, setTipoOcorrencia] = useState("praga");
  const [descricaoOcorrencia, setDescricaoOcorrencia] = useState("");
  const [acaoCorretiva, setAcaoCorretiva] = useState("");
  const [dataHoraOcorrencia, setDataHoraOcorrencia] = useState("");
  const [statusOcorrencia, setStatusOcorrencia] = useState("aberta");

  const [dataColheita, setDataColheita] = useState("");
  const [quantidadeColhida, setQuantidadeColhida] = useState("");
  const [quantidadePerda, setQuantidadePerda] = useState("");
  const [tipoColheita, setTipoColheita] = useState("parcial");

  const OPCOES_TIPO_OCUPACAO = [
    { label: "Berçário", value: "bercario" },
    { label: "Transplante", value: "transplante" },
    { label: "Plantio direto", value: "plantio_direto" }
  ];

  const OPCOES_TIPO_OCORRENCIA = [
    { label: "Praga", value: "praga" },
    { label: "Doença", value: "doenca" },
    { label: "Perda", value: "perda" },
    { label: "Contaminação", value: "contaminacao" }
  ];

  const OPCOES_STATUS_OCORRENCIA = [
    { label: "Aberta", value: "aberta" },
    { label: "Resolvida", value: "resolvida" }
  ];

  const OPCOES_TIPO_COLHEITA = [
    { label: "Parcial", value: "parcial" },
    { label: "Total", value: "total" }
  ];

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    if (!bancadaSelecionada) return;

    const sugestao = sugerirProximaFaixaLivre(
      bancadaSelecionada.capacidade_total,
      ocupacoesAtivasBancada,
      quantidadeAlocada
    );

    if (sugestao) {
      setPosicaoInicial(String(sugestao.inicio));
      if (quantidadeAlocada && Number(quantidadeAlocada) > 0) {
        const qtd = Number(quantidadeAlocada);
        const fimCalculado = sugestao.inicio + qtd - 1;
        setPosicaoFinal(String(Math.min(fimCalculado, sugestao.fim)));
      } else {
        setPosicaoFinal(String(sugestao.fim));
      }
    }
  }, [quantidadeAlocada, ocupacoesAtivasBancada, bancadaSelecionada]);

  const ocupacaoSelecionada =
    ocupacoesAtivasBancada.find((item) => item.id === ocupacaoSelecionadaId) || null;

  const resumoCapacidade = useMemo(() => {
    if (!bancadaSelecionada) return null;

    return calcularResumoCapacidade(
      bancadaSelecionada.capacidade_total,
      ocupacoesAtivasBancada
    );
  }, [bancadaSelecionada, ocupacoesAtivasBancada]);

  function obterTiposDestinoPreferenciais() {
    const tipoOrigem = (bancadaSelecionada?.tipo || "").toLowerCase();

    if (tipoOrigem === "bercario") return ["engorda"];
    if (tipoOrigem === "engorda") return ["final"];
    if (tipoOrigem === "final") return [];
    return [];
  }

  function obterDescricaoFluxo() {
    const tipoOrigem = (bancadaSelecionada?.tipo || "").toLowerCase();

    if (tipoOrigem === "bercario") return "Fluxo sugerido: berçário → engorda";
    if (tipoOrigem === "engorda") return "Fluxo sugerido: engorda → final";
    if (tipoOrigem === "final") return "Bancada final: sem próxima etapa preferencial";
    return "Sem fluxo sugerido";
  }

  const tiposDestinoPreferenciais = useMemo(
    () => obterTiposDestinoPreferenciais(),
    [bancadaSelecionada]
  );

  const bancadasDestinoFiltradas = useMemo(() => {
    const termo = buscaBancadaDestino.trim().toLowerCase();

    const listaBase = bancadas
      .filter((item) => item.id !== bancadaSelecionada?.id)
      .filter((item) => {
        if (!termo) return true;

        return (
          (item.codigo || "").toLowerCase().includes(termo) ||
          (item.tipo || "").toLowerCase().includes(termo) ||
          (item.status || "").toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        const prioridadeCompatibilidade = (item) => {
          if (tiposDestinoPreferenciais.length === 0) return 0;
          return tiposDestinoPreferenciais.includes((item.tipo || "").toLowerCase()) ? 0 : 1;
        };

        const prioridadeStatus = (status) => {
          if (status === "vazia") return 0;
          if (status === "ocupada") return 1;
          if (status === "alerta") return 2;
          if (status === "manutencao") return 3;
          return 4;
        };

        const diffCompat =
          prioridadeCompatibilidade(a) - prioridadeCompatibilidade(b);

        if (diffCompat !== 0) return diffCompat;

        const diffStatus =
          prioridadeStatus((a.status || "").toLowerCase()) -
          prioridadeStatus((b.status || "").toLowerCase());

        if (diffStatus !== 0) return diffStatus;

        return (a.codigo || "").localeCompare(b.codigo || "");
      });

    if (!termo && listaBase.length > 25) {
      return listaBase.slice(0, 25);
    }

    return listaBase;
  }, [bancadas, bancadaSelecionada, buscaBancadaDestino, tiposDestinoPreferenciais]);

  function obterLotePorId(id) {
    return lotesAtivos.find((item) => item.id === id) || null;
  }

  async function carregarTudo() {
    try {
      const snapshot = await get(ref(db, "bancadas"));

      if (snapshot.exists()) {
        setBancadas(Object.values(snapshot.val()));
      } else {
        setBancadas([]);
      }

      const lotes = await calcularResumoLotes();
      setLotesAtivos(
        lotes.filter(
          (lote) =>
            lote.status === "ativo" &&
            Number(lote.saldo_disponivel_para_ocupar) > 0
        )
      );
    } catch (error) {
      alert(error.message);
    }
  }

  async function carregarDetalhesBancada(bancada) {
    const listaOcupacoes = await listarOcupacoesAtivasPorBancada(bancada.id);
    setOcupacoesAtivasBancada(listaOcupacoes);

    const proximaOcupacaoId =
      listaOcupacoes.find((item) => item.id === ocupacaoSelecionadaId)?.id ||
      (listaOcupacoes[0]?.id || "");

    setOcupacaoSelecionadaId(proximaOcupacaoId);

    const listaMonitoramentos = await listarMonitoramentosPorBancada(bancada.id);
    setMonitoramentos(listaMonitoramentos);

    if (proximaOcupacaoId) {
      const listaOcorrencias = await listarOcorrenciasPorOcupacao(proximaOcupacaoId);
      setOcorrencias(listaOcorrencias);

      const listaColheitas = await listarColheitasPorOcupacao(proximaOcupacaoId);
      setColheitas(listaColheitas);
    } else {
      setOcorrencias([]);
      setColheitas([]);
    }
  }

  async function abrirDetalhes(bancada) {
    try {
      setBancadaSelecionada(bancada);

      setLoteSelecionadoId("");
      setPosicaoInicial("");
      setPosicaoFinal("");
      setQuantidadeAlocada("");
      setDataInicio("");
      setTipoOcupacao(bancada.tipo === "bercario" ? "bercario" : "transplante");

      setDataHoraMonitoramento("");
      setPh("");
      setCe("");
      setTemperaturaAgua("");
      setObservacoes("");

      setBancadaDestinoId("");
      setBuscaBancadaDestino("");
      setQuantidadeTransplantada("");
      setDataTransplante("");
      setPosicaoInicialDestino("");
      setPosicaoFinalDestino("");
      setEncerrarOrigem(false);

      setTipoOcorrencia("praga");
      setDescricaoOcorrencia("");
      setAcaoCorretiva("");
      setDataHoraOcorrencia("");
      setStatusOcorrencia("aberta");

      setDataColheita("");
      setQuantidadeColhida("");
      setQuantidadePerda("");
      setTipoColheita("parcial");

      await carregarDetalhesBancada(bancada);
      setModalVisible(true);
    } catch (error) {
      alert(error.message);
    }
  }

  useEffect(() => {
    async function carregarDependenciasDaOcupacao() {
      if (!ocupacaoSelecionadaId) {
        setOcorrencias([]);
        setColheitas([]);
        return;
      }

      try {
        const listaOcorrencias = await listarOcorrenciasPorOcupacao(ocupacaoSelecionadaId);
        setOcorrencias(listaOcorrencias);

        const listaColheitas = await listarColheitasPorOcupacao(ocupacaoSelecionadaId);
        setColheitas(listaColheitas);
      } catch (error) {
        alert(error.message);
      }
    }

    carregarDependenciasDaOcupacao();
  }, [ocupacaoSelecionadaId]);

  function obterCorPorStatus(status, tipo) {
    const statusNormalizado = (status || "").toLowerCase();
    const tipoNormalizado = (tipo || "").toLowerCase();

    if (statusNormalizado === "ocupada") {
      if (tipoNormalizado === "bercario") return "#f4d03f";
      if (tipoNormalizado === "engorda") return "#82e0aa";
      if (tipoNormalizado === "final") return "#196f3d";
      return "#58d68d";
    }

    if (statusNormalizado === "alerta") return "#e74c3c";
    if (statusNormalizado === "manutencao") return "#f5b041";
    if (statusNormalizado === "inativa") return "#85929e";

    return "#d5d8dc";
  }

  const limitesGrade = useMemo(() => {
    if (bancadas.length === 0) {
      return { maxX: 5, maxY: 5 };
    }

    const maxX = Math.max(...bancadas.map((b) => Number(b.x || 0)));
    const maxY = Math.max(...bancadas.map((b) => Number(b.y || 0)));

    return { maxX, maxY };
  }, [bancadas]);

  function encontrarBancadaNaPosicao(x, y) {
    return bancadas.find(
      (bancada) => Number(bancada.x) === x && Number(bancada.y) === y
    );
  }

  async function handleRegistrarOcupacao() {
    try {
      if (!bancadaSelecionada) {
        alert("Nenhuma bancada selecionada.");
        return;
      }

      if (
        !loteSelecionadoId ||
        !posicaoInicial ||
        !posicaoFinal ||
        !quantidadeAlocada ||
        !dataInicio ||
        !tipoOcupacao
      ) {
        alert("Preencha os campos obrigatórios.");
        return;
      }

      if (!validarDataISO(dataInicio.trim())) {
        alert("A data deve estar no formato YYYY-MM-DD e ser válida.");
        return;
      }

      await registrarOcupacaoBancada({
        lote_producao_id: loteSelecionadoId,
        bancada_id: bancadaSelecionada.id,
        posicao_inicial: posicaoInicial,
        posicao_final: posicaoFinal,
        quantidade_alocada: quantidadeAlocada,
        data_inicio: dataInicio.trim(),
        tipo_ocupacao: tipoOcupacao
      });

      alert("Ocupação registrada com sucesso!");

      setLoteSelecionadoId("");
      setPosicaoInicial("");
      setPosicaoFinal("");
      setQuantidadeAlocada("");
      setDataInicio("");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleEncerrarOcupacao(ocupacaoId) {
    try {
      const hoje = new Date().toISOString().split("T")[0];

      await encerrarOcupacaoBancada({
        ocupacao_id: ocupacaoId,
        data_fim: hoje
      });

      alert("Ocupação encerrada com sucesso!");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleRegistrarMonitoramento() {
    try {
      if (!bancadaSelecionada) {
        alert("Nenhuma bancada selecionada.");
        return;
      }

      if (!dataHoraMonitoramento || !ph || !ce) {
        alert("Preencha data/hora, pH e CE.");
        return;
      }

      await registrarMonitoramento({
        bancada_id: bancadaSelecionada.id,
        data_hora: dataHoraMonitoramento.trim(),
        ph,
        ce,
        temperatura_agua: temperaturaAgua,
        observacoes
      });

      alert("Monitoramento registrado com sucesso!");

      setDataHoraMonitoramento("");
      setPh("");
      setCe("");
      setTemperaturaAgua("");
      setObservacoes("");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleTransplante() {
    try {
      if (!ocupacaoSelecionada) {
        alert("Selecione uma ocupação ativa para transplantar.");
        return;
      }

      if (
        !bancadaDestinoId ||
        !quantidadeTransplantada ||
        !dataTransplante ||
        !posicaoInicialDestino ||
        !posicaoFinalDestino
      ) {
        alert("Preencha todos os campos do transplante.");
        return;
      }

      if (!validarDataISO(dataTransplante.trim())) {
        alert("A data do transplante deve estar no formato YYYY-MM-DD e ser válida.");
        return;
      }

      const resultado = await transplantarParaOutraBancada({
        ocupacao_origem_id: ocupacaoSelecionada.id,
        bancada_destino_id: bancadaDestinoId,
        quantidade_transplantada: quantidadeTransplantada,
        data_transplante: dataTransplante.trim(),
        posicao_inicial_destino: posicaoInicialDestino,
        posicao_final_destino: posicaoFinalDestino,
        encerrar_ocupacao_origem: encerrarOrigem
      });

      alert(
        `Transplante realizado com sucesso!\n\nSublote criado: ${resultado.sublote.codigo_lote}\nNova ocupação: ${resultado.nova_ocupacao.id}`
      );

      setBancadaDestinoId("");
      setBuscaBancadaDestino("");
      setQuantidadeTransplantada("");
      setDataTransplante("");
      setPosicaoInicialDestino("");
      setPosicaoFinalDestino("");
      setEncerrarOrigem(false);

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleRegistrarOcorrencia() {
    try {
      if (!ocupacaoSelecionada) {
        alert("Selecione uma ocupação ativa para registrar ocorrência.");
        return;
      }

      if (!tipoOcorrencia || !descricaoOcorrencia || !dataHoraOcorrencia) {
        alert("Preencha tipo, descrição e data/hora.");
        return;
      }

      await registrarOcorrencia({
        ocupacao_bancada_id: ocupacaoSelecionada.id,
        tipo_ocorrencia: tipoOcorrencia,
        descricao: descricaoOcorrencia,
        acao_corretiva: acaoCorretiva,
        data_hora: dataHoraOcorrencia,
        status: statusOcorrencia
      });

      alert("Ocorrência registrada com sucesso!");

      setTipoOcorrencia("praga");
      setDescricaoOcorrencia("");
      setAcaoCorretiva("");
      setDataHoraOcorrencia("");
      setStatusOcorrencia("aberta");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleResolverOcorrencia(id) {
    try {
      await resolverOcorrencia(id);
      alert("Ocorrência resolvida com sucesso!");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleColher() {
    try {
      if (!ocupacaoSelecionada) {
        alert("Selecione uma ocupação ativa para colher.");
        return;
      }

      if (!dataColheita || !quantidadeColhida || !tipoColheita) {
        alert("Preencha data, quantidade colhida e tipo de colheita.");
        return;
      }

      if (!validarDataISO(dataColheita.trim())) {
        alert("A data da colheita deve estar no formato YYYY-MM-DD e ser válida.");
        return;
      }

      const resultado = await colherOcupacao({
        ocupacao_bancada_id: ocupacaoSelecionada.id,
        data_colheita: dataColheita.trim(),
        quantidade_colhida: quantidadeColhida,
        quantidade_perda: quantidadePerda || 0,
        tipo_colheita: tipoColheita
      });

      alert(
        `Colheita registrada com sucesso!\n\nColheita: ${resultado.colheita.id}\nLote comercial: ${resultado.lote_comercial.codigo_lote_comercial}`
      );

      setDataColheita("");
      setQuantidadeColhida("");
      setQuantidadePerda("");
      setTipoColheita("parcial");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      alert(error.message);
    }
  }

  function usarFaixaLivre(faixa) {
    setPosicaoInicial(String(faixa.inicio));
    setPosicaoFinal(String(faixa.fim));
  }

  function renderizarGrade() {
    const linhas = [];

    for (let y = 0; y <= limitesGrade.maxY; y++) {
      const colunas = [];

      for (let x = 0; x <= limitesGrade.maxX; x++) {
        const bancada = encontrarBancadaNaPosicao(x, y);

        colunas.push(
          <TouchableOpacity
            key={`${x}-${y}`}
            style={[
              styles.celula,
              bancada
                ? { backgroundColor: obterCorPorStatus(bancada.status, bancada.tipo) }
                : styles.celulaVazia
            ]}
            onPress={() => bancada && abrirDetalhes(bancada)}
            activeOpacity={bancada ? 0.8 : 1}
          >
            {bancada ? (
              <>
                <Text style={styles.codigo}>{bancada.codigo}</Text>
                <Text style={styles.tipo}>{bancada.tipo}</Text>
              </>
            ) : (
              <Text style={styles.livre}>Livre</Text>
            )}
          </TouchableOpacity>
        );
      }

      linhas.push(
        <View key={y} style={styles.linha}>
          {colunas}
        </View>
      );
    }

    return linhas;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Mapa da Produção</Text>
      <Text style={styles.subtitulo}>
        Controle visual das faixas ocupadas e livres da bancada.
      </Text>

      <View style={styles.legendaBox}>
        <Text style={styles.legendaTitulo}>Legenda</Text>
        <Text>Cinza: vazia</Text>
        <Text>Amarelo: berçário ocupado</Text>
        <Text>Verde claro: engorda ocupada</Text>
        <Text>Verde escuro: final ocupada</Text>
        <Text>Vermelho: alerta</Text>
      </View>

      <ScrollView horizontal>
        <ScrollView>
          <View style={styles.grade}>{renderizarGrade()}</View>
        </ScrollView>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modal}>
              <Text style={styles.modalTitulo}>Detalhes da Bancada</Text>

              <Text>Código: {bancadaSelecionada?.codigo}</Text>
              <Text>Tipo: {bancadaSelecionada?.tipo}</Text>
              <Text>Capacidade total: {bancadaSelecionada?.capacidade_total}</Text>
              <Text>Status: {bancadaSelecionada?.status}</Text>
              <Text>
                Posição: ({bancadaSelecionada?.x}, {bancadaSelecionada?.y})
              </Text>

              <Text style={styles.subsecao}>Mapa visual da bancada</Text>

              {resumoCapacidade && (
                <>
                  <BancadaFaixaBar
                    capacidadeTotal={resumoCapacidade.capacidadeTotal}
                    faixasOcupadas={resumoCapacidade.faixasOcupadas}
                  />

                  <View style={styles.legendaMiniMapa}>
                    <View style={styles.legendaItem}>
                      <View style={styles.corLivre} />
                      <Text style={styles.legendaMiniTexto}>Livre</Text>
                    </View>

                    <View style={styles.legendaItem}>
                      <View style={styles.corOcupado} />
                      <Text style={styles.legendaMiniTexto}>Ocupado</Text>
                    </View>
                  </View>
                </>
              )}

              {resumoCapacidade && (
                <>
                  <Text style={styles.subsecao}>Resumo da capacidade</Text>
                  <Text>Capacidade total: {resumoCapacidade.capacidadeTotal}</Text>
                  <Text>
                    Total ocupado: {resumoCapacidade.totalOcupado} ({resumoCapacidade.percentualOcupado}%)
                  </Text>
                  <Text>
                    Total livre: {resumoCapacidade.totalLivre} ({resumoCapacidade.percentualLivre}%)
                  </Text>

                  <Text style={styles.subsecao}>Faixas ocupadas</Text>
                  {resumoCapacidade.faixasOcupadas.length === 0 ? (
                    <Text style={styles.aviso}>Nenhuma faixa ocupada.</Text>
                  ) : (
                    resumoCapacidade.faixasOcupadas.map((faixa) => (
                      <View key={faixa.id} style={styles.cardMonitoramento}>
                        <Text style={styles.cardMonitoramentoTitulo}>Ocupação {faixa.id}</Text>
                        <Text>Lote: {faixa.lote_producao_id}</Text>
                        <Text>Faixa: {faixa.inicio} até {faixa.fim}</Text>
                        <Text>Tamanho: {faixa.tamanho}</Text>
                        <Text>Quantidade alocada: {faixa.quantidade_alocada}</Text>
                        <Text>Tipo: {faixa.tipo_ocupacao}</Text>
                      </View>
                    ))
                  )}

                  <Text style={styles.subsecao}>Faixas livres</Text>
                  {resumoCapacidade.faixasLivres.length === 0 ? (
                    <Text style={styles.aviso}>Nenhuma faixa livre.</Text>
                  ) : (
                    resumoCapacidade.faixasLivres.map((faixa, index) => (
                      <View key={`${faixa.inicio}-${faixa.fim}-${index}`} style={styles.cardLivre}>
                        <Text style={styles.cardMonitoramentoTitulo}>
                          Livre: {faixa.inicio} até {faixa.fim}
                        </Text>
                        <Text>Tamanho: {faixa.tamanho}</Text>
                        <View style={{ marginTop: 8 }}>
                          <Button
                            title="Usar esta faixa"
                            onPress={() => usarFaixaLivre(faixa)}
                          />
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}

              <Text style={styles.subsecao}>Ocupações ativas na bancada</Text>
              {ocupacoesAtivasBancada.length === 0 ? (
                <Text style={styles.aviso}>Nenhuma ocupação ativa.</Text>
              ) : (
                <>
                  <SelectCardList
                    title="Selecione uma ocupação para ações"
                    items={ocupacoesAtivasBancada}
                    selectedId={ocupacaoSelecionadaId}
                    onSelect={setOcupacaoSelecionadaId}
                    emptyMessage="Nenhuma ocupação ativa."
                    getTitle={(item) => `Ocupação ${item.id}`}
                    getSubtitle={(item) =>
                      `Lote: ${item.lote_producao_id} | Faixa: ${item.posicao_inicial}-${item.posicao_final} | Qtd: ${item.quantidade_alocada}`
                    }
                  />

                  {ocupacoesAtivasBancada.map((item) => (
                    <View key={item.id} style={styles.cardMonitoramento}>
                      <Text style={styles.cardMonitoramentoTitulo}>Ocupação {item.id}</Text>
                      <Text>Lote: {item.lote_producao_id}</Text>
                      <Text>Faixa: {item.posicao_inicial} até {item.posicao_final}</Text>
                      <Text>Quantidade: {item.quantidade_alocada}</Text>
                      <Text>Data início: {item.data_inicio}</Text>
                      <Text>Tipo: {item.tipo_ocupacao}</Text>
                      <Text>Status: {item.status}</Text>

                      <View style={{ marginTop: 8 }}>
                        <Button
                          title="Encerrar esta ocupação"
                          onPress={() => handleEncerrarOcupacao(item.id)}
                        />
                      </View>
                    </View>
                  ))}
                </>
              )}

              <Text style={styles.subsecao}>Registrar nova ocupação na bancada</Text>

              <SelectCardList
                title="Escolha um lote ativo"
                items={lotesAtivos}
                selectedId={loteSelecionadoId}
                onSelect={setLoteSelecionadoId}
                emptyMessage="Nenhum lote ativo disponível."
                getTitle={(lote) => lote.codigo_lote}
                getSubtitle={(lote) =>
                  `${lote.variedade_nome} | Disponível: ${lote.saldo_disponivel_para_ocupar} | Alocado: ${lote.total_alocado_em_bancadas}`
                }
              />

              <Text style={styles.label}>Quantidade alocada</Text>
              <TextInput
                style={styles.input}
                value={quantidadeAlocada}
                onChangeText={setQuantidadeAlocada}
                keyboardType="numeric"
                placeholder="300"
              />

              <Text style={styles.label}>Posição inicial</Text>
              <TextInput
                style={styles.input}
                value={posicaoInicial}
                onChangeText={setPosicaoInicial}
                keyboardType="numeric"
                placeholder="1"
              />

              <Text style={styles.label}>Posição final</Text>
              <TextInput
                style={styles.input}
                value={posicaoFinal}
                onChangeText={setPosicaoFinal}
                keyboardType="numeric"
                placeholder="300"
              />

              <DatePickerField
                label="Data de início"
                value={dataInicio}
                onChange={setDataInicio}
                placeholder="Selecionar data"
              />

              <OptionSelectField
                label="Tipo de ocupação"
                value={tipoOcupacao}
                onChange={setTipoOcupacao}
                options={OPCOES_TIPO_OCUPACAO}
              />

              <Button title="Registrar ocupação" onPress={handleRegistrarOcupacao} />

              <Text style={styles.subsecao}>Registrar monitoramento</Text>

              <DateTimePickerField
                label="Data e hora"
                value={dataHoraMonitoramento}
                onChange={setDataHoraMonitoramento}
                placeholder="Selecionar data e hora do monitoramento"
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

              <Button
                title="Registrar monitoramento"
                onPress={handleRegistrarMonitoramento}
              />

              <Text style={styles.subsecao}>Histórico de monitoramentos</Text>
              {monitoramentos.length === 0 ? (
                <Text style={styles.aviso}>Nenhum monitoramento registrado.</Text>
              ) : (
                monitoramentos.map((item) => (
                  <View key={item.id} style={styles.cardMonitoramento}>
                    <Text style={styles.cardMonitoramentoTitulo}>{item.data_hora}</Text>
                    <Text>pH: {item.ph}</Text>
                    <Text>CE: {item.ce}</Text>
                    <Text>Temp. água: {item.temperatura_agua ?? "-"}</Text>
                    <Text>Obs.: {item.observacoes || "-"}</Text>
                  </View>
                ))
              )}

              <Text style={styles.subsecao}>Ações da ocupação selecionada</Text>
              {!ocupacaoSelecionada ? (
                <Text style={styles.aviso}>
                  Selecione uma ocupação ativa acima para colher, transplantar ou registrar ocorrência.
                </Text>
              ) : (
                <>
                  <Text style={styles.destaque}>
                    Ocupação selecionada: {ocupacaoSelecionada.id} | Faixa: {ocupacaoSelecionada.posicao_inicial}-{ocupacaoSelecionada.posicao_final}
                  </Text>

                  <Text style={styles.subsecao}>Colheita</Text>

                  <DatePickerField
                    label="Data da colheita"
                    value={dataColheita}
                    onChange={setDataColheita}
                    placeholder="Selecionar data"
                  />

                  <Text style={styles.label}>Quantidade colhida</Text>
                  <TextInput
                    style={styles.input}
                    value={quantidadeColhida}
                    onChangeText={setQuantidadeColhida}
                    keyboardType="numeric"
                    placeholder="250"
                  />

                  <Text style={styles.label}>Quantidade de perda</Text>
                  <TextInput
                    style={styles.input}
                    value={quantidadePerda}
                    onChangeText={setQuantidadePerda}
                    keyboardType="numeric"
                    placeholder="10"
                  />

                  <OptionSelectField
                    label="Tipo de colheita"
                    value={tipoColheita}
                    onChange={setTipoColheita}
                    options={OPCOES_TIPO_COLHEITA}
                  />

                  <Button title="Registrar colheita" onPress={handleColher} />

                  <Text style={styles.subsecao}>Histórico de colheitas</Text>
                  {colheitas.length === 0 ? (
                    <Text style={styles.aviso}>Nenhuma colheita registrada.</Text>
                  ) : (
                    colheitas.map((item) => (
                      <View key={item.id} style={styles.cardMonitoramento}>
                        <Text style={styles.cardMonitoramentoTitulo}>{item.data_colheita}</Text>
                        <Text>Qtd. colhida: {item.quantidade_colhida}</Text>
                        <Text>Qtd. perda: {item.quantidade_perda}</Text>
                        <Text>Tipo: {item.tipo_colheita}</Text>
                      </View>
                    ))
                  )}

                  <Text style={styles.subsecao}>Transplante / sublote</Text>

                  <Text style={styles.subsecao}>Origem do transplante</Text>

                  <View style={styles.cardOrigem}>
                    <Text style={styles.cardMonitoramentoTitulo}>
                      Ocupação origem: {ocupacaoSelecionada?.id || "-"}
                    </Text>
                    <Text>Lote origem: {ocupacaoSelecionada?.lote_producao_id || "-"}</Text>
                    <Text>
                      Variedade: {obterLotePorId(ocupacaoSelecionada?.lote_producao_id)?.variedade_nome || "-"}
                    </Text>
                    <Text>
                      Faixa origem: {ocupacaoSelecionada?.posicao_inicial || "-"} até{" "}
                      {ocupacaoSelecionada?.posicao_final || "-"}
                    </Text>
                    <Text>Quantidade alocada: {ocupacaoSelecionada?.quantidade_alocada || "-"}</Text>
                    <Text>Tipo ocupação: {ocupacaoSelecionada?.tipo_ocupacao || "-"}</Text>
                    <Text style={styles.fluxoTexto}>{obterDescricaoFluxo()}</Text>
                  </View>

                  <Text style={styles.label}>Buscar bancada destino</Text>
                  <TextInput
                    style={styles.input}
                    value={buscaBancadaDestino}
                    onChangeText={setBuscaBancadaDestino}
                    placeholder="Ex: A13, engorda, vazia..."
                  />

                  {!buscaBancadaDestino.trim() && bancadasDestinoFiltradas.length >= 25 ? (
                    <Text style={styles.aviso}>
                      Exibindo as 25 primeiras bancadas priorizadas. Digite na busca para refinar.
                    </Text>
                  ) : null}

                  <SelectCardList
                    title="Escolha a bancada destino"
                    items={bancadasDestinoFiltradas}
                    selectedId={bancadaDestinoId}
                    onSelect={setBancadaDestinoId}
                    emptyMessage="Nenhuma bancada encontrada para essa busca."
                    getTitle={(item) => item.codigo}
                    getSubtitle={(item) => {
                      const compativel = tiposDestinoPreferenciais.includes(
                        (item.tipo || "").toLowerCase()
                      );

                      return `${item.tipo} | Capacidade: ${item.capacidade_total} | Status: ${item.status}${compativel ? " | Recomendado" : ""}`;
                    }}
                  />

                  {bancadaDestinoId ? (
                    <Text style={styles.destaque}>
                      Bancada destino selecionada:{" "}
                      {bancadas.find((item) => item.id === bancadaDestinoId)?.codigo || "-"}
                    </Text>
                  ) : null}

                  <Text style={styles.label}>Quantidade transplantada</Text>
                  <TextInput
                    style={styles.input}
                    value={quantidadeTransplantada}
                    onChangeText={setQuantidadeTransplantada}
                    keyboardType="numeric"
                    placeholder="300"
                  />

                  <DatePickerField
                    label="Data do transplante"
                    value={dataTransplante}
                    onChange={setDataTransplante}
                    placeholder="Selecionar data"
                  />

                  <Text style={styles.label}>Posição inicial destino</Text>
                  <TextInput
                    style={styles.input}
                    value={posicaoInicialDestino}
                    onChangeText={setPosicaoInicialDestino}
                    keyboardType="numeric"
                    placeholder="1"
                  />

                  <Text style={styles.label}>Posição final destino</Text>
                  <TextInput
                    style={styles.input}
                    value={posicaoFinalDestino}
                    onChangeText={setPosicaoFinalDestino}
                    keyboardType="numeric"
                    placeholder="300"
                  />

                  <View style={styles.linhaSwitch}>
                    <Text>Encerrar ocupação de origem</Text>
                    <Switch value={encerrarOrigem} onValueChange={setEncerrarOrigem} />
                  </View>

                  <Button title="Realizar transplante" onPress={handleTransplante} />

                  <Text style={styles.subsecao}>Registrar ocorrência</Text>

                  <OptionSelectField
                    label="Tipo da ocorrência"
                    value={tipoOcorrencia}
                    onChange={setTipoOcorrencia}
                    options={OPCOES_TIPO_OCORRENCIA}
                  />

                  <Text style={styles.label}>Descrição</Text>
                  <TextInput
                    style={styles.input}
                    value={descricaoOcorrencia}
                    onChangeText={setDescricaoOcorrencia}
                    placeholder="Descreva o problema"
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
                    value={dataHoraOcorrencia}
                    onChange={setDataHoraOcorrencia}
                    placeholder="Selecionar data e hora da ocorrência"
                  />

                  <OptionSelectField
                    label="Status"
                    value={statusOcorrencia}
                    onChange={setStatusOcorrencia}
                    options={OPCOES_STATUS_OCORRENCIA}
                  />

                  <Button
                    title="Registrar ocorrência"
                    onPress={handleRegistrarOcorrencia}
                  />

                  <Text style={styles.subsecao}>Histórico de ocorrências</Text>
                  {ocorrencias.length === 0 ? (
                    <Text style={styles.aviso}>Nenhuma ocorrência registrada.</Text>
                  ) : (
                    ocorrencias.map((item) => (
                      <View key={item.id} style={styles.cardMonitoramento}>
                        <Text style={styles.cardMonitoramentoTitulo}>
                          {item.tipo_ocorrencia.toUpperCase()}
                        </Text>
                        <Text>Data/hora: {item.data_hora}</Text>
                        <Text>Descrição: {item.descricao}</Text>
                        <Text>Ação corretiva: {item.acao_corretiva || "-"}</Text>
                        <Text>Status: {item.status}</Text>

                        {item.status !== "resolvida" && (
                          <View style={{ marginTop: 8 }}>
                            <Button
                              title="Marcar como resolvida"
                              onPress={() => handleResolverOcorrencia(item.id)}
                            />
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}

              <View style={{ height: 14 }} />
              <Button title="Fechar" onPress={() => setModalVisible(false)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4
  },
  subtitulo: {
    textAlign: "center",
    marginBottom: 12,
    color: "#555"
  },
  legendaBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12
  },
  legendaTitulo: {
    fontWeight: "bold",
    marginBottom: 6
  },
  grade: {
    paddingBottom: 20
  },
  linha: {
    flexDirection: "row"
  },
  celula: {
    width: 74,
    height: 74,
    borderWidth: 1,
    borderColor: "#999",
    margin: 4,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 4
  },
  celulaVazia: {
    backgroundColor: "#ecf0f1"
  },
  codigo: {
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center"
  },
  tipo: {
    fontSize: 10,
    textAlign: "center"
  },
  livre: {
    fontSize: 10,
    color: "#666"
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)"
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20
  },
  modal: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12
  },
  subsecao: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 10
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
  destaque: {
    fontWeight: "bold",
    marginBottom: 10
  },
  fluxoTexto: {
    marginTop: 6,
    fontWeight: "bold",
    color: "#2e86de"
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  cardMonitoramento: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  cardLivre: {
    borderWidth: 1,
    borderColor: "#7fb3d5",
    backgroundColor: "#eef7fc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  cardOrigem: {
    borderWidth: 1,
    borderColor: "#7fb3d5",
    backgroundColor: "#eef7fc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  cardMonitoramentoTitulo: {
    fontWeight: "bold",
    marginBottom: 4
  },
  linhaSwitch: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10
  },
  legendaMiniMapa: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 8
  },
  legendaItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  corLivre: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#ecf0f1",
    borderWidth: 1,
    borderColor: "#bdc3c7",
    marginRight: 6
  },
  corOcupado: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#2e86de",
    marginRight: 6
  },
  legendaMiniTexto: {
    fontSize: 12,
    color: "#555"
  }
});