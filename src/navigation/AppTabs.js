import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import DashboardScreen from "../screens/DashboardScreen";
import EntradaScreen from "../screens/EntradaScreen";
import VendasScreen from "../screens/VendasScreen";
import HistoricoScreen from "../screens/HistoricoScreen";
import AjustesScreen from "../screens/AjustesScreen";

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Entrada" component={EntradaScreen} />
      <Tab.Screen name="Vendas" component={VendasScreen} />
      <Tab.Screen name="Histórico" component={HistoricoScreen} />
      <Tab.Screen name="Ajustes" component={AjustesScreen} />
    </Tab.Navigator>
  );
}