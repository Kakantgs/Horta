import React, { useEffect, useState } from "react";
import DatePickerField from "../components/DatePickerField";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Button,
  Modal
} from "react-native";
import {
  listarClientes,
  listarLotesComerciaisDisponiveis,
  registrarVenda,
  listarPedidosVenda,
  listarItensPedido
} from "../services/vendaService";
import {
  listarLotesComerciais,
  buscarLoteComercialComOrigem
} from "../services/loteComercialService";
import {
  gerarEtiquetaPdf,
  compartilharEtiquetaPdf,
  imprimirEtiquetaHtml
} from "../services/etiquetaService";
import { validarDataISO } from "../services/entradaService";
import SelectCardList from "../components/SelectCardList";

export default function VendasScreen() {
  const [clientes, setClientes] = useState([]);
  const [lotesComerciais, setLotesComerciais] = useState([]);
  const [todosLotesComerciais, setTodosLotesComerciais] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [itensPedido, setItensPedido] = useState([]);

  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [loteSelecionadoId, setLoteSelecionadoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [dataVenda, setDataVenda] = useState("");

  const [loteEtiquetaSelecionado, setLoteEtiquetaSelecionado] = useState(null);
  const [origemLote, setOrigemLote] = useState(null);
  const [modalEtiquetaVisible, setModalEtiquetaVisible] = useState(false);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      const listaClientes = await listarClientes();
      const listaLotes = await listarLotesComerciaisDisponiveis();
      const listaTodosLotes = await listarLotesComerciais();
      const listaPedidos = await listarPedidosVenda();
      const listaItens = await listarItensPedido();

      setClientes(listaClientes);
      setLotesComerciais(listaLotes);
      setTodosLotesComerciais(listaTodosLotes);
      setPedidos(listaPedidos);
      setItensPedido(listaItens);
    } catch (error) {
      alert(error.message);
    }
  }

  function clienteSelecionado() {
    return clientes.find((item) => item.id === clienteSelecionadoId);
  }

  function loteSelecionado() {
    return lotesComerciais.find((item) => item.id === loteSelecionadoId);
  }

  async function handleRegistrarVenda() {
    try {
      if (
        !clienteSelecionadoId ||
        !loteSelecionadoId ||
        !quantidade ||
        !precoUnitario ||
        !dataVenda
      ) {
        alert("Preencha os campos obrigatórios.");
        return;
      }

      if (!validarDataISO(dataVenda.trim())) {
        alert("A data da venda deve estar no formato YYYY-MM-DD e ser válida.");
        return;
      }

      const resultado = await registrarVenda({
        cliente_id: clienteSelecionadoId,
        lote_comercial_id: loteSelecionadoId,
        quantidade,
        preco_unitario: precoUnitario,
        data_venda: dataVenda.trim()
      });

      alert(
        `Venda registrada com sucesso!\n\nPedido: ${resultado.pedido.id}\nCliente: ${resultado.pedido.cliente_nome}\nLote: ${resultado.item.codigo_lote_comercial}\nSaldo restante: ${resultado.lote_atualizado.quantidade_disponivel}`
      );

      setClienteSelecionadoId("");
      setLoteSelecionadoId("");
      setQuantidade("");
      setPrecoUnitario("");
      setDataVenda("");

      carregarTudo();
    } catch (error) {
      alert(error.message);
    }
  }

  function itensDoPedido(pedidoId) {
    return itensPedido.filter((item) => item.pedido_venda_id === pedidoId);
  }

  async function abrirModalEtiqueta(lote) {
    try {
      setLoteEtiquetaSelecionado(lote);

      const origem = await buscarLoteComercialComOrigem(lote.id);
      setOrigemLote(origem);

      setModalEtiquetaVisible(true);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleGerarPdf() {
    try {
      if (!loteEtiquetaSelecionado) return;

      const resultado = await gerarEtiquetaPdf(loteEtiquetaSelecionado.id);
      alert(`PDF gerado com sucesso!\nArquivo: ${resultado.uri}`);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleCompartilharPdf() {
    try {
      if (!loteEtiquetaSelecionado) return;

      const resultado = await gerarEtiquetaPdf(loteEtiquetaSelecionado.id);
      await compartilharEtiquetaPdf(resultado.uri);
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleImprimir() {
    try {
      if (!loteEtiquetaSelecionado) return;

      await imprimirEtiquetaHtml(loteEtiquetaSelecionado.id);
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Vendas / Checkout</Text>
      <Text style={styles.subtitulo}>
        Registre a saída comercial e gere a etiqueta dos lotes.
      </Text>

      <SelectCardList
        title="Selecionar cliente"
        items={clientes}
        selectedId={clienteSelecionadoId}
        onSelect={setClienteSelecionadoId}
        emptyMessage="Nenhum cliente cadastrado."
        getTitle={(item) => item.nome}
        getSubtitle={(item) => item.tipo_cliente || "Sem tipo"}
      />

      {clienteSelecionado() && (
        <Text style={styles.selecionado}>
          Cliente selecionado: {clienteSelecionado().nome}
        </Text>
      )}

      <SelectCardList
        title="Selecionar lote comercial disponível"
        items={lotesComerciais}
        selectedId={loteSelecionadoId}
        onSelect={setLoteSelecionadoId}
        emptyMessage="Nenhum lote comercial disponível."
        getTitle={(item) => item.codigo_lote_comercial}
        getSubtitle={(item) =>
          `Disponível: ${item.quantidade_disponivel} | Status: ${item.status}`
        }
      />

      {loteSelecionado() && (
        <Text style={styles.selecionado}>
          Lote selecionado: {loteSelecionado().codigo_lote_comercial}
        </Text>
      )}

      <Text style={styles.label}>Quantidade vendida</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
        placeholder="100"
      />

      <Text style={styles.label}>Preço unitário</Text>
      <TextInput
        style={styles.input}
        value={precoUnitario}
        onChangeText={setPrecoUnitario}
        keyboardType="numeric"
        placeholder="2.50"
      />

      <DatePickerField
  label="Data da venda"
  value={dataVenda}
  onChange={setDataVenda}
  placeholder="Selecionar data da venda"
/>

      <Button title="Registrar venda" onPress={handleRegistrarVenda} />

      <Text style={styles.secao}>Etiquetas / lotes comerciais</Text>
      {todosLotesComerciais.length === 0 ? (
        <Text style={styles.aviso}>Nenhum lote comercial gerado ainda.</Text>
      ) : (
        todosLotesComerciais.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitulo}>{item.codigo_lote_comercial}</Text>
            <Text>Data de formação: {item.data_formacao}</Text>
            <Text>Quantidade inicial: {item.quantidade_inicial}</Text>
            <Text>Quantidade disponível: {item.quantidade_disponivel}</Text>
            <Text>Status: {item.status}</Text>

            <View style={{ marginTop: 10 }}>
              <Button
                title="Abrir opções de etiqueta"
                onPress={() => abrirModalEtiqueta(item)}
              />
            </View>
          </View>
        ))
      )}

      <Text style={styles.secao}>Pedidos registrados</Text>
      {pedidos.length === 0 ? (
        <Text style={styles.aviso}>Nenhum pedido registrado ainda.</Text>
      ) : (
        pedidos.map((pedido) => (
          <View key={pedido.id} style={styles.card}>
            <Text style={styles.cardTitulo}>{pedido.id}</Text>
            <Text>Cliente: {pedido.cliente_nome}</Text>
            <Text>Data da venda: {pedido.data_venda}</Text>
            <Text>Status: {pedido.status}</Text>

            <Text style={styles.subCardTitulo}>Itens do pedido</Text>
            {itensDoPedido(pedido.id).map((item) => (
              <View key={item.id} style={styles.itemBloco}>
                <Text>Lote: {item.codigo_lote_comercial}</Text>
                <Text>Quantidade: {item.quantidade}</Text>
                <Text>Preço unitário: {item.preco_unitario}</Text>
              </View>
            ))}
          </View>
        ))
      )}

      <Modal visible={modalEtiquetaVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitulo}>Etiqueta / PDF</Text>

            <Text>Lote comercial: {loteEtiquetaSelecionado?.codigo_lote_comercial}</Text>
            <Text>Data: {loteEtiquetaSelecionado?.data_formacao}</Text>
            <Text>Quantidade disponível: {loteEtiquetaSelecionado?.quantidade_disponivel}</Text>
            <Text>Status: {loteEtiquetaSelecionado?.status}</Text>

            <View style={{ height: 12 }} />

            <Text style={styles.modalSubtitulo}>Origem</Text>
            <Text>Lote produção: {origemLote?.loteProducao?.codigo_lote || "-"}</Text>
            <Text>
              Variedade: {origemLote?.variedade?.nome || origemLote?.loteProducao?.variedade_nome || "-"}
            </Text>
            <Text>Fornecedor: {origemLote?.fornecedor?.nome || "-"}</Text>
            <Text>Entrada: {origemLote?.entrada?.data_entrada || "-"}</Text>
            <Text>Data colheita: {origemLote?.colheita?.data_colheita || "-"}</Text>

            <View style={{ height: 12 }} />
            <Button title="Gerar PDF" onPress={handleGerarPdf} />

            <View style={{ height: 10 }} />
            <Button title="Compartilhar PDF" onPress={handleCompartilharPdf} />

            <View style={{ height: 10 }} />
            <Button title="Imprimir etiqueta" onPress={handleImprimir} />

            <View style={{ height: 10 }} />
            <Button
              title="Fechar"
              onPress={() => setModalEtiquetaVisible(false)}
            />
          </View>
        </View>
      </Modal>
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
  secao: {
    fontSize: 18,
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
    marginBottom: 10
  },
  selecionado: {
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 8
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  cardTitulo: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4
  },
  subCardTitulo: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6
  },
  itemBloco: {
    backgroundColor: "#f8f9f9",
    padding: 8,
    borderRadius: 8,
    marginBottom: 6
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12
  },
  modalSubtitulo: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8
  }
});