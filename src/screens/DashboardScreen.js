import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
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

function ActionButton({ title, onPress, disabled = false, variant = "primary" }) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === "danger" && styles.actionButtonDanger,
        disabled && styles.actionButtonDisabled
      ]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.8}
      disabled={disabled}
    >
      <Text
        style={[
          styles.actionButtonText,
          disabled && styles.actionButtonTextDisabled
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function obterFaixaInfo(posicaoInicial, posicaoFinal) {
  const ini = Number(posicaoInicial);
  const fim = Number(posicaoFinal);

  if (!ini || !fim || ini <= 0 || fim <= 0 || ini > fim) {
    return {
      valida: false,
      inicio: 0,
      fim: 0,
      tamanho: 0
    };
  }

  return {
    valida: true,
    inicio: ini,
    fim,
    tamanho: fim - ini + 1
  };
}

function faixaConflitaComOcupacoes(
  ocupacoes,
  posicaoInicial,
  posicaoFinal,
  ignorarOcupacaoId = ""
) {
  const ini = Number(posicaoInicial);
  const fim = Number(posicaoFinal);

  return (ocupacoes || []).some((item) => {
    if (ignorarOcupacaoId && item.id === ignorarOcupacaoId) return false;
    if (item.status !== "ativa") return false;

    const iniExistente = Number(item.posicao_inicial);
    const fimExistente = Number(item.posicao_final);

    return !(fim < iniExistente || ini > fimExistente);
  });
}

function obterNivelSaldoLote(lote) {
  const saldo = Number(lote?.saldo_disponivel_para_ocupar || 0);
  const inicial = Number(lote?.quantidade_inicial || 0);

  if (saldo <= 0) {
    return { label: "Sem saldo", tipo: "zerado" };
  }

  if (!inicial) {
    if (saldo <= 50) return { label: "Saldo crítico", tipo: "critico" };
    if (saldo <= 150) return { label: "Saldo baixo", tipo: "baixo" };
    return { label: "Saldo normal", tipo: "normal" };
  }

  const percentual = (saldo / inicial) * 100;

  if (percentual <= 10) return { label: "Saldo crítico", tipo: "critico" };
  if (percentual <= 25) return { label: "Saldo baixo", tipo: "baixo" };
  return { label: "Saldo normal", tipo: "normal" };
}

export default function DashboardScreen() {
  const [bancadas, setBancadas] = useState([]);
  const [lotesResumo, setLotesResumo] = useState([]);
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
  const [ocupacoesAtivasDestino, setOcupacoesAtivasDestino] = useState([]);

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

  const loteSelecionado =
    lotesAtivos.find((item) => item.id === loteSelecionadoId) || null;

  const saldoLoteSelecionado = Number(
    loteSelecionado?.saldo_disponivel_para_ocupar || 0
  );

  const faixaInformadaAtual = useMemo(
    () => obterFaixaInfo(posicaoInicial, posicaoFinal),
    [posicaoInicial, posicaoFinal]
  );

  const faixaInformadaDestino = useMemo(
    () => obterFaixaInfo(posicaoInicialDestino, posicaoFinalDestino),
    [posicaoInicialDestino, posicaoFinalDestino]
  );

  const resumoCapacidade = useMemo(() => {
    if (!bancadaSelecionada) return null;

    return calcularResumoCapacidade(
      bancadaSelecionada.capacidade_total,
      ocupacoesAtivasBancada
    );
  }, [bancadaSelecionada, ocupacoesAtivasBancada]);

  const lotesAtivosOrdenados = useMemo(() => {
    return [...lotesAtivos].sort((a, b) => {
      const saldoA = Number(a.saldo_disponivel_para_ocupar || 0);
      const saldoB = Number(b.saldo_disponivel_para_ocupar || 0);

      if (saldoB !== saldoA) return saldoB - saldoA;

      return (a.codigo_lote || "").localeCompare(b.codigo_lote || "", undefined, {
        numeric: true
      });
    });
  }, [lotesAtivos]);

  const faixaLivreAtualDisponivel = (resumoCapacidade?.faixasLivres || []).length > 0;

  const maiorFaixaLivreAtual = useMemo(() => {
    if (!resumoCapacidade?.faixasLivres?.length) return null;
    return obterMaiorFaixaLivre(resumoCapacidade.faixasLivres);
  }, [resumoCapacidade]);

  const quantidadeAlocadaNumero = Number(quantidadeAlocada || 0);
  const quantidadeTransplantadaNumero = Number(quantidadeTransplantada || 0);
  const quantidadeColhidaNumero = Number(quantidadeColhida || 0);
  const quantidadePerdaNumero = Number(quantidadePerda || 0);

  const ocupacaoTemSaldo = Number(ocupacaoSelecionada?.quantidade_alocada || 0) > 0;

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

    if (sugestao && !posicaoInicial && !posicaoFinal) {
      setPosicaoInicial(String(sugestao.inicio));
      setPosicaoFinal(String(sugestao.fim));
    }
  }, [quantidadeAlocada, resumoCapacidade, bancadaSelecionada]);

  useEffect(() => {
    async function sugerirDestino() {
      if (!bancadaDestinoId) {
        setFaixaSugeridaDestino(null);
        setResumoDestinoTransplante(null);
        setOcupacoesAtivasDestino([]);
        return;
      }

      const bancadaDestino = bancadas.find((item) => item.id === bancadaDestinoId);
      if (!bancadaDestino) {
        setFaixaSugeridaDestino(null);
        setResumoDestinoTransplante(null);
        setOcupacoesAtivasDestino([]);
        return;
      }

      const ocupacoesDestino = await listarOcupacoesAtivasPorBancada(bancadaDestinoId);
      setOcupacoesAtivasDestino(ocupacoesDestino);

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

      if (sugestao && !posicaoInicialDestino && !posicaoFinalDestino) {
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

  const mensagemBloqueioOcupacao = useMemo(() => {
    if (!bancadaSelecionada) return "Selecione uma bancada.";
    if (!loteSelecionadoId) return "Selecione um lote.";
    if (saldoLoteSelecionado <= 0) return "O lote selecionado está sem saldo.";
    if (!quantidadeAlocadaNumero) return "Informe a quantidade alocada.";
    if (quantidadeAlocadaNumero > saldoLoteSelecionado) {
      return "A quantidade informada é maior que o saldo do lote.";
    }
    if (!faixaInformadaAtual.valida) {
      return "Preencha posição inicial e final válidas.";
    }
    if (quantidadeAlocadaNumero !== faixaInformadaAtual.tamanho) {
      return "A quantidade deve ser igual ao tamanho da faixa.";
    }
    if (faixaInformadaAtual.fim > Number(bancadaSelecionada.capacidade_total || 0)) {
      return "A faixa ultrapassa a capacidade da bancada.";
    }
    if (
      faixaConflitaComOcupacoes(
        ocupacoesAtivasBancada,
        faixaInformadaAtual.inicio,
        faixaInformadaAtual.fim
      )
    ) {
      return "A faixa informada conflita com outra ocupação ativa.";
    }
    if (!dataInicio) return "Informe a data de início.";
    if (!tipoOcupacao) return "Informe o tipo de ocupação.";
    if (!validarDataISO(dataInicio.trim())) {
      return "A data de início precisa estar válida.";
    }

    return "";
  }, [
    bancadaSelecionada,
    loteSelecionadoId,
    saldoLoteSelecionado,
    quantidadeAlocadaNumero,
    faixaInformadaAtual,
    ocupacoesAtivasBancada,
    dataInicio,
    tipoOcupacao
  ]);

  const podeRegistrarOcupacao = mensagemBloqueioOcupacao === "";

  const mensagemBloqueioCancelar = useMemo(() => {
    if (!ocupacaoSelecionada) return "Selecione uma ocupação ativa.";
    if (!ocupacaoTemSaldo) return "A ocupação selecionada já está zerada.";
    return "";
  }, [ocupacaoSelecionada, ocupacaoTemSaldo]);

  const podeCancelarOcupacao = mensagemBloqueioCancelar === "";

  const mensagemBloqueioTransplante = useMemo(() => {
    if (!ocupacaoSelecionada) return "Selecione uma ocupação ativa de origem.";
    if (!ocupacaoTemSaldo) return "A ocupação de origem está sem saldo.";
    if (!bancadaDestinoId) return "Selecione uma bancada destino.";
    if (!quantidadeTransplantadaNumero) return "Informe a quantidade transplantada.";
    if (quantidadeTransplantadaNumero > Number(ocupacaoSelecionada?.quantidade_alocada || 0)) {
      return "A quantidade transplantada é maior que a quantidade da origem.";
    }
    if (!faixaInformadaDestino.valida) {
      return "Preencha a posição inicial e final do destino.";
    }
    if (quantidadeTransplantadaNumero !== faixaInformadaDestino.tamanho) {
      return "A quantidade transplantada deve ser igual ao tamanho da faixa destino.";
    }

    const bancadaDestino = bancadas.find((item) => item.id === bancadaDestinoId);
    if (!bancadaDestino) return "Bancada destino não encontrada.";

    if (faixaInformadaDestino.fim > Number(bancadaDestino.capacidade_total || 0)) {
      return "A faixa destino ultrapassa a capacidade da bancada.";
    }

    if (
      faixaConflitaComOcupacoes(
        ocupacoesAtivasDestino,
        faixaInformadaDestino.inicio,
        faixaInformadaDestino.fim
      )
    ) {
      return "A faixa destino conflita com outra ocupação ativa.";
    }

    if (!dataTransplante) return "Informe a data do transplante.";
    if (!validarDataISO(dataTransplante.trim())) {
      return "A data do transplante precisa estar válida.";
    }

    return "";
  }, [
    ocupacaoSelecionada,
    ocupacaoTemSaldo,
    bancadaDestinoId,
    quantidadeTransplantadaNumero,
    faixaInformadaDestino,
    bancadas,
    ocupacoesAtivasDestino,
    dataTransplante
  ]);

  const podeTransplantar = mensagemBloqueioTransplante === "";

  const mensagemBloqueioColheita = useMemo(() => {
    if (!ocupacaoSelecionada) return "Selecione uma ocupação ativa.";
    if (!ocupacaoTemSaldo) return "A ocupação selecionada está zerada.";
    if (!dataColheita) return "Informe a data da colheita.";
    if (!tipoColheita) return "Informe o tipo de colheita.";

    if (!validarDataISO(dataColheita.trim())) {
      return "A data da colheita precisa estar válida.";
    }

    const totalOcupacao = Number(ocupacaoSelecionada?.quantidade_alocada || 0);

    if (quantidadePerdaNumero < 0) {
      return "A perda não pode ser negativa.";
    }

    if (tipoColheita === "total") {
      if (quantidadeColhidaNumero <= 0) {
        return "A quantidade colhida calculada precisa ser maior que zero.";
      }

      if (quantidadeColhidaNumero + quantidadePerdaNumero !== totalOcupacao) {
        return "Na colheita total, colhida + perda deve consumir toda a ocupação.";
      }

      return "";
    }

    if (quantidadeColhidaNumero <= 0) {
      return "Informe a quantidade colhida.";
    }

    if (quantidadeColhidaNumero + quantidadePerdaNumero > totalOcupacao) {
      return "Colhida + perda não pode ultrapassar a quantidade da ocupação.";
    }

    return "";
  }, [
    ocupacaoSelecionada,
    ocupacaoTemSaldo,
    dataColheita,
    tipoColheita,
    quantidadeColhidaNumero,
    quantidadePerdaNumero
  ]);

  const podeColher = mensagemBloqueioColheita === "";

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

      setLotesResumo(lotes);

      setLotesAtivos(
        lotes.filter((lote) => Number(lote.saldo_disponivel_para_ocupar) > 0)
      );
    } catch (error) {
      Alert.alert("Erro", error.message);
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
      setOcupacoesAtivasDestino([]);

      setDataColheita("");
      setQuantidadeColhida("");
      setQuantidadePerda("");
      setTipoColheita("parcial");

      await carregarDetalhesBancada(bancada);
      setModalVisible(true);
    } catch (error) {
      Alert.alert("Erro", error.message);
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
        Alert.alert("Erro", error.message);
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
    const lote =
      lotesResumo.find((item) => item.id === ocupacao.lote_producao_id) || null;

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
      if (!podeRegistrarOcupacao) {
        Alert.alert("Não foi possível registrar", mensagemBloqueioOcupacao);
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

      Alert.alert(
        "Ocupação registrada",
        `O lote foi alocado com sucesso.\n\nSaldo restante do lote: ${Math.max(
          0,
          saldoLoteSelecionado - quantidadeAlocadaNumero
        )}`
      );

      setLoteSelecionadoId("");
      setPosicaoInicial("");
      setPosicaoFinal("");
      setQuantidadeAlocada("");
      setDataInicio("");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      Alert.alert("Erro ao registrar ocupação", error.message);
    }
  }

  function handleCancelarOcupacao(ocupacaoId) {
    const ocupacao = ocupacoesAtivasBancada.find((item) => item.id === ocupacaoId);
    const quantidade = Number(ocupacao?.quantidade_alocada || 0);

    Alert.alert(
      "Cancelar ocupação",
      `Essa ação é para correção operacional.\n\nA ocupação será encerrada e ${quantidade} unidade(s) voltarão para o saldo disponível do lote.\n\nDeseja continuar?`,
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              const hoje = new Date().toISOString().split("T")[0];

              await encerrarOcupacaoBancada({
                ocupacao_id: ocupacaoId,
                data_fim: hoje
              });

              Alert.alert(
                "Ocupação cancelada",
                `A ocupação foi encerrada como correção e ${quantidade} unidade(s) retornaram ao saldo do lote.`
              );

              await carregarTudo();
              await carregarDetalhesBancada(bancadaSelecionada);
            } catch (error) {
              Alert.alert("Erro ao cancelar ocupação", error.message);
            }
          }
        }
      ]
    );
  }

  async function handleTransplante() {
    try {
      if (!podeTransplantar) {
        Alert.alert("Não foi possível transplantar", mensagemBloqueioTransplante);
        return;
      }

      const qtdOrigem = Number(ocupacaoSelecionada?.quantidade_alocada || 0);

      await transplantarParaOutraBancada({
        ocupacao_origem_id: ocupacaoSelecionada.id,
        bancada_destino_id: bancadaDestinoId,
        quantidade_transplantada: quantidadeTransplantada,
        data_transplante: dataTransplante.trim(),
        posicao_inicial_destino: posicaoInicialDestino,
        posicao_final_destino: posicaoFinalDestino
      });

      Alert.alert(
        "Transplante realizado",
        `O transplante foi concluído.\n\nPermanece na origem: ${Math.max(
          0,
          qtdOrigem - quantidadeTransplantadaNumero
        )}\n\nObservação: o transplante move entre ocupações e não consome novo saldo disponível do lote.`
      );

      setBancadaDestinoId("");
      setBuscaBancadaDestino("");
      setQuantidadeTransplantada("");
      setDataTransplante("");
      setPosicaoInicialDestino("");
      setPosicaoFinalDestino("");
      setFaixaSugeridaDestino(null);
      setResumoDestinoTransplante(null);
      setOcupacoesAtivasDestino([]);

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      Alert.alert("Erro ao transplantar", error.message);
    }
  }

  async function handleColher() {
    try {
      if (!podeColher) {
        Alert.alert("Não foi possível colher", mensagemBloqueioColheita);
        return;
      }

      const resultado = await colherOcupacao({
        ocupacao_bancada_id: ocupacaoSelecionada.id,
        data_colheita: dataColheita.trim(),
        quantidade_colhida: quantidadeColhida,
        quantidade_perda: quantidadePerda || 0,
        tipo_colheita: tipoColheita
      });

      Alert.alert(
        "Colheita registrada",
        `Lote comercial gerado: ${resultado.lote_comercial.codigo_lote_comercial}\n\nQuantidade restante na ocupação: ${resultado.quantidade_restante_na_ocupacao}`
      );

      setDataColheita("");
      setQuantidadeColhida("");
      setQuantidadePerda("");
      setTipoColheita("parcial");

      await carregarTudo();
      await carregarDetalhesBancada(bancadaSelecionada);
    } catch (error) {
      Alert.alert("Erro ao registrar colheita", error.message);
    }
  }

  function usarFaixaLivre(faixa) {
    setPosicaoInicial(String(faixa.inicio));
    setPosicaoFinal(String(faixa.fim));
  }

  function usarFaixaSugeridaAtual() {
    if (!faixaSugeridaAtual) {
      Alert.alert(
        "Sem faixa disponível",
        "Não foi encontrada faixa livre suficiente para essa quantidade."
      );
      return;
    }

    setPosicaoInicial(String(faixaSugeridaAtual.inicio));
    setPosicaoFinal(String(faixaSugeridaAtual.fim));
  }

  function usarFaixaInteiraRestante() {
    if (!resumoCapacidade || !resumoCapacidade.faixasLivres.length) {
      Alert.alert("Sem faixa livre", "Não existe faixa livre disponível.");
      return;
    }

    if (!loteSelecionadoId) {
      Alert.alert("Seleção obrigatória", "Selecione um lote primeiro.");
      return;
    }

    const loteSelecionadoLocal = lotesAtivos.find((item) => item.id === loteSelecionadoId);
    if (!loteSelecionadoLocal) {
      Alert.alert("Lote não encontrado", "Lote selecionado não encontrado.");
      return;
    }

    const maior = obterMaiorFaixaLivre(resumoCapacidade.faixasLivres);
    if (!maior) return;

    const saldoLote = Number(loteSelecionadoLocal.saldo_disponivel_para_ocupar || 0);
    const qtd = Math.min(Number(maior.tamanho), saldoLote);

    if (qtd <= 0) {
      Alert.alert("Sem saldo", "Esse lote não possui saldo disponível para ocupar.");
      return;
    }

    setPosicaoInicial(String(maior.inicio));
    setPosicaoFinal(String(maior.inicio + qtd - 1));
    setQuantidadeAlocada(String(qtd));
  }

  function usarFaixaSugeridaDestino() {
    if (!faixaSugeridaDestino) {
      Alert.alert(
        "Sem faixa disponível",
        "Não foi encontrada faixa livre suficiente na bancada destino."
      );
      return;
    }

    setPosicaoInicialDestino(String(faixaSugeridaDestino.inicio));
    setPosicaoFinalDestino(String(faixaSugeridaDestino.fim));
  }

  function preencherProximaFaixaLivreDestino() {
    if (!ocupacaoSelecionada || !resumoDestinoTransplante) {
      Alert.alert("Seleção obrigatória", "Selecione uma bancada destino válida.");
      return;
    }

    const faixasLivres = resumoDestinoTransplante.faixasLivres || [];
    if (!faixasLivres.length) {
      Alert.alert("Sem faixa livre", "A bancada final não possui faixa livre.");
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
      Alert.alert("Seleção obrigatória", "Selecione uma bancada destino válida.");
      return;
    }

    const maior = obterMaiorFaixaLivre(resumoDestinoTransplante.faixasLivres || []);
    if (!maior) {
      Alert.alert("Sem faixa livre", "A bancada final não possui faixa livre.");
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
                        <ActionButton
                          title="USAR FAIXA"
                          onPress={() => usarFaixaLivre(faixa)}
                        />
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
                          <ActionButton
                            title="CANCELAR OCUPAÇÃO (CORREÇÃO)"
                            onPress={() => handleCancelarOcupacao(item.id)}
                            variant="danger"
                            disabled={ocupacaoSelecionadaId !== item.id || !podeCancelarOcupacao}
                          />
                          {ocupacaoSelecionadaId === item.id && !!mensagemBloqueioCancelar ? (
                            <Text style={styles.feedbackBloqueio}>
                              {mensagemBloqueioCancelar}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              <Text style={styles.subsecao}>Registrar nova ocupação</Text>

              <SelectCardList
                title="Escolher lote"
                items={lotesAtivosOrdenados}
                selectedId={loteSelecionadoId}
                onSelect={setLoteSelecionadoId}
                emptyMessage="Nenhum lote ativo disponível."
                getTitle={(item) => {
                  const nivel = obterNivelSaldoLote(item);

                  if (nivel.tipo === "critico") {
                    return `${item.codigo_lote} • SALDO CRÍTICO`;
                  }

                  if (nivel.tipo === "baixo") {
                    return `${item.codigo_lote} • SALDO BAIXO`;
                  }

                  return item.codigo_lote;
                }}
                getSubtitle={(item) => {
                  const nivel = obterNivelSaldoLote(item);
                  return `${item.variedade_nome} | Saldo disponível: ${item.saldo_disponivel_para_ocupar} | ${nivel.label}`;
                }}
              />

              {loteSelecionado ? (
                <View
                  style={[
                    styles.cardSaldoLote,
                    saldoLoteSelecionado > 0 ? styles.cardSaldoOk : styles.cardSaldoZero
                  ]}
                >
                  <Text style={styles.cardTitulo}>Resumo do lote selecionado</Text>
                  <Text>Código: {loteSelecionado.codigo_lote}</Text>
                  <Text>Variedade: {loteSelecionado.variedade_nome}</Text>
                  <Text>Saldo disponível para nova ocupação: {saldoLoteSelecionado}</Text>
                  {maiorFaixaLivreAtual ? (
                    <Text>Maior faixa livre na bancada: {maiorFaixaLivreAtual.tamanho}</Text>
                  ) : (
                    <Text>Maior faixa livre na bancada: 0</Text>
                  )}
                  <Text style={styles.textoSuave}>
                    Você pode ocupar menos que o saldo, desde que a faixa seja válida.
                  </Text>
                </View>
              ) : (
                <Text style={styles.aviso}>
                  Selecione um lote para ver o saldo disponível antes de ocupar.
                </Text>
              )}

              <View style={{ marginBottom: 10 }}>
                <ActionButton
                  title="PREENCHER PELO SALDO DO LOTE"
                  onPress={() => {
                    if (!loteSelecionadoId) {
                      Alert.alert("Seleção obrigatória", "Selecione um lote primeiro.");
                      return;
                    }

                    if (!resumoCapacidade || !resumoCapacidade.faixasLivres.length) {
                      Alert.alert("Sem faixa livre", "Não existe faixa livre disponível.");
                      return;
                    }

                    const loteSelecionadoLocal = lotesAtivos.find(
                      (item) => item.id === loteSelecionadoId
                    );

                    if (!loteSelecionadoLocal) {
                      Alert.alert("Lote não encontrado", "Lote selecionado não encontrado.");
                      return;
                    }

                    const primeiraFaixa = resumoCapacidade.faixasLivres[0];
                    const saldoLote = Number(
                      loteSelecionadoLocal.saldo_disponivel_para_ocupar || 0
                    );
                    const qtd = Math.min(Number(primeiraFaixa.tamanho), saldoLote);

                    if (qtd <= 0) {
                      Alert.alert(
                        "Sem saldo",
                        "Esse lote não possui saldo disponível para ocupar."
                      );
                      return;
                    }

                    setQuantidadeAlocada(String(qtd));
                    setPosicaoInicial(String(primeiraFaixa.inicio));
                    setPosicaoFinal(String(primeiraFaixa.inicio + qtd - 1));
                  }}
                  disabled={!loteSelecionadoId || !faixaLivreAtualDisponivel || saldoLoteSelecionado <= 0}
                />
              </View>

              <Text style={styles.label}>Quantidade alocada</Text>
              <TextInput
                style={styles.input}
                value={quantidadeAlocada}
                onChangeText={setQuantidadeAlocada}
                keyboardType="numeric"
                placeholder={
                  saldoLoteSelecionado > 0
                    ? `Máximo pelo saldo: ${saldoLoteSelecionado}`
                    : "Informe a quantidade a ocupar"
                }
              />

              {loteSelecionado && quantidadeAlocada ? (
                <View style={styles.cardSugestao}>
                  <Text style={styles.cardTitulo}>Validação prévia do saldo</Text>
                  <Text>Saldo do lote: {saldoLoteSelecionado}</Text>
                  <Text>Quantidade informada: {Number(quantidadeAlocada || 0)}</Text>
                  <Text>
                    Saldo após ocupação:{" "}
                    {Math.max(0, saldoLoteSelecionado - Number(quantidadeAlocada || 0))}
                  </Text>
                  {Number(quantidadeAlocada || 0) > saldoLoteSelecionado ? (
                    <Text style={styles.textoErro}>
                      A quantidade informada ultrapassa o saldo disponível do lote.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {faixaSugeridaAtual ? (
                <View style={styles.cardSugestao}>
                  <Text style={styles.cardTitulo}>Sugestão automática</Text>
                  <Text>
                    Usar de {faixaSugeridaAtual.inicio} até {faixaSugeridaAtual.fim}
                  </Text>
                  <Text>
                    Dentro da faixa livre {faixaSugeridaAtual.faixa_original_inicio} até{" "}
                    {faixaSugeridaAtual.faixa_original_fim}
                  </Text>
                  <Text>
                    Você pode aceitar essa sugestão ou informar uma faixa menor manualmente.
                  </Text>

                  <View style={{ marginTop: 8 }}>
                    <ActionButton
                      title="USAR SUGESTÃO"
                      onPress={usarFaixaSugeridaAtual}
                    />
                  </View>
                </View>
              ) : null}

              <View style={{ marginBottom: 10 }}>
                <ActionButton
                  title="USAR FAIXA INTEIRA RESTANTE"
                  onPress={usarFaixaInteiraRestante}
                  disabled={!loteSelecionadoId || !faixaLivreAtualDisponivel || saldoLoteSelecionado <= 0}
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

              {faixaInformadaAtual.valida ? (
                <View style={styles.cardSugestao}>
                  <Text>Tamanho da faixa informada: {faixaInformadaAtual.tamanho}</Text>
                </View>
              ) : null}

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

              {!!mensagemBloqueioOcupacao ? (
                <Text style={styles.feedbackBloqueio}>{mensagemBloqueioOcupacao}</Text>
              ) : (
                <Text style={styles.feedbackOk}>
                  Tudo certo para registrar a ocupação.
                </Text>
              )}

              <ActionButton
                title="REGISTRAR OCUPAÇÃO"
                onPress={handleRegistrarOcupacao}
                disabled={!podeRegistrarOcupacao}
              />

              {bancadaSelecionada?.tipo === "bercario" && (
                <>
                  <Text style={styles.subsecao}>Transplante para final</Text>

                  {ocupacaoSelecionada ? (
                    <View style={styles.cardSugestao}>
                      <Text style={styles.cardTitulo}>Origem do transplante</Text>
                      <Text>
                        Quantidade atual na origem: {ocupacaoSelecionada.quantidade_alocada}
                      </Text>
                      <Text>
                        Faixa atual: {ocupacaoSelecionada.posicao_inicial} até{" "}
                        {ocupacaoSelecionada.posicao_final}
                      </Text>
                      <Text style={styles.textoSuave}>
                        Você pode transplantar só uma parte, desde que a faixa destino seja válida.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.cardAviso}>
                      <Text style={styles.cardAvisoTexto}>
                        Selecione uma ocupação para iniciar o transplante.
                      </Text>
                    </View>
                  )}

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
                    <ActionButton
                      title="PREENCHER PRÓXIMA FAIXA LIVRE"
                      onPress={preencherProximaFaixaLivreDestino}
                      disabled={!ocupacaoSelecionada || !(resumoDestinoTransplante?.faixasLivres || []).length}
                    />
                  </View>

                  <View style={{ marginBottom: 8 }}>
                    <ActionButton
                      title="PREENCHER MAIOR FAIXA LIVRE"
                      onPress={preencherMaiorFaixaLivreDestino}
                      disabled={!ocupacaoSelecionada || !(resumoDestinoTransplante?.faixasLivres || []).length}
                    />
                  </View>

                  <Text style={styles.label}>Quantidade transplantada</Text>
                  <TextInput
                    style={styles.input}
                    value={quantidadeTransplantada}
                    onChangeText={setQuantidadeTransplantada}
                    keyboardType="numeric"
                    placeholder={
                      ocupacaoSelecionada
                        ? `Máximo na origem: ${ocupacaoSelecionada.quantidade_alocada}`
                        : "Informe a quantidade"
                    }
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
                      <Text style={styles.cardTitulo}>Sugestão automática no destino</Text>
                      <Text>
                        Usar de {faixaSugeridaDestino.inicio} até {faixaSugeridaDestino.fim}
                      </Text>
                      <Text>
                        Você pode aceitar essa sugestão ou informar uma faixa menor manualmente.
                      </Text>

                      <View style={{ marginTop: 8 }}>
                        <ActionButton
                          title="USAR SUGESTÃO DO DESTINO"
                          onPress={usarFaixaSugeridaDestino}
                        />
                      </View>
                    </View>
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

                  {faixaInformadaDestino.valida ? (
                    <View style={styles.cardSugestao}>
                      <Text>Tamanho da faixa destino: {faixaInformadaDestino.tamanho}</Text>
                    </View>
                  ) : null}

                  {!!mensagemBloqueioTransplante ? (
                    <Text style={styles.feedbackBloqueio}>{mensagemBloqueioTransplante}</Text>
                  ) : (
                    <Text style={styles.feedbackOk}>
                      Tudo certo para realizar o transplante.
                    </Text>
                  )}

                  <ActionButton
                    title="REALIZAR TRANSPLANTE"
                    onPress={handleTransplante}
                    disabled={!podeTransplantar}
                  />
                </>
              )}

              {bancadaSelecionada?.tipo === "final" && (
                <>
                  <Text style={styles.subsecao}>Colheita</Text>

                  {!ocupacaoSelecionada ? (
                    <View style={styles.cardAviso}>
                      <Text style={styles.cardAvisoTexto}>
                        Selecione uma ocupação para registrar a colheita.
                      </Text>
                    </View>
                  ) : null}

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
                    placeholder={
                      ocupacaoSelecionada
                        ? `Máximo na ocupação: ${ocupacaoSelecionada.quantidade_alocada}`
                        : "Informe a quantidade"
                    }
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

                  {!!mensagemBloqueioColheita ? (
                    <Text style={styles.feedbackBloqueio}>{mensagemBloqueioColheita}</Text>
                  ) : (
                    <Text style={styles.feedbackOk}>
                      Tudo certo para registrar a colheita.
                    </Text>
                  )}

                  <ActionButton
                    title="REGISTRAR COLHEITA"
                    onPress={handleColher}
                    disabled={!podeColher}
                  />

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
              <ActionButton
                title="FECHAR"
                onPress={() => setModalVisible(false)}
              />
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
  cardSaldoLote: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  cardSaldoOk: {
    borderColor: "#58d68d",
    backgroundColor: "#eefaf1"
  },
  cardSaldoZero: {
    borderColor: "#e74c3c",
    backgroundColor: "#fdecea"
  },
  cardAviso: {
    borderWidth: 1,
    borderColor: "#f5c06a",
    backgroundColor: "#fff7e8",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  cardAvisoTexto: {
    color: "#8a5b00"
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
  },
  textoAlerta: {
    marginTop: 6,
    color: "#c0392b",
    fontWeight: "600"
  },
  textoErro: {
    marginTop: 6,
    color: "#c0392b",
    fontWeight: "600"
  },
  textoSuave: {
    marginTop: 6,
    color: "#2c3e50"
  },
  feedbackBloqueio: {
    color: "#c0392b",
    marginBottom: 10,
    fontWeight: "600"
  },
  feedbackOk: {
    color: "#1e8449",
    marginBottom: 10,
    fontWeight: "600"
  },
  actionButton: {
    backgroundColor: "#2196F3",
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  actionButtonDanger: {
    backgroundColor: "#d32f2f"
  },
  actionButtonDisabled: {
    backgroundColor: "#9e9e9e"
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textTransform: "uppercase"
  },
  actionButtonTextDisabled: {
    color: "#f5f5f5",
    fontWeight: "bold",
    textTransform: "uppercase"
  }
});