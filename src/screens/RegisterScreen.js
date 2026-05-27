import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from "react-native";

import { push, ref, set } from "firebase/database";

import { db } from "../config/firebaseConfig";

export default function RegisterScreen({ navigation }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleRegister() {
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (!nomeLimpo || !emailLimpo) {
      Alert.alert("Erro", "Preencha nome e email");
      return;
    }

    try {
      setEnviando(true);
      const requestRef = push(ref(db, "solicitacoes_acesso"));

      await set(requestRef, {
        id: requestRef.key,
        nome: nomeLimpo,
        email: emailLimpo,
        provider: "email",
        status: "pendente",
        createdAt: Date.now()
      });

      Alert.alert(
        "Solicitação enviada",
        "Seu acesso foi solicitado. Aguarde um administrador aprovar sua conta."
      );
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Erro ao solicitar acesso", error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>Cadastro</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={[styles.botao, enviando && styles.botaoDesabilitado]}
        onPress={handleRegister}
        disabled={enviando}
      >
        <Text style={styles.textoBotao}>
          {enviando ? "Enviando..." : "Solicitar acesso"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  botao: {
    backgroundColor: "#2e7d32",
    padding: 14,
    borderRadius: 8,
    alignItems: "center"
  },
  botaoDesabilitado: {
    opacity: 0.7
  },
  textoBotao: {
    color: "#fff",
    fontWeight: "bold"
  }
});
