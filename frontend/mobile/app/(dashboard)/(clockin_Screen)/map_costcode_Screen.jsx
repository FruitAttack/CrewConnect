import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiCall } from "../../../utils/api";
import { useSession } from "../../../utils/ctx";
import { useTimeStore } from "../../../store/timeStore";

export default function ClockInDetail() {
  const { session } = useSession();
  const doClockIn = useTimeStore((s) => s.doClockIn);

  // ------------------ Project (Job) ------------------
  const [jobOpen, setJobOpen] = useState(false);
  const [job, setJob] = useState(null);
  const [jobItems, setJobItems] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // ------------------ Cost Code ------------------
  const [costOpen, setCostOpen] = useState(false);
  const [costCode, setCostCode] = useState(null);
  const [costItems, setCostItems] = useState([]);
  const [loadingCosts, setLoadingCosts] = useState(false);

  // ------------------ Equipment ------------------
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [loadingEquip, setLoadingEquip] = useState(true);

  const [notes, setNotes] = useState("");

  // ------------------ Load Projects ------------------
  useEffect(() => {
    if (!session?.access_token) return;

    (async () => {
      setLoadingJobs(true);
      try {
        const res = await apiCall(session.access_token, "projects", "GET");
        
        if (res.success && res.data) {
          // Your API returns data directly, could be array or object with projects property
          const projectsData = Array.isArray(res.data) ? res.data : (res.data.projects || []);
          
          console.log("Projects loaded:", projectsData.length);
          
          if (Array.isArray(projectsData) && projectsData.length > 0) {
            setJobItems(
              projectsData
                .map((p) => ({
                  label: p.name,
                  value: p.id,
                }))
            );
          } else {
            console.warn("No projects found");
            Alert.alert("No Projects", "No active projects available.");
          }
        } else {
          console.error("Failed to load projects:", res.message);
          Alert.alert("Error", `Unable to load projects: ${res.message}`);
        }
      } catch (error) {
        console.error("Error loading projects:", error);
        Alert.alert("Error", "Unable to load projects. Please check your connection.");
      } finally {
        setLoadingJobs(false);
      }
    })();
  }, [session]);

  // ------------------ Load Cost Codes (by Project) ------------------
  useEffect(() => {
    if (!session?.access_token || !job) {
      setCostItems([]);
      return;
    }

    setCostCode(null);
    setLoadingCosts(true);

    (async () => {
      try {
        const res = await apiCall(
          session.access_token,
          `projects/${job}/cost-codes`,
          "GET"
        );

        if (res.success && res.data) {
          const costCodesData = Array.isArray(res.data) ? res.data : (res.data.cost_codes || []);
          
          console.log("Cost codes loaded:", costCodesData.length);
          
          if (Array.isArray(costCodesData) && costCodesData.length > 0) {
            setCostItems(
              costCodesData
.filter(c => c.cost_code && c.cost_code.active !== false)
.map((c) => ({
  label: `${c.cost_code.code} - ${c.cost_code.name}`,
  value: c.cost_code.id,
                }))
            );
          } else {
            console.warn("No cost codes found for this project");
            setCostItems([]);
          }
        } else {
          console.error("Failed to load cost codes:", res.message);
          setCostItems([]);
        }
      } catch (error) {
        console.error("Error loading cost codes:", error);
        setCostItems([]);
      } finally {
        setLoadingCosts(false);
      }
    })();
  }, [job, session]);

  // ------------------ Load Equipment ------------------
  useEffect(() => {
    if (!session?.access_token) return;

    (async () => {
      setLoadingEquip(true);
      try {
        const res = await apiCall(session.access_token, "equipment", "GET");
        
        if (res.success && res.data) {
          const equipmentData = Array.isArray(res.data) ? res.data : (res.data.equipment || []);
          
          console.log("Equipment loaded:", equipmentData.length);
          
          if (Array.isArray(equipmentData) && equipmentData.length > 0) {
            setEquipmentItems(
              equipmentData
                .filter(e => e.active !== false) // Only show active equipment
                .map((e) => ({
                  // Equipment has: type, label, model
                  label: e.type && e.label 
                    ? `${e.type} - ${e.label}` 
                    : e.label || e.type || "Unknown",
                  value: e.id,
                }))
            );
          } else {
            console.warn("No equipment found");
          }
        } else {
          console.error("Failed to load equipment:", res.message);
        }
      } catch (error) {
        console.error("Error loading equipment:", error);
      } finally {
        setLoadingEquip(false);
      }
    })();
  }, [session]);

  // ------------------ Dropdown Coordination ------------------
  const onJobOpen = () => {
    setCostOpen(false);
    setEquipOpen(false);
  };

  const onCostOpen = () => {
    setJobOpen(false);
    setEquipOpen(false);
  };

  const onEquipOpen = () => {
    setJobOpen(false);
    setCostOpen(false);
  };

  // ------------------ Submit ------------------
  const handleStart = async () => {
    if (!job || !costCode) {
      Alert.alert("Validation Error", "Please select a Project and Cost Code.");
      return;
    }

    try {
      const response = await doClockIn(session, {
        project_id: job,
        cost_code_id: costCode,
        equipment_id: equipment || null,
        notes: notes.trim() || null,
      });

      if (!response.success) {
        Alert.alert("Clock-in Failed", response.message || "An error occurred");
        return;
      }

      Alert.alert("Success", "Clocked in!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Clock-in error:", error);
      Alert.alert("Error", "Failed to clock in. Please try again.");
    }
  };

  // ------------------ UI ------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <Text style={styles.label}>Project</Text>
            <View style={{ zIndex: 3000 }}>
              {loadingJobs ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading projects...</Text>
                </View>
              ) : (
                <DropDownPicker
                  open={jobOpen}
                  onOpen={onJobOpen}
                  value={job}
                  items={jobItems}
                  setOpen={setJobOpen}
                  setValue={setJob}
                  setItems={setJobItems}
                  placeholder="Select Project"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                />
              )}
            </View>

            <Text style={styles.label}>Cost Code</Text>
            <View style={{ zIndex: 2000 }}>
              {loadingCosts ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading cost codes...</Text>
                </View>
              ) : (
                <DropDownPicker
                  open={costOpen}
                  onOpen={onCostOpen}
                  value={costCode}
                  items={costItems}
                  setOpen={setCostOpen}
                  setValue={setCostCode}
                  setItems={setCostItems}
                  placeholder={job ? "Select Cost Code" : "Select a project first"}
                  disabled={!job}
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                />
              )}
            </View>

            <Text style={styles.label}>Equipment (Optional)</Text>
            <View style={{ zIndex: 1000 }}>
              {loadingEquip ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Loading equipment...</Text>
                </View>
              ) : (
                <DropDownPicker
                  open={equipOpen}
                  onOpen={onEquipOpen}
                  value={equipment}
                  items={equipmentItems}
                  setOpen={setEquipOpen}
                  setValue={setEquipment}
                  setItems={setEquipmentItems}
                  placeholder="Select Equipment"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                />
              )}
            </View>

            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              placeholder="Add any notes..."
              value={notes}
              onChangeText={setNotes}
            />

            <Pressable 
              style={[styles.button, (loadingJobs || loadingEquip) && styles.buttonDisabled]} 
              onPress={handleStart}
              disabled={loadingJobs || loadingEquip}
            >
              <Text style={styles.buttonText}>Start</Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "white" },
  container: { flex: 1, padding: 16, justifyContent: "center" },
  label: { marginTop: 14, fontWeight: "600", fontSize: 16 },
  dropdown: { borderColor: "#aaa", borderWidth: 1, borderRadius: 6 },
  dropdownContainer: { borderColor: "#aaa", borderWidth: 1 },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
  },
  loadingText: {
    marginLeft: 10,
    color: "#666",
    fontSize: 14,
  },
  notesInput: {
    marginTop: 10,
    borderColor: "#aaa",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    minHeight: 80,
  },
  button: {
    marginTop: 30,
    backgroundColor: "black",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});