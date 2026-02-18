import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
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
  const [tempDate, setTempDate] = useState(value || new Date());

  useEffect(() => {
    if (!showPicker) {
      setTempDate(value || new Date());
    }
  }, [value, showPicker]);

  const handleDateChange = (event, selectedDate) => {
    if (!selectedDate) return;
    setTempDate(selectedDate);
    if (Platform.OS === "android") {
      setShowPicker(false);
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

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

      <Pressable
        style={[styles.dateButton, !editable && styles.dateButtonDisabled]}
        onPress={() => {
          if (!editable) return;
          setTempDate(value || new Date());
          setShowPicker(true);
        }}
        disabled={!editable}
      >
        <Ionicons name="calendar" size={20} color="#2196F3" />
        <Text style={[styles.dateButtonText, !value && styles.placeholderText]}>
          {formatDate(value)}
        </Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === "ios" && showPicker && (
        <View style={styles.iosPickerActions}>
          <Pressable
            style={styles.iosButton}
            onPress={() => {
              onValueChange(tempDate);
              setShowPicker(false);
            }}
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
