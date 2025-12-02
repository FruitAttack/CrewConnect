import { router } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiCall } from "../../../utils/api";
import { useSession } from "../../../utils/ctx";
import { useTimeStore } from "../../../store/timeStore";

export default function ClockInDetail() {
  const { session } = useSession();
  const doClockIn = useTimeStore((s) => s.doClockIn); // Use the new async action

  // Job Dropdown
  const [jobOpen, setJobOpen] = useState(false);
  const [job, setJob] = useState(null);
  const [jobItems, setJobItems] = useState([
    { label: "Item 1", value: "item1" },
    { label: "Item 2", value: "item2" },
    { label: "Item 3", value: "item3" },
  ]);

  // Cost Code Dropdown
  const [costOpen, setCostOpen] = useState(false);
  const [costCode, setCostCode] = useState(null);
  const [costItems, setCostItems] = useState([
    { label: "Code 001", value: "001" },
    { label: "Code 002", value: "002" },
    { label: "Code 003", value: "003" },
  ]);

  // Equipment Dropdown
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const [equipmentItems, setEquipmentItems] = useState([
    { label: "Excavator", value: "excavator" },
    { label: "Truck", value: "truck" },
    { label: "Forklift", value: "forklift" },
  ]);

  // Notes Input Field
  const [notes, setNotes] = useState("");

  const handleStart = async () => {
    // Validate you selected a job/costCode at least
    if (!job || !costCode) {
      alert("Please select a Job and Cost Code.");
      return;
    }

    if (!session?.access_token) {
      alert("You are not logged in.");
      return;
    }

    // const body = {
    //   project_id: job,
    //   cost_code_id: costCode,
    //   equipment_id: equipment ?? null,
    //   notes: notes ?? null,
    // };
    const selectedProjectId = "f190e26e-4544-425d-8b8c-9f27fce5fb87"; // Lot 42 – Phase 1
    const selectedCostCodeId = "cca3e163-efef-44a3-a46b-ce78cf32934c"; // Sewer
    const body = {
      project_id: selectedProjectId,
      cost_code_id: selectedCostCodeId,
      // equipment_id: equipmentId ?? null,
      // latitude: position?.lat ?? null,
      // longitude: position?.lng ?? null,
      // notes: noteInput ?? null,
    };

    const response = await doClockIn(session, body);

    if (!response.success) {
      console.log("Clock-in failed:", response.message);
      Alert.alert("Clock-in Failed", response.message || "An unknown error occurred during clock-in.");
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Keyboard Avoiding View for better UX when keyboard is open */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Job Dropdown */}
            <Text style={styles.label}>Job</Text>
            <View style={{ zIndex: 3000 }}>
              <DropDownPicker
                open={jobOpen}
                value={job}
                items={jobItems}
                setOpen={setJobOpen}
                setValue={setJob}
                setItems={setJobItems}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                placeholder="Select Job"
              />
            </View>

            {/* Cost Code Dropdown */}
            <Text style={styles.label}>Cost Code</Text>
            <View style={{ zIndex: 2000 }}>
              <DropDownPicker
                open={costOpen}
                value={costCode}
                items={costItems}
                setOpen={setCostOpen}
                setValue={setCostCode}
                setItems={setCostItems}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                placeholder="Select Cost Code"
              />
            </View>

            {/* Equipment Dropdown */}
            <Text style={styles.label}>Equipment</Text>
            <View style={{ zIndex: 1000 }}>
              <DropDownPicker
                open={equipOpen}
                value={equipment}
                items={equipmentItems}
                setOpen={setEquipOpen}
                setValue={setEquipment}
                setItems={setEquipmentItems}
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                placeholder="Select Equipment"
              />
            </View>

            {/* Notes Input Field */}
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Enter notes here"
              value={notes}
              onChangeText={setNotes}
              returnKeyType="done"
            />

            {/* Start Button */}
            <Pressable style={styles.button} onPress={handleStart}>
              <Text style={styles.buttonText}>Start</Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  container: {
    padding: 20,
  },
  label: {
    marginTop: 15,
    fontWeight: "600",
    fontSize: 16,
  },
  dropdown: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
  },
  dropdownContainer: {
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
  },
  notesInput: {
    marginTop: 10,
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    marginTop: 30,
    backgroundColor: "black",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
