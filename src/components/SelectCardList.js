import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function SelectCardList({
  title,
  items,
  selectedId,
  onSelect,
  emptyMessage = "Nenhum item disponível.",
  getTitle,
  getSubtitle
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.option,
              selectedId === item.id && styles.optionSelected
            ]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={styles.optionTitle}>{getTitle(item)}</Text>
            {!!getSubtitle(item) && (
              <Text style={styles.optionSubtitle}>{getSubtitle(item)}</Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14
  },
  title: {
    fontWeight: "bold",
    marginBottom: 8
  },
  empty: {
    color: "#666"
  },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8
  },
  optionSelected: {
    borderColor: "#2e86de",
    backgroundColor: "#eaf3ff"
  },
  optionTitle: {
    fontWeight: "bold"
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#555"
  }
});