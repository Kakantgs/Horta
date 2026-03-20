import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Button
} from "react-native";
import { buscarAuditoria } from "../services/historicoService";

export default function HistoricoScreen() {
  const [termoLoteProducao, setTermoLoteProducao] = useState("");
  const [termoLoteComercial, setTermoLoteComercial] = useState("");
  const [termoCliente, setTermoCliente] = useState("");
  const [relatorios, setRelatorios] = useState([]);

  async function handleBuscar() {
    try {
      const resultado = await buscarAuditoria({
        termoLoteProducao,
        termoLoteComercial,
        termoCliente
      });

      setRelatorios(resultado);
    } catch (error) {
      alert(error.message);
    }
  }

  function limparBusca() {
    setTermoLoteProducao("");
    setTermoLoteComercial("");
    setTermoCliente("");
    setRelatorios([]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Histórico / Auditoria</Text>
      <Text style={styles.subtitulo}>
        Consulte a rastreabilidade completa da produção e da venda.
      </Text>

      <Text style={styles.label}>Buscar por lote de produção</Text>
      <TextInput
        style={styles.input}
        value={termoLoteProducao}
        onChangeText={setTermoLoteProducao}
        placeholder="Ex: LOT-20260310-ALFACE..."
      />

      <Text style={styles.label}>Buscar por lote comercial</Text>
      <TextInput
        style={styles.input}
        value={termoLoteComercial}
        onChangeText={setTermoLoteComercial}
        placeholder="Ex: LCOM-20260320-001"
      />

      <Text style={styles.label}>Buscar por cliente</Text>
      <TextInput
        style={styles.input}
        value={termoCliente}
        onChangeText={setTermoCliente}
        placeholder="Ex: Mercado X"
      />

      <Button title="Buscar auditoria" onPress={handleBuscar} />
      <View style={{ height: 10 }} />
      <Button title="Limpar" onPress={limparBusca} />

      <Text style={styles.secao}>Resultados</Text>

      {relatorios.length === 0 ? (
        <Text style={styles.aviso}>Nenhum resultado carregado.</Text>
      ) : (
        relatorios.map((relatorio) => (
          <View
            key={relatorio.lote_producao.id}
            style={styles.cardPrincipal}
          >
            <Text style={styles.cardTitulo}>
              {relatorio.lote_producao.codigo_lote}
            </Text>
            <Text>Status do lote: {relatorio.lote_producao.status}</Text>
            <Text>Tipo do lote: {relatorio.lote_producao.tipo_lote}</Text>
            <Text>Quantidade inicial: {relatorio.lote_producao.quantidade_inicial}</Text>
            <Text>Quantidade atual: {relatorio.lote_producao.quantidade_atual}</Text>

            <Text style={styles.subsecao}>Origem</Text>
            <Text>Entrada ID: {relatorio.entrada?.id || "-"}</Text>
            <Text>Data de entrada: {relatorio.entrada?.data_entrada || "-"}</Text>
            <Text>Fornecedor: {relatorio.fornecedor?.nome || "-"}</Text>
            <Text>Variedade: {relatorio.variedade?.nome || relatorio.lote_producao.variedade_nome || "-"}</Text>
            <Text>Lote do fornecedor: {relatorio.entrada?.lote_fornecedor || "-"}</Text>

            <Text style={styles.subsecao}>Ocupações</Text>
            {relatorio.ocupacoes.length === 0 ? (
              <Text style={styles.textoVazio}>Nenhuma ocupação.</Text>
            ) : (
              relatorio.ocupacoes.map((item) => (
                <View key={item.id} style={styles.blocoInterno}>
                  <Text>ID: {item.id}</Text>
                  <Text>Bancada ID: {item.bancada_id}</Text>
                  <Text>Posição: {item.posicao_inicial} até {item.posicao_final}</Text>
                  <Text>Quantidade: {item.quantidade_alocada}</Text>
                  <Text>Data início: {item.data_inicio}</Text>
                  <Text>Data fim: {item.data_fim || "-"}</Text>
                  <Text>Tipo: {item.tipo_ocupacao}</Text>
                  <Text>Status: {item.status}</Text>
                  <Text>Origem da ocupação: {item.ocupacao_origem_id || "-"}</Text>
                </View>
              ))
            )}

            <Text style={styles.subsecao}>Monitoramentos</Text>
            {relatorio.monitoramentos.length === 0 ? (
              <Text style={styles.textoVazio}>Nenhum monitoramento.</Text>
            ) : (
              relatorio.monitoramentos.map((item) => (
                <View key={item.id} style={styles.blocoInterno}>
                  <Text>Data/hora: {item.data_hora}</Text>
                  <Text>Bancada ID: {item.bancada_id}</Text>
                  <Text>pH: {item.ph}</Text>
                  <Text>CE: {item.ce}</Text>
                  <Text>Temperatura água: {item.temperatura_agua ?? "-"}</Text>
                  <Text>Obs.: {item.observacoes || "-"}</Text>
                </View>
              ))
            )}

            <Text style={styles.subsecao}>Ocorrências</Text>
            {relatorio.ocorrencias.length === 0 ? (
              <Text style={styles.textoVazio}>Nenhuma ocorrência.</Text>
            ) : (
              relatorio.ocorrencias.map((item) => (
                <View key={item.id} style={styles.blocoInterno}>
                  <Text>Tipo: {item.tipo_ocorrencia}</Text>
                  <Text>Data/hora: {item.data_hora}</Text>
                  <Text>Descrição: {item.descricao}</Text>
                  <Text>Ação corretiva: {item.acao_corretiva || "-"}</Text>
                  <Text>Status: {item.status}</Text>
                </View>
              ))
            )}

            <Text style={styles.subsecao}>Colheitas</Text>
            {relatorio.colheitas.length === 0 ? (
              <Text style={styles.textoVazio}>Nenhuma colheita.</Text>
            ) : (
              relatorio.colheitas.map((item) => (
                <View key={item.id} style={styles.blocoInterno}>
                  <Text>ID: {item.id}</Text>
                  <Text>Data: {item.data_colheita}</Text>
                  <Text>Qtd. colhida: {item.quantidade_colhida}</Text>
                  <Text>Qtd. perda: {item.quantidade_perda}</Text>
                  <Text>Tipo: {item.tipo_colheita}</Text>
                </View>
              ))
            )}

            <Text style={styles.subsecao}>Lotes comerciais</Text>
            {relatorio.lotes_comerciais.length === 0 ? (
              <Text style={styles.textoVazio}>Nenhum lote comercial.</Text>
            ) : (
              relatorio.lotes_comerciais.map((item) => (
                <View key={item.id} style={styles.blocoInterno}>
                  <Text>Código: {item.codigo_lote_comercial}</Text>
                  <Text>Data formação: {item.data_formacao}</Text>
                  <Text>Qtd. inicial: {item.quantidade_inicial}</Text>
                  <Text>Qtd. disponível: {item.quantidade_disponivel}</Text>
                  <Text>Status: {item.status}</Text>
                </View>
              ))
            )}

            <Text style={styles.subsecao}>Destino / vendas</Text>
            {relatorio.destinos.length === 0 ? (
              <Text style={styles.textoVazio}>Nenhuma venda encontrada.</Text>
            ) : (
              relatorio.destinos.map((destino) => (
                <View key={destino.pedido.id} style={styles.blocoInterno}>
                  <Text>Pedido: {destino.pedido.id}</Text>
                  <Text>Cliente: {destino.cliente?.nome || destino.pedido.cliente_nome || "-"}</Text>
                  <Text>Data venda: {destino.pedido.data_venda}</Text>
                  <Text>Status pedido: {destino.pedido.status}</Text>

                  {destino.itens.map((item) => (
                    <View key={item.id} style={styles.itemInterno}>
                      <Text>Lote comercial: {item.codigo_lote_comercial}</Text>
                      <Text>Quantidade: {item.quantidade}</Text>
                      <Text>Preço unitário: {item.preco_unitario}</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        ))
      )}
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
    marginBottom: 6
  },
  subtitulo: {
    textAlign: "center",
    color: "#555",
    marginBottom: 20
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
  secao: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10
  },
  aviso: {
    color: "#666"
  },
  cardPrincipal: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#fff"
  },
  cardTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8
  },
  subsecao: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 8
  },
  blocoInterno: {
    borderWidth: 1,
    borderColor: "#e1e4e8",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#fafafa"
  },
  itemInterno: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f3f4"
  },
  textoVazio: {
    color: "#666",
    marginBottom: 6
  }
});