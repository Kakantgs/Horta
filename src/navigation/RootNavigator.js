import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AppTabs from "./AppTabs";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import { useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator, Button, Text, ScrollView } from "react-native";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, profile, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user && profile ? (
        <AppTabs />
      ) : user ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 12 }}>
            Acesso pendente
          </Text>
          <Text style={{ textAlign: "center", marginBottom: 20 }}>
            Sua conta ainda nao foi aprovada por um administrador.
          </Text>
          <Button title="Sair" onPress={logout} />
        </ScrollView>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
