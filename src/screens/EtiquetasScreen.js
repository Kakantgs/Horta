import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  TouchableOpacity
} from "react-native";
import {
  compartilharPdfEtiqueta,
  gerarPdfEtiqueta,
  listarLotesComerciaisParaEtiqueta,
  montarDadosEtiqueta
} from "../services/etiquetaService";
import { obterDadosUnidade } from "../services/unitDataService";
import OptionSelectField from "../components/OptionSelectField";
import SelectCardList from "../components/SelectCardList";
import DatePickerField from "../components/DatePickerField";

const PAGE_SIZE_ETIQUETAS = 20;

function ActionButton({ title, onPress, disabled = false, variant = "primary" }) {
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
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

function formatarDataBR(dataISO) {
  if (!dataISO || !String(dataISO).includes("-")) return dataISO || "-";
  const [ano, mes, dia] = String(dataISO).split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function EtiquetasScreen({ onVoltar }) {
  const [lotes, setLotes] = useState([]);
  const [loteComercialId, setLoteComercialId] = useState("");

  const [buscaLote, setBuscaLote] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroVariedade, setFiltroVariedade] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE_ETIQUETAS);

  const [produtorNome, setProdutorNome] = useState("");
  const [produtorCnpj, setProdutorCnpj] = useState("");
  const [origemTexto, setOrigemTexto] = useState("");
  const [origemPadrao, setOrigemPadrao] = useState("");
  const [dataEmbalagem, setDataEmbalagem] = useState("");
  const [qrBaseUrl, setQrBaseUrl] = useState("https://seusite.com/rastreio");
  const [localProducao, setLocalProducao] = useState("");
  const [destino, setDestino] = useState("");
  const [certificacoes, setCertificacoes] = useState("");
  const [insumosUtilizados, setInsumosUtilizados] = useState("");
  const [layoutEtiqueta, setLayoutEtiqueta] = useState("100x150");

  const [dadosEtiqueta, setDadosEtiqueta] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const OPCOES_LAYOUT = [
    { label: "100 x 150 mm", value: "100x150" },
    { label: "80 x 100 mm", value: "80x100" }
  ];

  const OPCOES_STATUS = [
    { label: "Todos", value: "" },
    { label: "Disponível", value: "disponivel" },
    { label: "Parcial", value: "parcial" },
    { label: "Vendido", value: "vendido" }
  ];

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE_ETIQUETAS);
  }, [buscaLote, filtroStatus, filtroVariedade]);

  async function carregar() {
    try {
      const [listaLotes, dadosUnidade] = await Promise.all([
        listarLotesComerciaisParaEtiqueta(),
        obterDadosUnidade()
      ]);

      setLotes(listaLotes);
      setProdutorNome(dadosUnidade.produtor_nome || dadosUnidade.nome_unidade || "");
      setProdutorCnpj(dadosUnidade.cnpj || "");
      setOrigemPadrao(dadosUnidade.origem_padrao || "");
      setOrigemTexto(dadosUnidade.origem_padrao || "");
      setLocalProducao(dadosUnidade.local_producao_padrao || "");
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  const loteSelecionado = useMemo(
    () => lotes.find((item) => item.id === loteComercialId) || null,
    [lotes, loteComercialId]
  );

  const opcoesVariedade = useMemo(() => {
    const unicas = [...new Set(lotes.map((item) => item.variedade_nome).filter(Boolean))];

    return [
      { label: "Todas", value: "" },
      ...unicas
        .sort((a, b) => a.localeCompare(b))
        .map((nome) => ({ label: nome, value: nome }))
    ];
  }, [lotes]);

  const lotesFiltrados = useMemo(() => {
    const termo = buscaLote.trim().toLowerCase();

    let lista = [...lotes];

    if (termo) {
      lista = lista.filter((item) => {
        return (
          (item.codigo_lote_comercial || "").toLowerCase().includes(termo) ||
          (item.codigo_lote_producao || "").toLowerCase().includes(termo) ||
          (item.variedade_nome || "").toLowerCase().includes(termo)
        );
      });
    }

    if (filtroStatus) {
      lista = lista.filter(
        (item) => (item.status || "").toLowerCase() === filtroStatus.toLowerCase()
      );
    }

    if (filtroVariedade) {
      lista = lista.filter(
        (item) => (item.variedade_nome || "") === filtroVariedade
      );
    }

    lista.sort((a, b) => (b.data_formacao || "").localeCompare(a.data_formacao || ""));
    return lista;
  }, [lotes, buscaLote, filtroStatus, filtroVariedade]);

  const lotesVisiveis = useMemo(() => {
    return lotesFiltrados.slice(0, visibleCount);
  }, [lotesFiltrados, visibleCount]);

  async function handleMontarPreview() {
    try {
      if (!loteComercialId) {
        Alert.alert("Validação", "Selecione um lote comercial.");
        return;
      }

      setCarregando(true);

      const dados = await montarDadosEtiqueta({
        loteComercialId,
        produtorNome,
        produtorCnpj,
        origemTexto,
        origemPadrao,
        dataEmbalagem,
        qrBaseUrl,
        localProducao,
        destino,
        certificacoes,
        insumosUtilizados,
        layoutEtiqueta
      });

      setDadosEtiqueta(dados);
      setOrigemTexto(dados.origemTexto || "");
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleGerarPdf() {
    try {
      if (!dadosEtiqueta) {
        Alert.alert("Validação", "Monte a etiqueta primeiro.");
        return;
      }

      setCarregando(true);
      const resultado = await gerarPdfEtiqueta(dadosEtiqueta);
      Alert.alert("Sucesso", `PDF gerado com sucesso.\n${resultado.uri}`);
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleCompartilhar() {
    try {
      if (!dadosEtiqueta) {
        Alert.alert("Validação", "Monte a etiqueta primeiro.");
        return;
      }

      setCarregando(true);
      await compartilharPdfEtiqueta(dadosEtiqueta);
    } catch (error) {
      Alert.alert("Erro", error.message);
    } finally {
      setCarregando(false);
    }
  }

  function preencherDataHoje() {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    setDataEmbalagem(`${yyyy}-${mm}-${dd}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {onVoltar ? <ActionButton title="VOLTAR" onPress={onVoltar} /> : null}

      <Text style={styles.titulo}>Etiquetas térmicas</Text>

      <Text style={styles.subtitulo}>Selecionar lote comercial</Text>

      <Text style={styles.label}>Buscar lote</Text>
      <TextInput
        style={styles.input}
        value={buscaLote}
        onChangeText={setBuscaLote}
        placeholder="Código do lote, lote de produção ou variedade"
      />

      <OptionSelectField
        label="Filtrar por status"
        value={filtroStatus}
        onChange={setFiltroStatus}
        options={OPCOES_STATUS}
      />

      <OptionSelectField
        label="Filtrar por variedade"
        value={filtroVariedade}
        onChange={setFiltroVariedade}
        options={opcoesVariedade}
      />

      <Text style={styles.contadorLista}>
        Mostrando {lotesVisiveis.length} de {lotesFiltrados.length} lote(s) comerciais.
      </Text>

      <SelectCardList
        title="Escolher lote comercial"
        items={lotesVisiveis}
        selectedId={loteComercialId}
        onSelect={(id) => {
          setLoteComercialId(id);
          setDadosEtiqueta(null);
        }}
        emptyMessage="Nenhum lote comercial encontrado."
        getTitle={(item) => item.codigo_lote_comercial}
        getSubtitle={(item) =>
          `${item.variedade_nome} | Produção: ${item.codigo_lote_producao}\nFormação: ${formatarDataBR(item.data_formacao)} | Disponível: ${item.quantidade_disponivel} | Status: ${item.status}`
        }
      />

      {lotesVisiveis.length < lotesFiltrados.length ? (
        <ActionButton
          title={`CARREGAR MAIS LOTES (+${PAGE_SIZE_ETIQUETAS})`}
          onPress={() => setVisibleCount((prev) => prev + PAGE_SIZE_ETIQUETAS)}
        />
      ) : null}

      {loteSelecionado ? (
        <View style={styles.cardDestaque}>
          <Text style={styles.cardTitulo}>Lote selecionado</Text>
          <Text>Lote comercial: {loteSelecionado.codigo_lote_comercial}</Text>
          <Text>Variedade: {loteSelecionado.variedade_nome}</Text>
          <Text>Lote produção: {loteSelecionado.codigo_lote_producao}</Text>
          <Text>Data de formação: {formatarDataBR(loteSelecionado.data_formacao)}</Text>
          <Text>Disponível: {loteSelecionado.quantidade_disponivel}</Text>
          <Text>Status: {loteSelecionado.status}</Text>
        </View>
      ) : null}

      <Text style={styles.subtitulo}>Configuração da etiqueta</Text>

      <OptionSelectField
        label="Layout"
        value={layoutEtiqueta}
        onChange={setLayoutEtiqueta}
        options={OPCOES_LAYOUT}
      />

      <Text style={styles.label}>Produtor</Text>
      <TextInput style={styles.input} value={produtorNome} onChangeText={setProdutorNome} />

      <Text style={styles.label}>CNPJ</Text>
      <TextInput style={styles.input} value={produtorCnpj} onChangeText={setProdutorCnpj} />

      <Text style={styles.label}>Origem automática</Text>
      <TextInput
        style={styles.input}
        value={origemTexto}
        onChangeText={setOrigemTexto}
        placeholder="Será preenchida automaticamente"
      />

      <DatePickerField
        label="Data da embalagem"
        value={dataEmbalagem}
        onChange={setDataEmbalagem}
        placeholder="Selecionar data"
      />

      <ActionButton title="USAR DATA DE HOJE" onPress={preencherDataHoje} />

      <Text style={styles.label}>URL base do QR</Text>
      <TextInput
        style={styles.input}
        value={qrBaseUrl}
        onChangeText={setQrBaseUrl}
        placeholder="https://seusite.com/rastreio"
      />

      <Text style={styles.label}>Local da produção</Text>
      <TextInput
        style={styles.input}
        value={localProducao}
        onChangeText={setLocalProducao}
        placeholder="Ex: Estufa 1"
      />

      <Text style={styles.label}>Destino</Text>
      <TextInput
        style={styles.input}
        value={destino}
        onChangeText={setDestino}
        placeholder="Opcional"
      />

      <Text style={styles.label}>Certificações</Text>
      <TextInput
        style={styles.input}
        value={certificacoes}
        onChangeText={setCertificacoes}
        placeholder="Opcional"
      />

      <Text style={styles.label}>Insumos utilizados</Text>
      <TextInput
        style={[styles.input, { minHeight: 80 }]}
        value={insumosUtilizados}
        onChangeText={setInsumosUtilizados}
        multiline
        placeholder="Opcional"
      />

      <ActionButton
        title={carregando ? "PROCESSANDO..." : "MONTAR PREVIEW"}
        onPress={handleMontarPreview}
        disabled={carregando}
      />

      <ActionButton
        title="GERAR PDF"
        onPress={handleGerarPdf}
        disabled={!dadosEtiqueta || carregando}
      />

      <ActionButton
        title="COMPARTILHAR PDF"
        onPress={handleCompartilhar}
        disabled={!dadosEtiqueta || carregando}
      />

      {dadosEtiqueta ? (
        <>
          <Text style={styles.subtitulo}>Preview textual</Text>
          <View style={styles.cardDestaque}>
            <Text style={styles.previewProduto}>{dadosEtiqueta.produto}</Text>
            <Text>Layout: {dadosEtiqueta.layoutEtiqueta}</Text>
            <Text>Variedade: {dadosEtiqueta.variedade}</Text>
            <Text>Produtor: {dadosEtiqueta.produtorNome}</Text>
            <Text>CNPJ: {dadosEtiqueta.produtorCnpj || "-"}</Text>
            <Text>Origem: {dadosEtiqueta.origemTexto || "-"}</Text>
            <Text style={styles.previewLote}>Lote: {dadosEtiqueta.lote}</Text>
            <Text>Colheita: {formatarDataBR(dadosEtiqueta.dataColheita)}</Text>
            <Text>Embalagem: {formatarDataBR(dadosEtiqueta.dataEmbalagem)}</Text>
            <Text>
              Última final:{" "}
              {dadosEtiqueta.ultimaFinal?.bancada?.codigo
                ? `${dadosEtiqueta.ultimaFinal.bancada.codigo}`
                : "-"}
            </Text>
          </View>
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
    marginTop: 20,
    marginBottom: 10
  },
  contadorLista: {
    color: "#555",
    marginBottom: 8,
    fontWeight: "600"
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
  },
  cardDestaque: {
    borderWidth: 1,
    borderColor: "#7fb3d5",
    backgroundColor: "#eef7fc",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12
  },
  cardTitulo: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4
  },
  previewProduto: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8
  },
  previewLote: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10
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