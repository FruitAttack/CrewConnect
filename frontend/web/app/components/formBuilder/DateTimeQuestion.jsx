import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

export default function DateTimeQuestion({
  question,
  value = null,
  onValueChange,
  required = false,
  editable = true,
  minimumDate = null,
  maximumDate = null,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [webInputValue, setWebInputValue] = useState("");

  const handleDateTimeChange = (event, selectedDateTime) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDateTime) {
      onValueChange(selectedDateTime);
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "Select date & time";
    return dateTime.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateTimeInput = (dateTime) => {
    if (!dateTime) return "";
    const d = dateTime instanceof Date ? dateTime : new Date(dateTime);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const handleWebChange = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 12);
    let formatted = digits;
    if (digits.length >= 5) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
      if (digits.length >= 7) {
        formatted = `${formatted}-${digits.slice(6, 8)}`;
      }
      if (digits.length >= 9) {
        formatted = `${formatted} ${digits.slice(8, 10)}`;
        if (digits.length >= 11) {
          formatted = `${formatted}:${digits.slice(10, 12)}`;
        }
      }
    }
    setWebInputValue(formatted);
    if (digits.length === 12) {
      const parsed = new Date(formatted.replace(" ", "T"));
      if (!Number.isNaN(parsed.getTime())) {
        onValueChange(parsed);
      }
    }
  };

  const handleWebBlur = () => {
    const trimmed = webInputValue.trim();
    if (!trimmed) {
      onValueChange(null);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
      return;
    }
    const normalized = trimmed.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return;
    onValueChange(parsed);
  };

  React.useEffect(() => {
    if (Platform.OS !== "web") return;
    setWebInputValue(formatDateTimeInput(value));
  }, [value]);

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

      {Platform.OS === "web" ? (
        <TextInput
          style={[styles.datetimeButton, !editable && styles.datetimeButtonDisabled]}
          value={webInputValue}
          onChangeText={handleWebChange}
          onBlur={handleWebBlur}
          editable={editable}
          placeholder="YYYY-MM-DD HH:mm"
          placeholderTextColor="#999"
          autoComplete="off"
        />
      ) : (
        <Pressable
          style={[styles.datetimeButton, !editable && styles.datetimeButtonDisabled]}
          onPress={() => editable && setShowPicker(true)}
          disabled={!editable}
        >
          <Ionicons name="calendar-outline" size={20} color="#2196F3" />
          <Text style={[styles.datetimeButtonText, !value && styles.placeholderText]}>
            {formatDateTime(value)}
          </Text>
        </Pressable>
      )}

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="datetime"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateTimeChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === "ios" && showPicker && (
        <View style={styles.iosPickerActions}>
          <Pressable
            style={styles.iosButton}
            onPress={() => setShowPicker(false)}
          >
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
  datetimeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  datetimeButtonDisabled: {
    opacity: 0.6,
  },
  datetimeButtonText: {
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
