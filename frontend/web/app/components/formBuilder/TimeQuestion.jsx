import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, TextInput } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

export default function TimeQuestion({
  question,
  value = null,
  onValueChange,
  required = false,
  editable = true,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [webInputValue, setWebInputValue] = useState("");

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedTime) {
      onValueChange(selectedTime);
    }
  };

  const formatTime = (time) => {
    if (!time) return "Select a time";
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatTimeInput = (time) => {
    if (!time) return "";
    const d = time instanceof Date ? time : new Date(time);
    if (Number.isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleWebChange = (text) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    }
    setWebInputValue(formatted);
    if (digits.length === 4) {
      const now = new Date();
      const parsed = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        Number(digits.slice(0, 2)),
        Number(digits.slice(2, 4))
      );
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
    if (!/^\d{2}:\d{2}$/.test(trimmed)) {
      return;
    }
    const now = new Date();
    const [hours, minutes] = trimmed.split(":");
    const parsed = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Number(hours),
      Number(minutes)
    );
    if (Number.isNaN(parsed.getTime())) return;
    onValueChange(parsed);
  };

  React.useEffect(() => {
    if (Platform.OS !== "web") return;
    setWebInputValue(formatTimeInput(value));
  }, [value]);

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

      {Platform.OS === "web" ? (
        <TextInput
          style={[styles.timeButton, !editable && styles.timeButtonDisabled]}
          value={webInputValue}
          onChangeText={handleWebChange}
          onBlur={handleWebBlur}
          editable={editable}
          placeholder="HH:mm"
          placeholderTextColor="#999"
          autoComplete="off"
        />
      ) : (
        <Pressable
          style={[styles.timeButton, !editable && styles.timeButtonDisabled]}
          onPress={() => editable && setShowPicker(true)}
          disabled={!editable}
        >
          <Ionicons name="time" size={20} color="#FF9800" />
          <Text style={[styles.timeButtonText, !value && styles.placeholderText]}>
            {formatTime(value)}
          </Text>
        </Pressable>
      )}

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
          is24Hour={false}
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
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  timeButtonDisabled: {
    opacity: 0.6,
  },
  timeButtonText: {
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
    color: "#FF9800",
    fontSize: 16,
    fontWeight: "600",
  },
});
