import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import SelectCardList from "../components/SelectCardList";
import {
  buscarAuditoriaCompletaPorLote,
  listarLotesParaAuditoria
} from "../services/auditoriaService";
import {
  calcularDiasDesdeEntrada,
  calcularDiasNaOcupacao,
  obterStatusVisualLote
} from "../services/statusLoteService";
import {
  compartilharPdfAuditoria,
  gerarPdfAuditoriaPorLote
} from "../services/relatorioAuditoriaService";

const PAGE_SIZE_LOTES = 20;

function ActionButton({ title, onPress, disabled = false, variant = "primary" }) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        variant === "danger" && styles.actionButtonDanger,
        variant === "secondary" && styles.actionButtonSecondary,
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

function SectionToggle({ title, count = 0, isOpen, onToggle }) {
  return (
    <TouchableOpacity style={styles.sectionToggle} onPress={onToggle}>
      <Text style={styles.sectionToggleTitle}>
        {title} {count > 0 ? `(${count})` : ""}
      </Text>
      <Text style={styles.sectionToggleArrow}>{isOpen ? "▲" : "▼"}</Text>
    </TouchableOpacity>
  );
}

function formatarDataBR(dataISO) {
  if (!dataISO || !String(dataISO).includes("-")) return dataISO || "-";
  const [ano, mes, dia] = String(dataISO).split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function HistoricoScreen() {
  const [lotes, setLotes] = useState([]);
  const [busca, setBusca] = useState("");
  const [loteSelecionadoId, setLoteSelecionadoId] = useState("");
  const [auditoria, setAuditoria] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [visibleLotesCount, setVisibleLotesCount] = useState(PAGE_SIZE_LOTES);

  const [secoesAbertas, setSecoesAbertas] = useState({
    timeline: true,
    ocupacoes: true,
    movimentacoes: false,
    monitoramentos: false,
    ocorrencias: false,
    colheitas: false,
    lotesComerciais: false,
    vendas: false
  });

  useEffect(() => {
    carregarLotes();
  }, []);

  useEffect(() => {
    setVisibleLotesCount(PAGE_SIZE_LOTES);
  }, [busca]);

  async function carregarLotes() {
    try {
      const lista = await listarLotesParaAuditoria();
      setLotes(lista);
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  async function abrirAuditoria(loteId) {
    try {
      setCarregando(true);
      setLoteSelecionadoId(loteId);

      const resultado = await buscarAuditoriaCompletaPorLote(loteId);
      setAuditoria(resultado);
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setCarregando(false);
    }
  }

  function limparSelecao() {
    setLoteSelecionadoId("");
    setAuditoria(null);
  }

  async function handleGerarPdf() {
    try {
      if (!loteSelecionadoId) {
        Alert.alert("Validação", "Selecione um lote primeiro.");
        return;
      }

      setGerandoPdf(true);

      const resultado = await gerarPdfAuditoriaPorLote(loteSelecionadoId);
      Alert.alert("Sucesso", `PDF gerado com sucesso.\nArquivo: ${resultado.uri}`);
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setGerandoPdf(false);
    }
  }

  async function handleCompartilharPdf() {
    try {
      if (!loteSelecionadoId) {
        Alert.alert("Validação", "Selecione um lote primeiro.");
        return;
      }

      setGerandoPdf(true);

      const resultado = await gerarPdfAuditoriaPorLote(loteSelecionadoId);
      await compartilharPdfAuditoria(resultado.uri);
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setGerandoPdf(false);
    }
  }

  function toggleSecao(chave) {
    setSecoesAbertas((prev) => ({
      ...prev,
      [chave]: !prev[chave]
    }));
  }

  function obterStatusVisualAuditoriaOcupacao(item) {
    const diasEntrada = calcularDiasDesdeEntrada(auditoria?.lote?.data_formacao);
    const diasOcupacao = calcularDiasNaOcupacao(item.data_inicio, item.data_fim);

    const statusVisual = obterStatusVisualLote({
      lote: auditoria?.lote,
      bancadaTipo: item?.bancada?.tipo,
      diasDesdeEntrada: diasEntrada,
      diasNaOcupacao: diasOcupacao,
      temColheita: (auditoria?.colheitas || []).length > 0
    });

    return {
      diasEntrada,
      diasOcupacao,
      statusVisual
    };
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

  function obterBadgeStatusLote(status) {
    const valor = String(status || "").toLowerCase();

    if (valor === "colhido" || valor === "vendido") {
      return { text: status, variant: "neutral" };
    }

    if (valor === "ativo" || valor === "disponivel") {
      return { text: status, variant: "success" };
    }

    if (valor === "parcial") {
      return { text: status, variant: "warning" };
    }

    if (valor === "encerrada" || valor === "transplantado") {
      return { text: status, variant: "info" };
    }

    return { text: status || "Sem status", variant: "neutral" };
  }

  const lotesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lotes;

    return lotes.filter((item) => {
      return (
        (item.codigo_lote || "").toLowerCase().includes(termo) ||
        (item.variedade_nome || "").toLowerCase().includes(termo) ||
        (item.status || "").toLowerCase().includes(termo)
      );
    });
  }, [lotes, busca]);

  const lotesVisiveis = useMemo(() => {
    return lotesFiltrados.slice(0, visibleLotesCount);
  }, [lotesFiltrados, visibleLotesCount]);

  const timeline = useMemo(() => {
    if (!auditoria) return [];

    const eventos = [];

    if (auditoria.entrada) {
      eventos.push({
        id: `entrada-${auditoria.entrada.id}`,
        data: auditoria.entrada.data_entrada,
        tipo: "entrada",
        titulo: "Entrada do lote",
        detalhe: `Fornecedor: ${auditoria.fornecedor?.nome || "-"}`
      });
    }

    auditoria.ocupacoes.forEach((item) => {
      eventos.push({
        id: `ocupacao-${item.id}`,
        data: item.data_inicio,
        tipo: "ocupacao",
        titulo: `Ocupação em ${item.bancada?.codigo || item.bancada_id}`,
        detalhe: `Faixa ${item.posicao_inicial}-${item.posicao_final} | Quantidade ${item.quantidade_alocada}`
      });
    });

    auditoria.movimentacoes.forEach((item) => {
      eventos.push({
        id: `mov-${item.id}`,
        data: item.data_movimentacao,
        tipo: "movimentacao",
        titulo: `Movimentação: ${item.tipo_movimentacao}`,
        detalhe: `Quantidade ${item.quantidade_movimentada}`
      });
    });

    auditoria.colheitas.forEach((item) => {
      eventos.push({
        id: `colheita-${item.id}`,
        data: item.data_colheita,
        tipo: "colheita",
        titulo: "Colheita",
        detalhe: `Colhida ${item.quantidade_colhida} | Perda ${item.quantidade_perda}`
      });
    });

    auditoria.pedidos.forEach((pedido) => {
      eventos.push({
        id: `pedido-${pedido.id}`,
        data: pedido.data_venda,
        tipo: "venda",
        titulo: `Venda para ${pedido.cliente?.nome || pedido.cliente_nome || "-"}`,
        detalhe: `Pedido ${pedido.id}`
      });
    });

    return eventos.sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  }, [auditoria]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Histórico / Auditoria</Text>

      <Text style={styles.label}>Buscar lote</Text>
      <TextInput
        style={styles.input}
        value={busca}
        onChangeText={setBusca}
        placeholder="Ex: LOT-20260319... ou Crespa"
      />

      <Text style={styles.contadorLista}>
        Mostrando {lotesVisiveis.length} de {lotesFiltrados.length} lote(s)
      </Text>

      <SelectCardList
        title="Lotes"
        items={lotesVisiveis}
        selectedId={loteSelecionadoId}
        onSelect={abrirAuditoria}
        emptyMessage="Nenhum lote encontrado."
        getTitle={(item) => item.codigo_lote}
        getSubtitle={(item) =>
          `${item.variedade_nome || "-"} | Formação: ${formatarDataBR(item.data_formacao)}`
        }
        getMeta={(item) =>
          `Status: ${item.status || "-"} | Quantidade inicial: ${item.quantidade_inicial || 0}`
        }
        getBadgeText={(item) => obterBadgeStatusLote(item.status).text}
        getBadgeVariant={(item) => obterBadgeStatusLote(item.status).variant}
      />

      {lotesVisiveis.length < lotesFiltrados.length ? (
        <ActionButton
          title={`CARREGAR MAIS LOTES (+${PAGE_SIZE_LOTES})`}
          onPress={() => setVisibleLotesCount((prev) => prev + PAGE_SIZE_LOTES)}
        />
      ) : null}

      {carregando ? <Text style={styles.aviso}>Carregando auditoria...</Text> : null}

      {auditoria ? (
        <>
          <View style={styles.linhaBotoes}>
            <View style={styles.botaoAcao}>
              <ActionButton title="LIMPAR SELEÇÃO" onPress={limparSelecao} />
            </View>

            <View style={styles.botaoAcao}>
              <ActionButton
                title={gerandoPdf ? "GERANDO PDF..." : "GERAR PDF"}
                onPress={handleGerarPdf}
                disabled={gerandoPdf}
              />
            </View>

            <View style={styles.botaoAcao}>
              <ActionButton
                title={gerandoPdf ? "COMPARTILHANDO..." : "COMPARTILHAR PDF"}
                onPress={handleCompartilharPdf}
                disabled={gerandoPdf}
              />
            </View>
          </View>

          <Text style={styles.subtitulo}>Resumo do lote</Text>
          <View style={styles.cardDestaque}>
            <Text style={styles.cardTitulo}>{auditoria.lote.codigo_lote}</Text>
            <Text>Variedade: {auditoria.lote.variedade_nome}</Text>
            <Text>Data formação: {formatarDataBR(auditoria.lote.data_formacao)}</Text>
            <Text>Quantidade inicial: {auditoria.lote.quantidade_inicial}</Text>
            <Text>
              Saldo disponível para ocupar:{" "}
              {auditoria.lote.saldo_disponivel_para_ocupar ??
                auditoria.lote.quantidade_atual}
            </Text>
            <Text>Status: {auditoria.lote.status}</Text>
            <Text>Entrada: {auditoria.entrada?.id || "-"}</Text>
            <Text>Fornecedor: {auditoria.fornecedor?.nome || "-"}</Text>
            <Text>Data entrada: {formatarDataBR(auditoria.entrada?.data_entrada || "-")}</Text>
            <Text>Lote fornecedor: {auditoria.entrada?.lote_fornecedor || "-"}</Text>
          </View>

          <SectionToggle
            title="Linha do tempo"
            count={timeline.length}
            isOpen={secoesAbertas.timeline}
            onToggle={() => toggleSecao("timeline")}
          />
          {secoesAbertas.timeline ? (
            timeline.length === 0 ? (
              <Text style={styles.aviso}>Nenhum evento encontrado.</Text>
            ) : (
              timeline.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitulo}>{item.titulo}</Text>
                  <Text>Data: {formatarDataBR(item.data || "-")}</Text>
                  <Text>Tipo: {item.tipo}</Text>
                  <Text>{item.detalhe}</Text>
                </View>
              ))
            )
          ) : null}

          <SectionToggle
            title="Ocupações"
            count={auditoria.ocupacoes.length}
            isOpen={secoesAbertas.ocupacoes}
            onToggle={() => toggleSecao("ocupacoes")}
          />
          {secoesAbertas.ocupacoes ? (
            auditoria.ocupacoes.length === 0 ? (
              <Text style={styles.aviso}>Nenhuma ocupação encontrada.</Text>
            ) : (
              auditoria.ocupacoes.map((item) => {
                const resumo = obterStatusVisualAuditoriaOcupacao(item);

                return (
                  <View key={item.id} style={styles.card}>
                    <Text style={styles.cardTitulo}>{item.id}</Text>
                    <Text>Bancada: {item.bancada?.codigo || item.bancada_id}</Text>
                    <Text>Tipo bancada: {item.bancada?.tipo || "-"}</Text>
                    <Text>Setor: {item.setor?.codigo || "-"}</Text>
                    <Text>
                      Faixa: {item.posicao_inicial} até {item.posicao_final}
                    </Text>
                    <Text>Quantidade: {item.quantidade_alocada}</Text>
                    <Text>Data início: {formatarDataBR(item.data_inicio)}</Text>
                    <Text>Data fim: {formatarDataBR(item.data_fim || "-")}</Text>
                    <Text>Tipo ocupação: {item.tipo_ocupacao}</Text>
                    <Text>Status do banco: {item.status}</Text>
                    <Text>Dias na ocupação: {resumo.diasOcupacao}</Text>
                    <Text>Dias desde a entrada: {resumo.diasEntrada}</Text>

                    <View
                      style={[
                        styles.badgeStatus,
                        { backgroundColor: obterCorStatusVisual(resumo.statusVisual) }
                      ]}
                    >
                      <Text style={styles.badgeStatusTexto}>{resumo.statusVisual}</Text>
                    </View>
                  </View>
                );
              })
            )
          ) : null}

          <SectionToggle
            title="Movimentações"
            count={auditoria.movimentacoes.length}
            isOpen={secoesAbertas.movimentacoes}
            onToggle={() => toggleSecao("movimentacoes")}
          />
          {secoesAbertas.movimentacoes ? (
            auditoria.movimentacoes.length === 0 ? (
              <Text style={styles.aviso}>Nenhuma movimentação encontrada.</Text>
            ) : (
              auditoria.movimentacoes.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitulo}>{item.id}</Text>
                  <Text>Tipo: {item.tipo_movimentacao}</Text>
                  <Text>Quantidade: {item.quantidade_movimentada}</Text>
                  <Text>Data: {formatarDataBR(item.data_movimentacao)}</Text>
                  <Text>Bancada origem: {item.bancada_origem_id || "-"}</Text>
                  <Text>Bancada destino: {item.bancada_destino_id || "-"}</Text>
                  <Text>Ocupação origem: {item.ocupacao_origem_id || "-"}</Text>
                  <Text>Ocupação destino: {item.ocupacao_destino_id || "-"}</Text>
                </View>
              ))
            )
          ) : null}

          <SectionToggle
            title="Monitoramentos por setor"
            count={auditoria.monitoramentos.length}
            isOpen={secoesAbertas.monitoramentos}
            onToggle={() => toggleSecao("monitoramentos")}
          />
          {secoesAbertas.monitoramentos ? (
            auditoria.monitoramentos.length === 0 ? (
              <Text style={styles.aviso}>Nenhum monitoramento encontrado.</Text>
            ) : (
              auditoria.monitoramentos.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitulo}>
                    {item.data_hora_monitoramento || item.id}
                  </Text>
                  <Text>Setor: {item.setor_codigo || item.setor_id || "-"}</Text>
                  <Text>pH: {item.ph ?? "-"}</Text>
                  <Text>CE: {item.ce ?? "-"}</Text>
                  <Text>Temperatura: {item.temperatura_agua ?? "-"}</Text>
                  <Text>Obs.: {item.observacoes || "-"}</Text>
                </View>
              ))
            )
          ) : null}

          <SectionToggle
            title="Ocorrências por setor"
            count={auditoria.ocorrencias.length}
            isOpen={secoesAbertas.ocorrencias}
            onToggle={() => toggleSecao("ocorrencias")}
          />
          {secoesAbertas.ocorrencias ? (
            auditoria.ocorrencias.length === 0 ? (
              <Text style={styles.aviso}>Nenhuma ocorrência encontrada.</Text>
            ) : (
              auditoria.ocorrencias.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitulo}>{item.tipo_ocorrencia || item.id}</Text>
                  <Text>Setor: {item.setor_codigo || item.setor_id || "-"}</Text>
                  <Text>Descrição: {item.descricao || "-"}</Text>
                  <Text>Ação corretiva: {item.acao_corretiva || "-"}</Text>
                  <Text>Data/hora: {item.data_hora_ocorrencia || "-"}</Text>
                  <Text>Status: {item.status || "-"}</Text>
                </View>
              ))
            )
          ) : null}

          <SectionToggle
            title="Colheitas"
            count={auditoria.colheitas.length}
            isOpen={secoesAbertas.colheitas}
            onToggle={() => toggleSecao("colheitas")}
          />
          {secoesAbertas.colheitas ? (
            auditoria.colheitas.length === 0 ? (
              <Text style={styles.aviso}>Nenhuma colheita encontrada.</Text>
            ) : (
              auditoria.colheitas.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitulo}>{item.id}</Text>
                  <Text>Data colheita: {formatarDataBR(item.data_colheita)}</Text>
                  <Text>Ocupação: {item.ocupacao_bancada_id}</Text>
                  <Text>Quantidade colhida: {item.quantidade_colhida}</Text>
                  <Text>Quantidade perda: {item.quantidade_perda}</Text>
                  <Text>Tipo: {item.tipo_colheita}</Text>
                </View>
              ))
            )
          ) : null}

          <SectionToggle
            title="Lotes comerciais"
            count={auditoria.lotes_comerciais.length}
            isOpen={secoesAbertas.lotesComerciais}
            onToggle={() => toggleSecao("lotesComerciais")}
          />
          {secoesAbertas.lotesComerciais ? (
            auditoria.lotes_comerciais.length === 0 ? (
              <Text style={styles.aviso}>Nenhum lote comercial encontrado.</Text>
            ) : (
              auditoria.lotes_comerciais.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitulo}>{item.codigo_lote_comercial}</Text>
                  <Text>Data formação: {formatarDataBR(item.data_formacao)}</Text>
                  <Text>Quantidade inicial: {item.quantidade_inicial}</Text>
                  <Text>Quantidade disponível: {item.quantidade_disponivel}</Text>
                  <Text>Status: {item.status}</Text>
                </View>
              ))
            )
          ) : null}

          <SectionToggle
            title="Vendas"
            count={auditoria.pedidos.length}
            isOpen={secoesAbertas.vendas}
            onToggle={() => toggleSecao("vendas")}
          />
          {secoesAbertas.vendas ? (
            auditoria.pedidos.length === 0 ? (
              <Text style={styles.aviso}>Nenhuma venda encontrada.</Text>
            ) : (
              auditoria.pedidos.map((pedido) => (
                <View key={pedido.id} style={styles.card}>
                  <Text style={styles.cardTitulo}>{pedido.id}</Text>
                  <Text>Cliente: {pedido.cliente?.nome || pedido.cliente_nome || "-"}</Text>
                  <Text>Data venda: {formatarDataBR(pedido.data_venda)}</Text>
                  <Text>Status: {pedido.status}</Text>

                  <Text style={styles.subItemTitulo}>Itens</Text>
                  {pedido.itens.map((item) => (
                    <View key={item.id} style={styles.itemBox}>
                      <Text>Lote comercial: {item.codigo_lote_comercial}</Text>
                      <Text>Quantidade: {item.quantidade}</Text>
                      <Text>Preço unitário: {item.preco_unitario}</Text>
                    </View>
                  ))}
                </View>
              ))
            )
          ) : null}
        </>
      ) : null}
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
  subtitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12
  },
  label: {
    fontWeight: "bold",
    marginBottom: 6
  },
  contadorLista: {
    color: "#555",
    marginBottom: 8,
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  aviso: {
    color: "#666",
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
  subItemTitulo: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6
  },
  itemBox: {
    backgroundColor: "#f8f9f9",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6
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
  linhaBotoes: {
    marginBottom: 12
  },
  botaoAcao: {
    marginBottom: 8
  },
  sectionToggle: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    marginTop: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionToggleTitle: {
    fontWeight: "bold",
    fontSize: 15
  },
  sectionToggleArrow: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#555"
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
  actionButtonSecondary: {
    backgroundColor: "#1976d2"
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