import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CheckboxQuestion({
  question,
  options = [],
  value = [],
  onValueChange,
  required = false,
  editable = true,
  minSelections = 0,
  maxSelections = null,
}) {
  const handleToggle = (optionValue) => {
    if (!editable) return;

    const currentValue = Array.isArray(value) ? value : [];
    const isSelected = currentValue.includes(optionValue);

    let newValue;
    if (isSelected) {
      newValue = currentValue.filter((v) => v !== optionValue);
    } else {
      if (maxSelections && currentValue.length >= maxSelections) {
        return;
      }
      newValue = [...currentValue, optionValue];
    }

    onValueChange(newValue);
  };

  const currentValue = Array.isArray(value) ? value : [];

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

      {(minSelections > 0 || maxSelections) && (
        <Text style={styles.helperText}>
          {minSelections > 0 && maxSelections
            ? `Select ${minSelections}-${maxSelections} options`
            : minSelections > 0
            ? `Select at least ${minSelections} option(s)`
            : `Select up to ${maxSelections} option(s)`}
        </Text>
      )}

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          const isSelected = currentValue.includes(optionValue);
          const isDisabled = !editable || (maxSelections && currentValue.length >= maxSelections && !isSelected);

          return (
            <Pressable
              key={index}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                isDisabled && styles.optionDisabled,
              ]}
              onPress={() => handleToggle(optionValue)}
              disabled={isDisabled}
            >
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {optionLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  required: {
    color: "#d71f0b",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
  },
  helperText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    fontStyle: "italic",
  },
  optionsContainer: {
    gap: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  optionSelected: {
    borderColor: "#ff9500",
    backgroundColor: "#fbedd9",
  },
  optionDisabled: {
    opacity: 0.6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#666",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  checkboxSelected: {
    borderColor: "#ff9500",
    backgroundColor: "#ff9500",
  },
  optionText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  optionTextSelected: {
    color: "#ff9500",
    fontWeight: "500",
  },
});
