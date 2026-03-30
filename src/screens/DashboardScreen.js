import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Button,
  TextInput
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
  colherOcupacao,
  listarColheitasPorOcupacao
} from "../services/colheitaService";
import { calcularResumoCapacidade } from "../services/faixaBancadaService";
import { calcularResumoLotes } from "../services/saldoLoteService";
import {
  sugerirFaixaParaQuantidade,
  obterMaiorFaixaLivre
} from "../services/ocupacaoSugestaoService";
import {
  calcularDiasDesdeEntrada,
  calcularDiasNaOcupacao,
  obterStatusVisualLote
} from "../services/statusLoteService";
import DatePickerField from "../components/DatePickerField";
import OptionSelectField from "../components/OptionSelectField";
import SelectCardList from "../components/SelectCardList";
import BancadaFaixaBar from "../components/BancadaFaixaBar";

export default function DashboardScreen() {
  const [bancadas, setBancadas] = useState([]);
  const [lotesAtivos, setLotesAtivos] = useState([]);
  const [setores, setSetores] = useState([]);

  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [buscaCodigo, setBuscaCodigo] = useState("");

  const [bancadaSelecionada, setBancadaSelecionada] = useState(null);
  const [ocupacoesAtivasBancada, setOcupacoesAtivasBancada] = useState([]);
  const [ocupacaoSelecionadaId, setOcupacaoSelecionadaId] = useState("");
  const [colheitas, setColheitas] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);

  const [loteSelecionadoId, setLoteSelecionadoId] = useState("");
  const [posicaoInicial, setPosicaoInicial] = useState("");
  const [posicaoFinal, setPosicaoFinal] = useState("");
  const [quantidadeAlocada, setQuantidadeAlocada] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [tipoOcupacao, setTipoOcupacao] = useState("bercario");

  const [bancadaDestinoId, setBancadaDestinoId] = useState("");
  const [buscaBancadaDestino, setBuscaBancadaDestino] = useState("");
  const [quantidadeTransplantada, setQuantidadeTransplantada] = useState("");
  const [dataTransplante, setDataTransplante] = useState("");
  const [posicaoInicialDestino, setPosicaoInicialDestino] = useState("");
  const [posicaoFinalDestino, setPosicaoFinalDestino] = useState("");

  const [dataColheita, setDataColheita] = useState("");
  const [quantidadeColhida, setQuantidadeColhida] = useState("");
  const [quantidadePerda, setQuantidadePerda] = useState("");
  const [tipoColheita, setTipoColheita] = useState("parcial");

  const [faixaSugeridaAtual, setFaixaSugeridaAtual] = useState(null);
  const [faixaSugeridaDestino, setFaixaSugeridaDestino] = useState(null);
  const [resumoDestinoTransplante, setResumoDestinoTransplante] = useState(null);

  const OPCOES_TIPO_OCUPACAO_BERCARIO = [
    { label: "Berçário", value: "bercario" }
  ];

  const OPCOES_TIPO_OCUPACAO_FINAL = [
    { label: "Entrada direta final", value: "entrada_direta_final" }
  ];

  const OPCOES_TIPO_COLHEITA = [
    { label: "Parcial", value: "parcial" },
    { label: "Total", value: "total" }
  ];

  const OPCOES_FILTRO_TIPO = [
    { label: "Todos", value: "" },
    { label: "Berçário", value: "bercario" },
    { label: "Final", value: "final" }
  ];

  const OPCOES_FILTRO_STATUS = [
    { label: "Todos", value: "" },
    { label: "Vazia", value: "vazia" },
    { label: "Ocupada", value: "ocupada" },
    { label: "Alerta", value: "alerta" },
    { label: "Manutenção", value: "manutencao" },
    { label: "Inativa", value: "inativa" }
  ];

  useEffect(() => {
    carregarTudo();
  }, []);

  const ocupacaoSelecionada =
    ocupacoesAtivasBancada.find((item) => item.id === ocupacaoSelecionadaId) || null;

  const resumoCapacidade = useMemo(() => {
    if (!bancadaSelecionada) return null;

    return calcularResumoCapacidade(
      bancadaSelecionada.capacidade_total,
      ocupacoesAtivasBancada
    );
  }, [bancadaSelecionada, ocupacoesAtivasBancada]);

  useEffect(() => {
    if (!bancadaSelecionada || !resumoCapacidade) {
      setFaixaSugeridaAtual(null);
      return;
    }

    const sugestao = sugerirFaixaParaQuantidade(
      resumoCapacidade.faixasLivres,
      quantidadeAlocada
    );

    setFaixaSugeridaAtual(sugestao);

    if (sugestao) {
      setPosicaoInicial(String(sugestao.inicio));
      setPosicaoFinal(String(sugestao.fim));
    }
  }, [quantidadeAlocada, resumoCapacidade, bancadaSelecionada]);

  useEffect(() => {
    async function sugerirDestino() {
      if (!bancadaDestinoId) {
        setFaixaSugeridaDestino(null);
        setResumoDestinoTransplante(null);
        return;
      }

      const bancadaDestino = bancadas.find((item) => item.id === bancadaDestinoId);
      if (!bancadaDestino) {
        setFaixaSugeridaDestino(null);
        setResumoDestinoTransplante(null);
        return;
      }

      const ocupacoesDestino = await listarOcupacoesAtivasPorBancada(bancadaDestinoId);
      const resumoDestino = calcularResumoCapacidade(
        bancadaDestino.capacidade_total,
        ocupacoesDestino
      );

      setResumoDestinoTransplante(resumoDestino);

      if (!quantidadeTransplantada) {
        setFaixaSugeridaDestino(null);
        return;
      }

      const sugestao = sugerirFaixaParaQuantidade(
        resumoDestino.faixasLivres,
        quantidadeTransplantada
      );

      setFaixaSugeridaDestino(sugestao);

      if (sugestao) {
        setPosicaoInicialDestino(String(sugestao.inicio));
        setPosicaoFinalDestino(String(sugestao.fim));
      }
    }

    sugerirDestino();
  }, [bancadaDestinoId, quantidadeTransplantada, bancadas]);

  useEffect(() => {
    if (!ocupacaoSelecionada) return;

    const totalOcupacao = Number(ocupacaoSelecionada.quantidade_alocada || 0);
    const perda = Number(quantidadePerda || 0);

    if (tipoColheita === "total") {
      const colhida = totalOcupacao - perda;
      setQuantidadeColhida(String(Math.max(0, colhida)));
    }
  }, [tipoColheita, quantidadePerda, ocupacaoSelecionada]);

  const bancadasFiltradas = useMemo(() => {
    return bancadas.filter((item) => {
      if (item.active === false) return false;
      if (filtroSetor && item.setor_id !== filtroSetor) return false;
      if (filtroTipo && item.tipo !== filtroTipo) return false;
      if (filtroStatus && item.status !== filtroStatus) return false;

      if (buscaCodigo.trim()) {
        const termo = buscaCodigo.trim().toLowerCase();
        return (item.codigo || "").toLowerCase().includes(termo);
      }

      return true;
    });
  }, [bancadas, filtroSetor, filtroTipo, filtroStatus, buscaCodigo]);

  const bancadasDestinoFiltradas = useMemo(() => {
    const termo = buscaBancadaDestino.trim().toLowerCase();

    return bancadas
      .filter((item) => item.active !== false)
      .filter((item) => item.id !== bancadaSelecionada?.id)
      .filter((item) => item.tipo === "final")
      .filter((item) => {
        if (!termo) return true;
        return (
          (item.codigo || "").toLowerCase().includes(termo) ||
          (item.status || "").toLowerCase().includes(termo) ||
          (item.setor_codigo || "").toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        if (a.status === "vazia" && b.status !== "vazia") return -1;
        if (a.status !== "vazia" && b.status === "vazia") return 1;
        return (a.codigo || "").localeCompare(b.codigo || "", undefined, {
          numeric: true
        });
      });
  }, [bancadas, bancadaSelecionada, buscaBancadaDestino]);

  const limitesGrade = useMemo(() => {
    if (bancadasFiltradas.length === 0) return { maxX: 5, maxY: 5 };

    const maxX = Math.max(...bancadasFiltradas.map((b) => Number(b.x || 0)));
    const maxY = Math.max(...bancadasFiltradas.map((b) => Number(b.y || 0)));

    return { maxX, maxY };
  }, [bancadasFiltradas]);

  async function carregarTudo() {
    try {
      const [bancadasSnapshot, lotes, setoresSnapshot] = await Promise.all([
        get(ref(db, "bancadas")),
        calcularResumoLotes(),
        get(ref(db, "setores"))
      ]);

      setBancadas(
        bancadasSnapshot.exists() ? Object.values(bancadasSnapshot.val()) : []
      );

      setSetores(
        setoresSnapshot.exists() ? Object.values(setoresSnapshot.val()) : []
      );

      setLotesAtivos(
        lotes.filter((lote) => Number(lote.saldo_disponivel_para_ocupar) > 0)
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

    if (proximaOcupacaoId) {
      const listaColheitas = await listarColheitasPorOcupacao(proximaOcupacaoId);
      setColheitas(listaColheitas);
    } else {
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
      setTipoOcupacao(
        bancada.tipo === "bercario" ? "bercario" : "entrada_direta_final"
      );

      setBancadaDestinoId("");
      setBuscaBancadaDestino("");
      setQuantidadeTransplantada("");
      setDataTransplante("");
      setPosicaoInicialDestino("");
      setPosicaoFinalDestino("");
      setFaixaSugeridaDestino(null);
      setResumoDestinoTransplante(null);

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
    async function carregarColheitas() {
      if (!ocupacaoSelecionadaId) {
        setColheitas([]);
        return;
      }

      try {
        const listaColheitas = await listarColheitasPorOcupacao(ocupacaoSelecionadaId);
        setColheitas(listaColheitas);
      } catch (error) {
        alert(error.message);
      }
    }

    carregarColheitas();
  }, [ocupacaoSelecionadaId]);

  function encontrarBancadaNaPosicao(x, y) {
    return bancadasFiltradas.find(
      (bancada) => Number(bancada.x) === x && Number(bancada.y) === y
    );
  }

  function obterCorPorStatus(status, tipo) {
    if (status === "ocupada" && tipo === "bercario") return "#f4d03f";
    if (status === "ocupada" && tipo === "final") return "#58d68d";
    if (status === "alerta") return "#e74c3c";
    if (status === "manutencao") return "#f5b041";
    if (status === "inativa") return "#85929e";
    return "#d5d8dc";
  }

  function obterCorStatusVisual(statusVisual) {
    switch ((statusVisual || "").toLowerCase()) {
      case "recém-entrado":
      case "recem-entrado":
        return "#d6eaf8";
      case "em berçário":
      case "em bercario":
        return "#fcf3cf";
      case "pronto para final":
        return "#fdebd0";
      case "em final":
        return "#d5f5e3";
      case "pronto para colher":
        return "#abebc6";
      case "colhido":
        return "#d7dbdd";
      default:
        return "#f4f6f7";
    }
  }

  function obterResumoVisualDaOcupacao(ocupacao) {
    const lote = lotesAtivos.find((item) => item.id === ocupacao.lote_producao_id);

    const diasEntrada = calcularDiasDesdeEntrada(lote?.data_formacao);
    const diasOcupacao = calcularDiasNaOcupacao(
      ocupacao.data_inicio,
      ocupacao.data_fim
    );

    const statusVisual = obterStatusVisualLote({
      lote,
      bancadaTipo: bancadaSelecionada?.tipo,
      diasDesdeEntrada: diasEntrada,
      diasNaOcupacao: diasOcupacao,
      temColheita: colheitas.length > 0
    });

    return {
      lote,
      diasEntrada,
      diasOcupacao,
      statusVisual
    };
  }

  async function handleRegistrarOcupacao() {
    try {
      if (
        !bancadaSelecionada ||
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

      const qtd = Number(quantidadeAlocada);
      const faixa = Number(posicaoFinal) - Number(posicaoInicial) + 1;

      if (qtd !== faixa) {
        alert("A quantidade alocada deve ser igual ao tamanho da faixa.");
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

  async function handleCancelarOcupacao(ocupacaoId) {
    try {
      const hoje = new Date().toISOString().split("T")[0];

      await encerrarOcupacaoBancada({
        ocupacao_id: ocupacaoId,
        data_fim: hoje
      });

      alert("Ocupação cancelada com sucesso!");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleTransplante() {
    try {
      if (
        !ocupacaoSelecionada ||
        !bancadaDestinoId ||
        !quantidadeTransplantada ||
        !dataTransplante ||
        !posicaoInicialDestino ||
        !posicaoFinalDestino
      ) {
        alert("Preencha todos os campos do transplante.");
        return;
      }

      const qtd = Number(quantidadeTransplantada);
      const faixa = Number(posicaoFinalDestino) - Number(posicaoInicialDestino) + 1;

      if (qtd !== faixa) {
        alert("A quantidade transplantada deve ser igual ao tamanho da faixa destino.");
        return;
      }

      if (!validarDataISO(dataTransplante.trim())) {
        alert("A data do transplante deve estar no formato YYYY-MM-DD e ser válida.");
        return;
      }

      await transplantarParaOutraBancada({
        ocupacao_origem_id: ocupacaoSelecionada.id,
        bancada_destino_id: bancadaDestinoId,
        quantidade_transplantada: quantidadeTransplantada,
        data_transplante: dataTransplante.trim(),
        posicao_inicial_destino: posicaoInicialDestino,
        posicao_final_destino: posicaoFinalDestino
      });

      alert("Transplante realizado com sucesso!");

      setBancadaDestinoId("");
      setBuscaBancadaDestino("");
      setQuantidadeTransplantada("");
      setDataTransplante("");
      setPosicaoInicialDestino("");
      setPosicaoFinalDestino("");
      setFaixaSugeridaDestino(null);
      setResumoDestinoTransplante(null);

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
        `Colheita registrada!\nLote comercial: ${resultado.lote_comercial.codigo_lote_comercial}`
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

  function usarFaixaSugeridaAtual() {
    if (!faixaSugeridaAtual) {
      alert("Não foi encontrada faixa livre suficiente para essa quantidade.");
      return;
    }

    setPosicaoInicial(String(faixaSugeridaAtual.inicio));
    setPosicaoFinal(String(faixaSugeridaAtual.fim));
  }

  function usarFaixaInteiraRestante() {
    if (!resumoCapacidade || !resumoCapacidade.faixasLivres.length) {
      alert("Não existe faixa livre disponível.");
      return;
    }

    const maior = obterMaiorFaixaLivre(resumoCapacidade.faixasLivres);
    if (!maior) return;

    setPosicaoInicial(String(maior.inicio));
    setPosicaoFinal(String(maior.fim));
    setQuantidadeAlocada(String(maior.tamanho));
  }

  function usarFaixaSugeridaDestino() {
    if (!faixaSugeridaDestino) {
      alert("Não foi encontrada faixa livre suficiente na bancada destino.");
      return;
    }

    setPosicaoInicialDestino(String(faixaSugeridaDestino.inicio));
    setPosicaoFinalDestino(String(faixaSugeridaDestino.fim));
  }

  function preencherProximaFaixaLivreDestino() {
    if (!ocupacaoSelecionada || !resumoDestinoTransplante) {
      alert("Selecione uma bancada destino válida.");
      return;
    }

    const faixasLivres = resumoDestinoTransplante.faixasLivres || [];
    if (!faixasLivres.length) {
      alert("A bancada final não possui faixa livre.");
      return;
    }

    const faixa = faixasLivres[0];
    const qtdOrigem = Number(ocupacaoSelecionada.quantidade_alocada || 0);
    const qtd = Math.min(qtdOrigem, Number(faixa.tamanho));

    setQuantidadeTransplantada(String(qtd));
    setPosicaoInicialDestino(String(faixa.inicio));
    setPosicaoFinalDestino(String(faixa.inicio + qtd - 1));
  }

  function preencherMaiorFaixaLivreDestino() {
    if (!ocupacaoSelecionada || !resumoDestinoTransplante) {
      alert("Selecione uma bancada destino válida.");
      return;
    }

    const maior = obterMaiorFaixaLivre(resumoDestinoTransplante.faixasLivres || []);
    if (!maior) {
      alert("A bancada final não possui faixa livre.");
      return;
    }

    const qtdOrigem = Number(ocupacaoSelecionada.quantidade_alocada || 0);
    const qtd = Math.min(qtdOrigem, Number(maior.tamanho));

    setQuantidadeTransplantada(String(qtd));
    setPosicaoInicialDestino(String(maior.inicio));
    setPosicaoFinalDestino(String(maior.inicio + qtd - 1));
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

      <OptionSelectField
        label="Filtrar por tipo"
        value={filtroTipo}
        onChange={setFiltroTipo}
        options={OPCOES_FILTRO_TIPO}
      />

      <OptionSelectField
        label="Filtrar por status"
        value={filtroStatus}
        onChange={setFiltroStatus}
        options={OPCOES_FILTRO_STATUS}
      />

      <SelectCardList
        title="Filtrar por setor"
        items={[{ id: "", codigo: "Todos", nome: "Todos os setores" }, ...setores]}
        selectedId={filtroSetor}
        onSelect={setFiltroSetor}
        emptyMessage="Nenhum setor cadastrado."
        getTitle={(item) =>
          item.id ? `${item.codigo} - ${item.nome}` : "Todos os setores"
        }
        getSubtitle={(item) => (item.id ? item.descricao || "-" : "")}
      />

      <Text style={styles.label}>Buscar bancada por código</Text>
      <TextInput
        style={styles.input}
        value={buscaCodigo}
        onChangeText={setBuscaCodigo}
        placeholder="Ex: A1"
      />

      <ScrollView horizontal>
        <ScrollView>
          <View style={styles.grade}>{renderizarGrade()}</View>
        </ScrollView>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modal}>
              <Text style={styles.modalTitulo}>
                {bancadaSelecionada?.tipo === "bercario"
                  ? "Operações do Berçário"
                  : "Operações da Bancada Final"}
              </Text>

              <Text>Código: {bancadaSelecionada?.codigo}</Text>
              <Text>Setor: {bancadaSelecionada?.setor_codigo}</Text>
              <Text>Tipo: {bancadaSelecionada?.tipo}</Text>
              <Text>Capacidade total: {bancadaSelecionada?.capacidade_total}</Text>
              <Text>Status: {bancadaSelecionada?.status}</Text>

              <Text style={styles.subsecao}>Mapa visual da bancada</Text>

              {resumoCapacidade && (
                <>
                  <BancadaFaixaBar
                    capacidadeTotal={resumoCapacidade.capacidadeTotal}
                    faixasOcupadas={resumoCapacidade.faixasOcupadas}
                  />

                  <Text>Ocupado: {resumoCapacidade.totalOcupado}</Text>
                  <Text>Livre: {resumoCapacidade.totalLivre}</Text>

                  <Text style={styles.subsecao}>Faixas livres</Text>
                  {resumoCapacidade.faixasLivres.length === 0 ? (
                    <Text style={styles.aviso}>Nenhuma faixa livre.</Text>
                  ) : (
                    resumoCapacidade.faixasLivres.map((faixa, index) => (
                      <View
                        key={`${faixa.inicio}-${faixa.fim}-${index}`}
                        style={styles.cardLivre}
                      >
                        <Text>
                          Livre: {faixa.inicio} até {faixa.fim}
                        </Text>
                        <Text>Tamanho: {faixa.tamanho}</Text>
                        <Button title="Usar faixa" onPress={() => usarFaixaLivre(faixa)} />
                      </View>
                    ))
                  )}
                </>
              )}

              <Text style={styles.subsecao}>Ocupações ativas</Text>

              {ocupacoesAtivasBancada.length === 0 ? (
                <Text style={styles.aviso}>Nenhuma ocupação ativa.</Text>
              ) : (
                <>
                  <SelectCardList
                    title="Selecionar ocupação"
                    items={ocupacoesAtivasBancada}
                    selectedId={ocupacaoSelecionadaId}
                    onSelect={setOcupacaoSelecionadaId}
                    emptyMessage="Nenhuma ocupação ativa."
                    getTitle={(item) => `Ocupação ${item.id}`}
                    getSubtitle={(item) => {
                      const resumo = obterResumoVisualDaOcupacao(item);
                      return `Faixa: ${item.posicao_inicial}-${item.posicao_final} | ${resumo.statusVisual} | ${resumo.diasOcupacao} dias`;
                    }}
                  />

                  {ocupacoesAtivasBancada.map((item) => {
                    const resumo = obterResumoVisualDaOcupacao(item);

                    return (
                      <View key={item.id} style={styles.card}>
                        <Text style={styles.cardTitulo}>Ocupação {item.id}</Text>
                        <Text>Lote: {item.lote_producao_id}</Text>
                        <Text>Quantidade: {item.quantidade_alocada}</Text>
                        <Text>
                          Faixa: {item.posicao_inicial} até {item.posicao_final}
                        </Text>
                        <Text>Início: {item.data_inicio}</Text>
                        <Text>Dias na bancada: {resumo.diasOcupacao}</Text>
                        <Text>Dias desde a entrada: {resumo.diasEntrada}</Text>

                        <View
                          style={[
                            styles.badgeStatus,
                            { backgroundColor: obterCorStatusVisual(resumo.statusVisual) }
                          ]}
                        >
                          <Text style={styles.badgeStatusTexto}>
                            {resumo.statusVisual}
                          </Text>
                        </View>

                        <Text>Variedade: {resumo.lote?.variedade_nome || "-"}</Text>

                        <View style={{ marginTop: 8 }}>
                          <Button
                            title="Cancelar ocupação (correção)"
                            onPress={() => handleCancelarOcupacao(item.id)}
                          />
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              <Text style={styles.subsecao}>Registrar nova ocupação</Text>

              <SelectCardList
                title="Escolher lote"
                items={lotesAtivos}
                selectedId={loteSelecionadoId}
                onSelect={setLoteSelecionadoId}
                emptyMessage="Nenhum lote ativo disponível."
                getTitle={(item) => item.codigo_lote}
                getSubtitle={(item) =>
                  `${item.variedade_nome} | Disponível: ${item.saldo_disponivel_para_ocupar}`
                }
              />

              <Text style={styles.label}>Quantidade alocada</Text>
              <TextInput
                style={styles.input}
                value={quantidadeAlocada}
                onChangeText={setQuantidadeAlocada}
                keyboardType="numeric"
              />

              {faixaSugeridaAtual ? (
                <View style={styles.cardSugestao}>
                  <Text style={styles.cardTitulo}>Faixa sugerida</Text>
                  <Text>
                    Usar de {faixaSugeridaAtual.inicio} até {faixaSugeridaAtual.fim}
                  </Text>
                  <Text>
                    Dentro da faixa livre {faixaSugeridaAtual.faixa_original_inicio} até{" "}
                    {faixaSugeridaAtual.faixa_original_fim}
                  </Text>
                  <Text>
                    Tamanho da faixa livre original:{" "}
                    {faixaSugeridaAtual.tamanho_faixa_original}
                  </Text>

                  <View style={{ marginTop: 8 }}>
                    <Button
                      title="Usar próxima faixa livre"
                      onPress={usarFaixaSugeridaAtual}
                    />
                  </View>
                </View>
              ) : quantidadeAlocada ? (
                <Text style={styles.aviso}>
                  Nenhuma faixa livre comporta essa quantidade.
                </Text>
              ) : null}

              <View style={{ marginBottom: 10 }}>
                <Button
                  title="Usar faixa inteira restante"
                  onPress={usarFaixaInteiraRestante}
                />
              </View>

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
                value={dataInicio}
                onChange={setDataInicio}
                placeholder="Selecionar data"
              />

              <OptionSelectField
                label="Tipo de ocupação"
                value={tipoOcupacao}
                onChange={setTipoOcupacao}
                options={
                  bancadaSelecionada?.tipo === "bercario"
                    ? OPCOES_TIPO_OCUPACAO_BERCARIO
                    : OPCOES_TIPO_OCUPACAO_FINAL
                }
              />

              <Button title="Registrar ocupação" onPress={handleRegistrarOcupacao} />

              {bancadaSelecionada?.tipo === "bercario" && ocupacaoSelecionada && (
                <>
                  <Text style={styles.subsecao}>Transplante para final</Text>

                  <View style={styles.cardSugestao}>
                    <Text style={styles.cardTitulo}>Origem do transplante</Text>
                    <Text>Quantidade atual na origem: {ocupacaoSelecionada.quantidade_alocada}</Text>
                    <Text>
                      Faixa atual: {ocupacaoSelecionada.posicao_inicial} até {ocupacaoSelecionada.posicao_final}
                    </Text>
                  </View>

                  <Text style={styles.label}>Buscar bancada destino</Text>
                  <TextInput
                    style={styles.input}
                    value={buscaBancadaDestino}
                    onChangeText={setBuscaBancadaDestino}
                    placeholder="Ex: B1"
                  />

                  <SelectCardList
                    title="Escolher bancada final"
                    items={bancadasDestinoFiltradas}
                    selectedId={bancadaDestinoId}
                    onSelect={setBancadaDestinoId}
                    emptyMessage="Nenhuma bancada final encontrada."
                    getTitle={(item) => item.codigo}
                    getSubtitle={(item) =>
                      `${item.tipo} | ${item.status} | Setor ${item.setor_codigo}`
                    }
                  />

                  {resumoDestinoTransplante && (
                    <View style={styles.cardSugestao}>
                      <Text style={styles.cardTitulo}>Resumo da bancada final</Text>
                      <Text>Ocupado: {resumoDestinoTransplante.totalOcupado}</Text>
                      <Text>Livre: {resumoDestinoTransplante.totalLivre}</Text>
                    </View>
                  )}

                  <View style={{ marginBottom: 8 }}>
                    <Button
                      title="Preencher próxima faixa livre"
                      onPress={preencherProximaFaixaLivreDestino}
                    />
                  </View>

                  <View style={{ marginBottom: 8 }}>
                    <Button
                      title="Preencher maior faixa livre"
                      onPress={preencherMaiorFaixaLivreDestino}
                    />
                  </View>

                  <Text style={styles.label}>Quantidade transplantada</Text>
                  <TextInput
                    style={styles.input}
                    value={quantidadeTransplantada}
                    onChangeText={setQuantidadeTransplantada}
                    keyboardType="numeric"
                  />

                  {ocupacaoSelecionada && quantidadeTransplantada ? (
                    <View style={styles.cardSugestao}>
                      <Text>
                        Quantidade que permanecerá na origem:{" "}
                        {Math.max(
                          0,
                          Number(ocupacaoSelecionada.quantidade_alocada || 0) -
                            Number(quantidadeTransplantada || 0)
                        )}
                      </Text>
                    </View>
                  ) : null}

                  {faixaSugeridaDestino ? (
                    <View style={styles.cardSugestao}>
                      <Text style={styles.cardTitulo}>Faixa sugerida no destino</Text>
                      <Text>
                        Usar de {faixaSugeridaDestino.inicio} até {faixaSugeridaDestino.fim}
                      </Text>
                      <Text>
                        Dentro da faixa livre {faixaSugeridaDestino.faixa_original_inicio} até{" "}
                        {faixaSugeridaDestino.faixa_original_fim}
                      </Text>

                      <View style={{ marginTop: 8 }}>
                        <Button
                          title="Usar próxima faixa livre no destino"
                          onPress={usarFaixaSugeridaDestino}
                        />
                      </View>
                    </View>
                  ) : quantidadeTransplantada && bancadaDestinoId ? (
                    <Text style={styles.aviso}>
                      Nenhuma faixa livre no destino comporta essa quantidade.
                    </Text>
                  ) : null}

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
                  />

                  <Text style={styles.label}>Posição final destino</Text>
                  <TextInput
                    style={styles.input}
                    value={posicaoFinalDestino}
                    onChangeText={setPosicaoFinalDestino}
                    keyboardType="numeric"
                  />

                  <Button title="Realizar transplante" onPress={handleTransplante} />
                </>
              )}

              {bancadaSelecionada?.tipo === "final" && ocupacaoSelecionada && (
                <>
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
                    editable={tipoColheita !== "total"}
                  />

                  <Text style={styles.label}>Quantidade perda</Text>
                  <TextInput
                    style={styles.input}
                    value={quantidadePerda}
                    onChangeText={setQuantidadePerda}
                    keyboardType="numeric"
                  />

                  <OptionSelectField
                    label="Tipo de colheita"
                    value={tipoColheita}
                    onChange={setTipoColheita}
                    options={OPCOES_TIPO_COLHEITA}
                  />

                  {tipoColheita === "total" && ocupacaoSelecionada ? (
                    <View style={styles.cardSugestao}>
                      <Text style={styles.cardTitulo}>Colheita total selecionada</Text>
                      <Text>Total na ocupação: {ocupacaoSelecionada.quantidade_alocada}</Text>
                      <Text>Perda informada: {quantidadePerda || 0}</Text>
                      <Text>
                        Quantidade colhida calculada automaticamente: {quantidadeColhida || 0}
                      </Text>
                      <Text>
                        Na colheita total, colhida + perda consomem toda a ocupação.
                      </Text>
                    </View>
                  ) : null}

                  <Button title="Registrar colheita" onPress={handleColher} />

                  <Text style={styles.subsecao}>Histórico de colheitas</Text>
                  {colheitas.length === 0 ? (
                    <Text style={styles.aviso}>Nenhuma colheita registrada.</Text>
                  ) : (
                    colheitas.map((item) => (
                      <View key={item.id} style={styles.card}>
                        <Text style={styles.cardTitulo}>{item.id}</Text>
                        <Text>Data: {item.data_colheita}</Text>
                        <Text>Qtd. colhida: {item.quantidade_colhida}</Text>
                        <Text>Qtd. perda: {item.quantidade_perda}</Text>
                        <Text>Tipo: {item.tipo_colheita}</Text>
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
  container: { flex: 1, padding: 12 },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12
  },
  grade: { paddingBottom: 20 },
  linha: { flexDirection: "row" },
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
  celulaVazia: { backgroundColor: "#ecf0f1" },
  codigo: { fontWeight: "bold", fontSize: 12, textAlign: "center" },
  tipo: { fontSize: 10, textAlign: "center" },
  livre: { fontSize: 10, color: "#666" },
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
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  aviso: {
    color: "#666",
    marginBottom: 8
  },
  card: {
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
  cardSugestao: {
    borderWidth: 1,
    borderColor: "#58d68d",
    backgroundColor: "#eefaf1",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  cardTitulo: {
    fontWeight: "bold",
    marginBottom: 4
  },
  badgeStatus: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: 6
  },
  badgeStatusTexto: {
    fontWeight: "bold",
    fontSize: 12
  }
});