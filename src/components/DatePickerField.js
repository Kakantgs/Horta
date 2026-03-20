import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

function formatarDataBR(dataIso) {
  if (!dataIso) return "";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Selecionar data"
}) {
  const [showPicker, setShowPicker] = useState(false);

  const selectedDate = useMemo(() => {
    if (!value) return new Date();
    const [ano, mes, dia] = value.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }, [value]);

  function handleNativeChange(event, date) {
    setShowPicker(false);

    if (!date) return;

    const dataFormatada = formatarDataISO(date);
    onChange(dataFormatada);
  }

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      {Platform.OS === "web" ? (
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #999",
            fontSize: 16,
            boxSizing: "border-box"
          }}
        />
      ) : (
        <>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.buttonText}>
              {value ? formatarDataBR(value) : placeholder}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleNativeChange}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6
  },
  button: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff"
  },
  buttonText: {
    fontSize: 16,
    color: "#333"
  }
});