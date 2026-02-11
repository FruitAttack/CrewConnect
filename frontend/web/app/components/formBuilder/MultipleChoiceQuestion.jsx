import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function MultipleChoiceQuestion({
  question,
  options = [],
  value = null,
  onValueChange,
  required = false,
  editable = true,
}) {
  const handleSelect = (optionValue) => {
    if (!editable) return;
    onValueChange(optionValue);
  };

  return (
    <View style={styles.container}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          const isSelected = value === optionValue;

          return (
            <Pressable
              key={index}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                !editable && styles.optionDisabled,
              ]}
              onPress={() => handleSelect(optionValue)}
              disabled={!editable}
            >
              <View style={styles.radioOuter}>
                {isSelected && <View style={styles.radioInner} />}
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
    borderColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  optionDisabled: {
    opacity: 0.6,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#666",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2196F3",
  },
  optionText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  optionTextSelected: {
    color: "#1976D2",
    fontWeight: "500",
  },
});
