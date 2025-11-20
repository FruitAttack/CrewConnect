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
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ClockInDetail() {
  // Job Dropdown
  const [jobOpen, setJobOpen] = useState(false);
  const [job, setJob] = useState(null);
  const [jobItems, setJobItems] = useState([
    // Sample job items add backend integration later
    { label: "Item 1", value: "item1" },
    { label: "Item 2", value: "item2" },
    { label: "Item 3", value: "item3" },
  ]);
  // Cost Code Dropdown
  const [costOpen, setCostOpen] = useState(false);
  const [costCode, setCostCode] = useState(null);
  const [costItems, setCostItems] = useState([
    // Sample cost code items add backend integration later
    { label: "Code 001", value: "001" },
    { label: "Code 002", value: "002" },
    { label: "Code 003", value: "003" },
  ]);
  // Equipment Dropdown
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const [equipmentItems, setEquipmentItems] = useState([
    // Sample equipment items add backend integration later
    { label: "Excavator", value: "excavator" },
    { label: "Truck", value: "truck" },
    { label: "Forklift", value: "forklift" },
  ]);
  // Notes Input Field
  const [notes, setNotes] = useState("");

  const handleStart = () => {
    console.log("Start button pressed!");
    console.log("Job:", job);
    console.log("Cost Code:", costCode);
    console.log("Equipment:", equipment);
    console.log("Notes:", notes);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      // Keyboard Avoiding View for better UX when keyboard is open
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            // Job Dropdown
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
            // Cost Code Dropdown
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
            // Equipment Dropdown
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
            // Notes Input Field
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Enter notes here"
              value={notes}
              onChangeText={setNotes}
              returnKeyType="done"
            />
            // Start Button
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
