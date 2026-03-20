import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

function formatarDataHoraBR(valor) {
  if (!valor) return "";

  const [data, hora] = valor.split(" ");
  if (!data || !hora) return valor;

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano} ${hora}`;
}

function formatarDataHoraISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  const hora = String(date.getHours()).padStart(2, "0");
  const minuto = String(date.getMinutes()).padStart(2, "0");

  return `${ano}-${mes}-${dia} ${hora}:${minuto}`;
}

function parseValorParaDate(valor) {
  if (!valor) return new Date();

  const [data, hora] = valor.split(" ");
  if (!data || !hora) return new Date();

  const [ano, mes, dia] = data.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);

  return new Date(ano, mes - 1, dia, hh || 0, mm || 0);
}

export default function DateTimePickerField({
  label,
  value,
  onChange,
  placeholder = "Selecionar data e hora"
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const selectedDate = useMemo(() => parseValorParaDate(value), [value]);

  function handleDateChange(event, date) {
    setShowDatePicker(false);

    if (!date) return;

    const baseAtual = parseValorParaDate(value);
    const dataComHoraAtual = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      baseAtual.getHours(),
      baseAtual.getMinutes()
    );

    setTempDate(dataComHoraAtual);
    setShowTimePicker(true);
  }

  function handleTimeChange(event, time) {
    setShowTimePicker(false);

    if (!time) return;

    const dataFinal = new Date(
      tempDate.getFullYear(),
      tempDate.getMonth(),
      tempDate.getDate(),
      time.getHours(),
      time.getMinutes()
    );

    onChange(formatarDataHoraISO(dataFinal));
  }

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      {Platform.OS === "web" ? (
        <input
          type="datetime-local"
          value={value ? value.replace(" ", "T") : ""}
          onChange={(e) => {
            const valor = e.target.value;
            onChange(valor ? valor.replace("T", " ") : "");
          }}
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
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.buttonText}>
              {value ? formatarDataHoraBR(value) : placeholder}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={tempDate}
              mode="time"
              is24Hour={true}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
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