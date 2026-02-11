import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

export default function DateQuestion({
  question,
  value = null,
  onValueChange,
  required = false,
  editable = true,
  minimumDate = null,
  maximumDate = null,
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate) {
      onValueChange(selectedDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Select a date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateInput = (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleWebChange = (text) => {
    if (!text) {
      onValueChange(null);
      return;
    }
    const parsed = new Date(`${text}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    onValueChange(parsed);
  };

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

      {Platform.OS === "web" ? (
        <TextInput
          style={[styles.dateButton, !editable && styles.dateButtonDisabled]}
          value={formatDateInput(value)}
          onChangeText={handleWebChange}
          editable={editable}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
          autoComplete="off"
        />
      ) : (
        <Pressable
          style={[styles.dateButton, !editable && styles.dateButtonDisabled]}
          onPress={() => editable && setShowPicker(true)}
          disabled={!editable}
        >
          <Ionicons name="calendar" size={20} color="#2196F3" />
          <Text style={[styles.dateButtonText, !value && styles.placeholderText]}>
            {formatDate(value)}
          </Text>
        </Pressable>
      )}

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === "ios" && showPicker && (
        <View style={styles.iosPickerActions}>
          <Pressable style={styles.iosButton} onPress={() => setShowPicker(false)}>
            <Text style={styles.iosButtonText}>Done</Text>
          </Pressable>
        </View>
      )}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
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
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  dateButtonDisabled: {
    opacity: 0.6,
  },
  dateButtonText: {
    fontSize: 16,
    marginLeft: 10,
    color: "#333",
    flex: 1,
  },
  placeholderText: {
    color: "#999",
  },
  iosPickerActions: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 10,
  },
  iosButton: {
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  iosButtonText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "600",
  },
});
