import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Button
} from "react-native";
import {
  compartilharPdfEtiqueta,
  gerarPdfEtiqueta,
  listarLotesComerciaisParaEtiqueta,
  montarDadosEtiqueta
} from "../services/etiquetaService";
import { obterDadosUnidade } from "../services/unitDataService";
import OptionSelectField from "../components/OptionSelectField";

export default function EtiquetasScreen({ onVoltar }) {
  const [lotes, setLotes] = useState([]);
  const [loteComercialId, setLoteComercialId] = useState("");

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

  useEffect(() => {
    carregar();
  }, []);

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
      alert(error.message);
    }
  }

  const loteSelecionado = useMemo(
    () => lotes.find((item) => item.id === loteComercialId) || null,
    [lotes, loteComercialId]
  );

  async function handleMontarPreview() {
    try {
      if (!loteComercialId) {
        alert("Selecione um lote comercial.");
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
      alert(error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleGerarPdf() {
    try {
      if (!dadosEtiqueta) {
        alert("Monte a etiqueta primeiro.");
        return;
      }

      setCarregando(true);
      const resultado = await gerarPdfEtiqueta(dadosEtiqueta);
      alert(`PDF gerado com sucesso!\n${resultado.uri}`);
    } catch (error) {
      alert(error.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleCompartilhar() {
    try {
      if (!dadosEtiqueta) {
        alert("Monte a etiqueta primeiro.");
        return;
      }

      setCarregando(true);
      await compartilharPdfEtiqueta(dadosEtiqueta);
    } catch (error) {
      alert(error.message);
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
      {onVoltar ? <Button title="Voltar" onPress={onVoltar} /> : null}

      <Text style={styles.titulo}>Etiquetas térmicas</Text>

      <Text style={styles.subtitulo}>Selecionar lote comercial</Text>
      {lotes.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.card,
            loteComercialId === item.id && styles.cardSelecionado
          ]}
          onPress={() => setLoteComercialId(item.id)}
        >
          <Text style={styles.cardTitulo}>{item.codigo_lote_comercial}</Text>
          <Text>Variedade: {item.variedade_nome}</Text>
          <Text>Lote produção: {item.codigo_lote_producao}</Text>
          <Text>Disponível: {item.quantidade_disponivel}</Text>
        </TouchableOpacity>
      ))}

      {loteSelecionado ? (
        <View style={styles.cardDestaque}>
          <Text style={styles.cardTitulo}>Lote selecionado</Text>
          <Text>{loteSelecionado.codigo_lote_comercial}</Text>
          <Text>Variedade: {loteSelecionado.variedade_nome}</Text>
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

      <Text style={styles.label}>Data da embalagem</Text>
      <TextInput
        style={styles.input}
        value={dataEmbalagem}
        onChangeText={setDataEmbalagem}
        placeholder="YYYY-MM-DD"
      />

      <View style={{ marginBottom: 10 }}>
        <Button title="Usar data de hoje" onPress={preencherDataHoje} />
      </View>

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

      <Button
        title={carregando ? "Processando..." : "Montar preview"}
        onPress={handleMontarPreview}
        disabled={carregando}
      />

      <View style={{ height: 10 }} />

      <Button
        title="Gerar PDF"
        onPress={handleGerarPdf}
        disabled={!dadosEtiqueta || carregando}
      />

      <View style={{ height: 10 }} />

      <Button
        title="Compartilhar PDF"
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
            <Text>Colheita: {dadosEtiqueta.dataColheita}</Text>
            <Text>Embalagem: {dadosEtiqueta.dataEmbalagem}</Text>
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
  card: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  cardSelecionado: {
    borderColor: "#2e86de",
    backgroundColor: "#eaf3ff"
  },
  cardDestaque: {
    borderWidth: 1,
    borderColor: "#7fb3d5",
    backgroundColor: "#eef7fc",
    borderRadius: 8,
    padding: 12,
    marginTop: 12
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
  }
});