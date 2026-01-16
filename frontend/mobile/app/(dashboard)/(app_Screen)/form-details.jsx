import React, { useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import FormBuilder from "../../../components/FormBuilder";
import SuccessScreen from "../../../components/SuccessScreen";
import { getFormById } from "../../../utils/sampleForms";

export default function FormDetailsScreen() {
  const { formId } = useLocalSearchParams();
  const form = getFormById(formId);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (formSubmission) => {
    console.log("Form Submitted:", formSubmission);
    setShowSuccess(true);
  };

  if (!form) {
    Alert.alert("Error", "Form not found", [
      { text: "Go Back", onPress: () => router.back() },
    ]);
    return null;
  }

  if (showSuccess) {
    return (
      <SuccessScreen
        title="Form submitted"
        subtitle={`${form.title} has been recorded.`}
      />
    );
  }

  return <FormBuilder form={form} onSubmit={handleSubmit} />;
}