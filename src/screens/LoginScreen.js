import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";

import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha email e senha");
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      Alert.alert("Erro ao entrar", error.message);
    }
  }

  return (
    <View style={styles.container}>

      <Text style={styles.titulo}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.botao} onPress={handleLogin}>
        <Text style={styles.textoBotao}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>
          Não tem conta? Cadastre-se
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    justifyContent:"center",
    padding:20
  },
  titulo:{
    fontSize:26,
    fontWeight:"bold",
    textAlign:"center",
    marginBottom:30
  },
  input:{
    borderWidth:1,
    borderColor:"#ccc",
    borderRadius:8,
    padding:12,
    marginBottom:12
  },
  botao:{
    backgroundColor:"#2e7d32",
    padding:14,
    borderRadius:8,
    alignItems:"center"
  },
  textoBotao:{
    color:"#fff",
    fontWeight:"bold"
  },
  link:{
    textAlign:"center",
    marginTop:20,
    color:"#2e7d32"
  }
});