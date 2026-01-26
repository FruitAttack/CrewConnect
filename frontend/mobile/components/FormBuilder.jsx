import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShortAnswerQuestion,
  LongAnswerQuestion,
  MultipleChoiceQuestion,
  CheckboxQuestion,
  DateQuestion,
  DateTimeQuestion,
  TimeQuestion,
  PhotoUploadQuestion,
} from "./formBuilder/index.js";
import { FORM_FIELD_TYPES } from "../utils/formSchema";

/**
 * Generic FormBuilder component that renders forms from JSON schema
 */
export default function FormBuilder({ form, onSubmit }) {
  const [formData, setFormData] = React.useState({});

  const handleFieldChange = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSubmit = () => {
    const submission = {
      formId: form.id,
      formTitle: form.title,
      data: formData,
      submittedAt: new Date().toISOString(),
    };
    onSubmit(submission);
  };

  const renderField = (field) => {
    // Check if field should be shown based on conditional logic
    if (field.conditional) {
      const { dependsOn, value } = field.conditional;
      if (formData[dependsOn] !== value) {
        return null;
      }
    }

    const value = formData[field.id];
    const commonProps = {
      question: field.question,
      required: field.required || false,
      editable: true,
    };

    switch (field.type) {
      case FORM_FIELD_TYPES.SHORT_ANSWER:
        return (
          <ShortAnswerQuestion
            key={field.id}
            {...commonProps}
            value={value || ""}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            placeholder={field.placeholder}
          />
        );

      case FORM_FIELD_TYPES.LONG_ANSWER:
        return (
          <LongAnswerQuestion
            key={field.id}
            {...commonProps}
            value={value || ""}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            placeholder={field.placeholder}
            minLines={field.minLines || 4}
          />
        );

      case FORM_FIELD_TYPES.MULTIPLE_CHOICE:
        return (
          <MultipleChoiceQuestion
            key={field.id}
            {...commonProps}
            value={value || null}
            onValueChange={(val) => handleFieldChange(field.id, val)}
            options={field.options}
          />
        );

      case FORM_FIELD_TYPES.CHECKBOX:
        return (
          <CheckboxQuestion
            key={field.id}
            {...commonProps}
            value={value || []}
            onValueChange={(val) => {
              const min = typeof field.minSelections === "number" ? field.minSelections : 0;
              if (min > 0 && Array.isArray(val) && val.length < min) {
                return;
              }
              handleFieldChange(field.id, val);
            }}
            options={field.options}
            minSelections={field.minSelections}
            maxSelections={field.maxSelections}
          />
        );

      case FORM_FIELD_TYPES.DATE:
        return (
          <DateQuestion
            key={field.id}
            {...commonProps}
            value={value || null}
            onValueChange={(date) => handleFieldChange(field.id, date)}
          />
        );

      case FORM_FIELD_TYPES.DATE_TIME:
        return (
          <DateTimeQuestion
            key={field.id}
            {...commonProps}
            value={value || null}
            onValueChange={(dateTime) => handleFieldChange(field.id, dateTime)}
          />
        );

      case FORM_FIELD_TYPES.TIME:
        return (
          <TimeQuestion
            key={field.id}
            {...commonProps}
            value={value || null}
            onValueChange={(time) => handleFieldChange(field.id, time)}
          />
        );

      case FORM_FIELD_TYPES.PHOTO:
        return (
          <PhotoUploadQuestion
            key={field.id}
            {...commonProps}
            value={value || []}
            onValueChange={(photos) => handleFieldChange(field.id, photos)}
            maxPhotos={field.maxPhotos || 5}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{form.title}</Text>
          <Text style={styles.description}>{form.description}</Text>
        </View>

        {form.fields.map((field) => renderField(field))}

        <View style={styles.buttonContainer}>
          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit Form</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
  },
  buttonContainer: {
    gap: 12,
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
