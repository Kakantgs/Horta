
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function OptionSelectField({
  label,
  value,
  onChange,
  options = []
}) {
  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.optionsWrap}>
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                selected && styles.optionSelected
              ]}
              onPress={() => onChange(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  option: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    marginBottom: 8,
    marginRight: 8
  },
  optionSelected: {
    borderColor: "#2e86de",
    backgroundColor: "#eaf3ff"
  },
  optionText: {
    color: "#333"
  },
  optionTextSelected: {
    color: "#2e86de",
    fontWeight: "bold"
  }
});