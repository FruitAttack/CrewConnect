import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
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

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

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
