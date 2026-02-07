import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

export default function NumberQuestion({
  question,
  value = "",
  onChangeText,
  required = false,
  placeholder = "Enter a number",
  editable = true,
}) {
  const formatNumberString = (raw) => {
    if (raw === null || raw === undefined) return "";
    const rawString = String(raw);
    if (rawString.trim() === "") return "";

    const isNegative = rawString.startsWith("-");
    const normalized = rawString.replace(/[^0-9.]/g, "");
    const [intPart = "", decPart = ""] = normalized.split(".");
    const safeInt = intPart.replace(/^0+(?=\d)/, "") || (intPart === "" ? "" : "0");
    const withCommas = safeInt.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const signed = isNegative && withCommas ? `-${withCommas}` : withCommas;

    return decPart ? `${signed}.${decPart}` : signed;
  };

  const normalizeInput = (text) => {
    if (text === null || text === undefined) return "";
    let raw = String(text).replace(/,/g, "");
    let sign = "";
    if (raw.startsWith("-")) {
      sign = "-";
      raw = raw.slice(1);
    }
    raw = raw.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    const intPart = parts[0] || "";
    const decPart = parts.slice(1).join("");
    return decPart.length > 0 ? `${sign}${intPart}.${decPart}` : `${sign}${intPart}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      <TextInput
        style={styles.input}
        value={formatNumberString(value)}
        onChangeText={(text) => onChangeText(normalizeInput(text))}
        placeholder={placeholder}
        editable={editable}
        placeholderTextColor="#999"
        keyboardType="numeric"
        inputMode="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  questionHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  required: {
    color: "#e74c3c",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
});
