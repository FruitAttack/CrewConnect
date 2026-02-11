import React, { useState, useEffect, useCallback } from "react";
import { Alert, ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSession } from "../../../utils/ctx";
import { getForm, submitForm } from "../../../utils/api";
import FormBuilder from "../../../components/FormBuilder";
import SuccessScreen from "../../../components/SuccessScreen";

export default function FormDetailsScreen() {
  const { formId } = useLocalSearchParams();
  const { session } = useSession();
  const token = session?.access_token;
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchForm = useCallback(async () => {
    if (!token || !formId) return;
    setLoading(true);
    try {
      const response = await getForm(token, formId);
      console.log("Get form response:", response);
      
      if (response.success) {
        // Backend returns { form: data } directly
        let formData = response.data?.form || response.form;
        if (formData) {
          // Parse fields if they come as a JSON string
          if (typeof formData.fields === 'string') {
            formData.fields = JSON.parse(formData.fields || '[]');
          }
          setForm(formData);
        } else {
          Alert.alert("Error", "Form data not found", [
            { text: "Go Back", onPress: () => router.back() },
          ]);
        }
      } else {
        Alert.alert("Error", response.message || "Failed to load form", [
          { text: "Go Back", onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      console.error("Error fetching form:", err);
      Alert.alert("Error", "Failed to load form: " + err.message, [
        { text: "Go Back", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [token, formId]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  const handleSubmit = async (formSubmission) => {
    try {
      setSubmitting(true);
      console.log("Submitting form:", formSubmission);
      const response = await submitForm(token, formId, formSubmission);
      console.log("Submit response:", response);
      
      if (response.success) {
        setShowSuccess(true);
      } else {
        Alert.alert("Submit failed", response.message || "Could not submit the form.");
      }
    } catch (err) {
      console.error("Submit failed:", err);
      Alert.alert("Submit failed", "Could not submit the form: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

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
