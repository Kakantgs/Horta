import React, { useEffect, useMemo, useState } from "react";
import DatePickerField from "../components/DatePickerField";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity
} from "react-native";
import {
  listarClientes,
  listarLotesComerciaisDisponiveis,
  registrarVenda,
  listarPedidosVenda,
  listarItensPedido
} from "../services/vendaService";
import { validarDataISO } from "../services/entradaService";
import OptionSelectField from "../components/OptionSelectField";
import SelectCardList from "../components/SelectCardList";

const PAGE_SIZE_LOTES_VENDA = 20;

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

function parseNumeroInteiro(valor) {
  return Number(String(valor || "").replace(/\s+/g, ""));
}

function parseNumeroDecimal(valor) {
  return Number(String(valor || "").replace(",", ".").replace(/\s+/g, ""));
}

function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarDataBR(dataISO) {
  if (!dataISO || !String(dataISO).includes("-")) return dataISO || "-";
  const [ano, mes, dia] = String(dataISO).split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarPrecoInput(valor) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function obterNivelSaldoComercial(lote) {
  const disponivel = Number(lote?.quantidade_disponivel || 0);
  const inicial = Number(lote?.quantidade_inicial || 0);

  if (disponivel <= 0) {
    return { label: "Sem saldo", tipo: "zerado" };
  }

  if (!inicial) {
    if (disponivel <= 20) return { label: "Saldo crítico", tipo: "critico" };
    if (disponivel <= 100) return { label: "Saldo baixo", tipo: "baixo" };
    return { label: "Saldo normal", tipo: "normal" };
  }

  const percentual = (disponivel / inicial) * 100;

  if (percentual <= 10) return { label: "Saldo crítico", tipo: "critico" };
  if (percentual <= 25) return { label: "Saldo baixo", tipo: "baixo" };
  return { label: "Saldo normal", tipo: "normal" };
}

export default function VendasScreen() {
  const [clientes, setClientes] = useState([]);
  const [lotesComerciais, setLotesComerciais] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [itensPedido, setItensPedido] = useState([]);

  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaLote, setBuscaLote] = useState("");
  const [filtroStatusLote, setFiltroStatusLote] = useState("");
  const [filtroVariedade, setFiltroVariedade] = useState("");
  const [ordenacaoLotes, setOrdenacaoLotes] = useState("data_desc");

  const [clienteSelecionadoId, setClienteSelecionadoId] = useState("");
  const [loteSelecionadoId, setLoteSelecionadoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [dataVenda, setDataVenda] = useState("");

  const [visibleLotesVendaCount, setVisibleLotesVendaCount] = useState(PAGE_SIZE_LOTES_VENDA);

  const OPCOES_STATUS_LOTE = [
    { label: "Todos", value: "" },
    { label: "Disponível", value: "disponivel" },
    { label: "Parcial", value: "parcial" },
    { label: "Vendido", value: "vendido" }
  ];

  const OPCOES_ORDENACAO = [
    { label: "Mais recentes", value: "data_desc" },
    { label: "Mais antigos", value: "data_asc" },
    { label: "Maior saldo", value: "saldo_desc" },
    { label: "Menor saldo", value: "saldo_asc" },
    { label: "Código A-Z", value: "codigo_asc" }
  ];

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    setVisibleLotesVendaCount(PAGE_SIZE_LOTES_VENDA);
  }, [buscaLote, filtroStatusLote, filtroVariedade, ordenacaoLotes]);

  async function carregarTudo() {
    try {
      const [listaClientes, listaLotes, listaPedidos, listaItens] =
        await Promise.all([
          listarClientes(),
          listarLotesComerciaisDisponiveis(),
          listarPedidosVenda(),
          listarItensPedido()
        ]);

      setClientes(listaClientes);
      setLotesComerciais(listaLotes);
      setPedidos(listaPedidos);
      setItensPedido(listaItens);
    } catch (error) {
      Alert.alert("Erro", error.message);
    }
  }

  const clienteSelecionado =
    clientes.find((item) => item.id === clienteSelecionadoId) || null;

  const loteSelecionado =
    lotesComerciais.find((item) => item.id === loteSelecionadoId) || null;

  const clienteUsaPrecoPadrao =
    Boolean(clienteSelecionado?.usa_preco_padrao) &&
    Number(clienteSelecionado?.preco_padrao || 0) > 0;

  useEffect(() => {
    if (!clienteSelecionadoId) {
      setPrecoUnitario("");
      return;
    }

    if (clienteUsaPrecoPadrao) {
      setPrecoUnitario(formatarPrecoInput(clienteSelecionado.preco_padrao));
    } else {
      setPrecoUnitario("");
    }
  }, [clienteSelecionadoId, clienteUsaPrecoPadrao, clienteSelecionado?.preco_padrao]);

  const quantidadeNumero = parseNumeroInteiro(quantidade);
  const precoUnitarioNumero = parseNumeroDecimal(precoUnitario);
  const saldoLoteSelecionado = Number(loteSelecionado?.quantidade_disponivel || 0);
  const saldoRestantePrevisto = Math.max(0, saldoLoteSelecionado - quantidadeNumero);
  const valorTotalPrevisto = Number.isFinite(quantidadeNumero * precoUnitarioNumero)
    ? Number((quantidadeNumero * precoUnitarioNumero).toFixed(2))
    : 0;

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();

    return clientes.filter((item) => {
      if (!termo) return true;

      return (
        (item.nome || "").toLowerCase().includes(termo) ||
        (item.tipo_cliente || "").toLowerCase().includes(termo)
      );
    });
  }, [clientes, buscaCliente]);

  const opcoesVariedade = useMemo(() => {
    const unicas = [...new Set(lotesComerciais.map((item) => item.variedade_nome).filter(Boolean))];

    return [
      { label: "Todas", value: "" },
      ...unicas
        .sort((a, b) => a.localeCompare(b))
        .map((nome) => ({ label: nome, value: nome }))
    ];
  }, [lotesComerciais]);

  const lotesComerciaisFiltrados = useMemo(() => {
    const termo = buscaLote.trim().toLowerCase();

    let lista = [...lotesComerciais];

    if (termo) {
      lista = lista.filter((item) => {
        return (
          (item.codigo_lote_comercial || "").toLowerCase().includes(termo) ||
          (item.codigo_lote_producao || "").toLowerCase().includes(termo) ||
          (item.variedade_nome || "").toLowerCase().includes(termo)
        );
      });
    }

    if (filtroStatusLote) {
      lista = lista.filter(
        (item) => (item.status || "").toLowerCase() === filtroStatusLote.toLowerCase()
      );
    }

    if (filtroVariedade) {
      lista = lista.filter(
        (item) => (item.variedade_nome || "") === filtroVariedade
      );
    }

    lista.sort((a, b) => {
      if (ordenacaoLotes === "data_desc") {
        return (b.data_formacao || "").localeCompare(a.data_formacao || "");
      }

      if (ordenacaoLotes === "data_asc") {
        return (a.data_formacao || "").localeCompare(b.data_formacao || "");
      }

      if (ordenacaoLotes === "saldo_desc") {
        return Number(b.quantidade_disponivel || 0) - Number(a.quantidade_disponivel || 0);
      }

      if (ordenacaoLotes === "saldo_asc") {
        return Number(a.quantidade_disponivel || 0) - Number(b.quantidade_disponivel || 0);
      }

      return (a.codigo_lote_comercial || "").localeCompare(
        b.codigo_lote_comercial || "",
        undefined,
        { numeric: true }
      );
    });

    return lista;
  }, [lotesComerciais, buscaLote, filtroStatusLote, filtroVariedade, ordenacaoLotes]);

  const lotesComerciaisVisiveis = useMemo(() => {
    return lotesComerciaisFiltrados.slice(0, visibleLotesVendaCount);
  }, [lotesComerciaisFiltrados, visibleLotesVendaCount]);

  const mensagemBloqueioVenda = useMemo(() => {
    if (!clienteSelecionadoId) return "Selecione um cliente.";
    if (!loteSelecionadoId) return "Selecione um lote comercial.";
    if (!quantidade) return "Informe a quantidade vendida.";
    if (!precoUnitario) return "Informe o preço unitário.";
    if (!dataVenda) return "Informe a data da venda.";

    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) {
      return "A quantidade vendida deve ser maior que zero.";
    }

    if (!Number.isFinite(precoUnitarioNumero) || precoUnitarioNumero < 0) {
      return "O preço unitário deve ser um número válido.";
    }

    if (!loteSelecionado) {
      return "Lote comercial selecionado não encontrado.";
    }

    if (saldoLoteSelecionado <= 0) {
      return "O lote selecionado não possui saldo disponível.";
    }

    if (quantidadeNumero > saldoLoteSelecionado) {
      return "A quantidade vendida é maior que o saldo disponível do lote.";
    }

    if (!validarDataISO(dataVenda.trim())) {
      return "A data da venda deve estar válida.";
    }

    return "";
  }, [
    clienteSelecionadoId,
    loteSelecionadoId,
    quantidade,
    precoUnitario,
    dataVenda,
    quantidadeNumero,
    precoUnitarioNumero,
    loteSelecionado,
    saldoLoteSelecionado
  ]);

  const podeRegistrarVenda = mensagemBloqueioVenda === "";

  function itensDoPedido(pedidoId) {
    return itensPedido.filter((item) => item.pedido_venda_id === pedidoId);
  }

  async function handleRegistrarVenda() {
    try {
      if (!podeRegistrarVenda) {
        Alert.alert("Não foi possível registrar", mensagemBloqueioVenda);
        return;
      }

      const resultado = await registrarVenda({
        cliente_id: clienteSelecionadoId,
        lote_comercial_id: loteSelecionadoId,
        quantidade,
        preco_unitario: precoUnitario,
        data_venda: dataVenda.trim()
      });

      Alert.alert(
        "Venda registrada com sucesso",
        `Pedido: ${resultado.pedido.id}\nCliente: ${resultado.pedido.cliente_nome}\nLote: ${resultado.item.codigo_lote_comercial}\nSaldo restante: ${resultado.lote_atualizado.quantidade_disponivel}\nTotal: ${formatarMoeda(resultado.item.valor_total)}`
      );

      setLoteSelecionadoId("");
      setQuantidade("");
      setPrecoUnitario(
        clienteUsaPrecoPadrao
          ? formatarPrecoInput(clienteSelecionado.preco_padrao)
          : ""
      );

      await carregarTudo();
    } catch (error) {
      Alert.alert("Erro ao registrar venda", error.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Vendas / Checkout</Text>
      <Text style={styles.subtitulo}>
        Registre a saída comercial do lote.
      </Text>

      <Text style={styles.secao}>Cliente</Text>

      <Text style={styles.label}>Buscar cliente</Text>
      <TextInput
        style={styles.input}
        value={buscaCliente}
        onChangeText={setBuscaCliente}
        placeholder="Nome ou tipo do cliente"
      />

      <SelectCardList
        title="Selecionar cliente"
        items={clientesFiltrados}
        selectedId={clienteSelecionadoId}
        onSelect={setClienteSelecionadoId}
        emptyMessage="Nenhum cliente encontrado."
        getTitle={(item) => item.nome}
        getSubtitle={(item) =>
          `${item.tipo_cliente || "Sem tipo"}${
            item.usa_preco_padrao
              ? ` | Preço padrão: ${formatarMoeda(item.preco_padrao || 0)}`
              : ""
          }`
        }
      />

      {clienteSelecionado && (
        <View style={styles.cardSelecionado}>
          <Text style={styles.cardTitulo}>Cliente selecionado</Text>
          <Text>{clienteSelecionado.nome}</Text>
          <Text>{clienteSelecionado.tipo_cliente || "Sem tipo"}</Text>
          <Text>
            Usa preço padrão: {clienteUsaPrecoPadrao ? "Sim" : "Não"}
          </Text>
          <Text>
            Preço padrão: {clienteUsaPrecoPadrao ? formatarMoeda(clienteSelecionado.preco_padrao || 0) : "-"}
          </Text>
        </View>
      )}

      <Text style={styles.secao}>Lote comercial</Text>

      <Text style={styles.label}>Buscar lote</Text>
      <TextInput
        style={styles.input}
        value={buscaLote}
        onChangeText={setBuscaLote}
        placeholder="Código do lote, lote de produção ou variedade"
      />

      <OptionSelectField
        label="Filtrar por status"
        value={filtroStatusLote}
        onChange={setFiltroStatusLote}
        options={OPCOES_STATUS_LOTE}
      />

      <OptionSelectField
        label="Filtrar por variedade"
        value={filtroVariedade}
        onChange={setFiltroVariedade}
        options={opcoesVariedade}
      />

      <OptionSelectField
        label="Ordenar lotes"
        value={ordenacaoLotes}
        onChange={setOrdenacaoLotes}
        options={OPCOES_ORDENACAO}
      />

      <Text style={styles.contadorLista}>
        Mostrando {lotesComerciaisVisiveis.length} de {lotesComerciaisFiltrados.length} lote(s) disponíveis.
      </Text>

      <SelectCardList
        title="Selecionar lote comercial disponível"
        items={lotesComerciaisVisiveis}
        selectedId={loteSelecionadoId}
        onSelect={setLoteSelecionadoId}
        emptyMessage="Nenhum lote comercial disponível."
        getTitle={(item) => {
          const nivel = obterNivelSaldoComercial(item);

          if (nivel.tipo === "critico") {
            return `${item.codigo_lote_comercial} • SALDO CRÍTICO`;
          }

          if (nivel.tipo === "baixo") {
            return `${item.codigo_lote_comercial} • SALDO BAIXO`;
          }

          return item.codigo_lote_comercial;
        }}
        getSubtitle={(item) =>
          `${item.variedade_nome} | Produção: ${item.codigo_lote_producao}\nFormação: ${formatarDataBR(item.data_formacao)} | Disponível: ${item.quantidade_disponivel} | Status: ${item.status}`
        }
      />

      {lotesComerciaisVisiveis.length < lotesComerciaisFiltrados.length && (
        <ActionButton
          title={`CARREGAR MAIS LOTES (+${PAGE_SIZE_LOTES_VENDA})`}
          onPress={() =>
            setVisibleLotesVendaCount((prev) => prev + PAGE_SIZE_LOTES_VENDA)
          }
        />
      )}

      {loteSelecionado && (
        <View style={styles.cardSaldoLote}>
          <Text style={styles.cardTitulo}>Lote selecionado</Text>
          <Text>Lote comercial: {loteSelecionado.codigo_lote_comercial}</Text>
          <Text>Lote produção: {loteSelecionado.codigo_lote_producao}</Text>
          <Text>Variedade: {loteSelecionado.variedade_nome}</Text>
          <Text>Data de formação: {formatarDataBR(loteSelecionado.data_formacao)}</Text>
          <Text>Data da colheita: {formatarDataBR(loteSelecionado.data_colheita)}</Text>
          <Text>Status: {loteSelecionado.status}</Text>
          <Text>Quantidade disponível: {loteSelecionado.quantidade_disponivel}</Text>
        </View>
      )}

      <Text style={styles.secao}>Dados da venda</Text>

      <Text style={styles.label}>Quantidade vendida</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
        placeholder={saldoLoteSelecionado > 0 ? `Máximo: ${saldoLoteSelecionado}` : "100"}
      />

      <Text style={styles.label}>Preço unitário</Text>
      <TextInput
        style={styles.input}
        value={precoUnitario}
        onChangeText={setPrecoUnitario}
        keyboardType="numeric"
        placeholder="2,50"
      />

      {clienteUsaPrecoPadrao ? (
        <Text style={styles.feedbackInfo}>
          Preço padrão do cliente aplicado automaticamente. Você ainda pode editar manualmente.
        </Text>
      ) : null}

      <DatePickerField
        label="Data da venda"
        value={dataVenda}
        onChange={setDataVenda}
        placeholder="Selecionar data da venda"
      />

      {(clienteSelecionado || loteSelecionado || quantidade || precoUnitario) && (
        <View style={styles.cardSugestao}>
          <Text style={styles.cardTitulo}>Resumo da venda</Text>
          <Text>Cliente: {clienteSelecionado?.nome || "-"}</Text>
          <Text>Lote: {loteSelecionado?.codigo_lote_comercial || "-"}</Text>
          <Text>Variedade: {loteSelecionado?.variedade_nome || "-"}</Text>
          <Text>Saldo atual: {saldoLoteSelecionado}</Text>
          <Text>Quantidade informada: {quantidadeNumero || 0}</Text>
          <Text>Saldo restante previsto: {saldoRestantePrevisto}</Text>
          <Text>Preço unitário: {formatarMoeda(precoUnitarioNumero || 0)}</Text>
          <Text>Total previsto: {formatarMoeda(valorTotalPrevisto)}</Text>
        </View>
      )}

      {!!mensagemBloqueioVenda ? (
        <Text style={styles.feedbackBloqueio}>{mensagemBloqueioVenda}</Text>
      ) : (
        <Text style={styles.feedbackOk}>Tudo certo para registrar a venda.</Text>
      )}

      <ActionButton
        title="REGISTRAR VENDA"
        onPress={handleRegistrarVenda}
        disabled={!podeRegistrarVenda}
      />

      <Text style={styles.secao}>Pedidos registrados</Text>
      {pedidos.length === 0 ? (
        <Text style={styles.aviso}>Nenhum pedido registrado ainda.</Text>
      ) : (
        pedidos.map((pedido) => (
          <View key={pedido.id} style={styles.card}>
            <Text style={styles.cardTitulo}>{pedido.id}</Text>
            <Text>Cliente: {pedido.cliente_nome}</Text>
            <Text>Data da venda: {formatarDataBR(pedido.data_venda)}</Text>
            <Text>Status: {pedido.status}</Text>
            <Text>Total do pedido: {formatarMoeda(pedido.valor_total_pedido || 0)}</Text>

            <Text style={styles.subCardTitulo}>Itens do pedido</Text>
            {itensDoPedido(pedido.id).map((item) => (
              <View key={item.id} style={styles.itemBloco}>
                <Text>Lote: {item.codigo_lote_comercial}</Text>
                <Text>Produção: {item.codigo_lote_producao || "-"}</Text>
                <Text>Variedade: {item.variedade_nome || "-"}</Text>
                <Text>Quantidade: {item.quantidade}</Text>
                <Text>Preço unitário: {formatarMoeda(item.preco_unitario || 0)}</Text>
                <Text>Total item: {formatarMoeda(item.valor_total || 0)}</Text>
              </View>
            ))}
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
    marginBottom: 8
  },
  card: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  cardSelecionado: {
    borderWidth: 1,
    borderColor: "#85c1e9",
    backgroundColor: "#eef6fd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  cardSaldoLote: {
    borderWidth: 1,
    borderColor: "#58d68d",
    backgroundColor: "#eefaf1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  cardSugestao: {
    borderWidth: 1,
    borderColor: "#58d68d",
    backgroundColor: "#eefaf1",
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
  feedbackInfo: {
    color: "#1565c0",
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