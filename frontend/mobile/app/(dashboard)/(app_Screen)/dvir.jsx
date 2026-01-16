import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ShortAnswerQuestion,
  LongAnswerQuestion,
  MultipleChoiceQuestion,
  CheckboxQuestion,
  DateQuestion,
  DateTimeQuestion,
  TimeQuestion,
  PhotoUploadQuestion,
} from "../../../components/formBuilder";

export default function DVIRForm() {
  // Form state
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [mileage, setMileage] = useState("");
  const [inspectionDate, setInspectionDate] = useState(new Date());
  const [inspectionDateTime, setInspectionDateTime] = useState(new Date());
  const [completionTime, setCompletionTime] = useState(new Date());
  const [inspectionType, setInspectionType] = useState(null);
  const [vehicleCondition, setVehicleCondition] = useState(null);
  const [inspectionItems, setInspectionItems] = useState([]);
  const [defectsFound, setDefectsFound] = useState(null);
  const [defectDescription, setDefectDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState([]);

  const handleSubmit = () => {
    // Validate required fields
    if (!vehicleNumber || !driverName || !mileage || !inspectionType || !vehicleCondition) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    if (defectsFound === "yes" && !defectDescription.trim()) {
      Alert.alert("Validation Error", "Please describe the defects found.");
      return;
    }

    // Build form data
    const formData = {
      vehicleNumber,
      driverName,
      mileage,
      inspectionDate,
      inspectionDateTime,
      completionTime,
      inspectionType,
      vehicleCondition,
      inspectionItems,
      defectsFound,
      defectDescription: defectsFound === "yes" ? defectDescription : null,
      additionalNotes: additionalNotes.trim() || null,
      uploadedPhotos: uploadedPhotos.map(f => ({ name: f.name, size: f.size })),
      submittedAt: new Date().toISOString(),
    };

    console.log("DVIR Form Submitted:", formData);

    Alert.alert(
      "Form Submitted",
      "Daily Vehicle Inspection Report has been recorded.",
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Vehicle Inspection Report</Text>
          <Text style={styles.subtitle}>Complete all required fields before submission</Text>
        </View>

        <ShortAnswerQuestion
          question="Vehicle Number"
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          required
          placeholder="e.g., TRUCK-101"
        />

        <ShortAnswerQuestion
          question="Driver Name"
          value={driverName}
          onChangeText={setDriverName}
          required
          placeholder="Enter driver's name"
        />

        <ShortAnswerQuestion
          question="Current Mileage/Hours"
          value={mileage}
          onChangeText={setMileage}
          required
          placeholder="e.g., 45,230"
        />

        <DateQuestion
          question="Inspection Date"
          value={inspectionDate}
          onValueChange={setInspectionDate}
          required
        />

        <DateTimeQuestion
          question="Inspection Start Date & Time"
          value={inspectionDateTime}
          onValueChange={setInspectionDateTime}
          required
        />

        <TimeQuestion
          question="Completion Time"
          value={completionTime}
          onValueChange={setCompletionTime}
        />

        <MultipleChoiceQuestion
          question="Inspection Type"
          options={[
            { value: "pre-trip", label: "Pre-Trip Inspection" },
            { value: "post-trip", label: "Post-Trip Inspection" },
            { value: "both", label: "Pre & Post Trip" },
          ]}
          value={inspectionType}
          onValueChange={setInspectionType}
          required
        />

        <MultipleChoiceQuestion
          question="Overall Vehicle Condition"
          options={[
            { value: "excellent", label: "Excellent - No Issues" },
            { value: "good", label: "Good - Minor Wear" },
            { value: "fair", label: "Fair - Needs Attention" },
            { value: "poor", label: "Poor - Immediate Service Required" },
          ]}
          value={vehicleCondition}
          onValueChange={setVehicleCondition}
          required
        />

        <CheckboxQuestion
          question="Inspection Items - Check all that were inspected"
          options={[
            "Tires & Wheels",
            "Brakes",
            "Lights & Signals",
            "Fluid Levels",
            "Horn & Wipers",
            "Mirrors & Windows",
            "Seat Belts",
            "Fire Extinguisher",
            "Emergency Equipment",
            "Body & Frame",
          ]}
          value={inspectionItems}
          onValueChange={setInspectionItems}
          required
          minSelections={3}
        />

        <MultipleChoiceQuestion
          question="Were any defects or issues found?"
          options={[
            { value: "no", label: "No - Vehicle is safe to operate" },
            { value: "yes", label: "Yes - Defects found (describe below)" },
          ]}
          value={defectsFound}
          onValueChange={setDefectsFound}
          required
        />

        {defectsFound === "yes" && (
          <LongAnswerQuestion
            question="Describe Defects Found"
            value={defectDescription}
            onChangeText={setDefectDescription}
            required
            placeholder="Provide detailed description of all defects or safety concerns..."
            minLines={5}
          />
        )}

        <LongAnswerQuestion
          question="Additional Notes or Comments"
          value={additionalNotes}
          onChangeText={setAdditionalNotes}
          placeholder="Any additional observations or maintenance recommendations..."
          minLines={3}
        />

        <PhotoUploadQuestion
          question="Upload Inspection Photos"
          value={uploadedPhotos}
          onValueChange={setUploadedPhotos}
          maxPhotos={5}
          maxFileSize={10 * 1024 * 1024}
        />

        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit DVIR</Text>
        </Pressable>
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
  subtitle: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  submitButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
