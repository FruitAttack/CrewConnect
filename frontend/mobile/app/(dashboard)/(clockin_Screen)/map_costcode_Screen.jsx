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
  Modal,
  FlatList,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiCall } from "../../../utils/api";
import { useSession } from "../../../utils/ctx";
import { useTimeStore } from "../../../store/timeStore";
import * as Location from "expo-location";

const LAST_CLOCKIN_KEY = "crewconnect_last_clockin";

function getDistanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Reusable Modal Picker Component
function ModalPicker({ visible, onClose, title, items, selectedValue, onSelect, loading }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={pickerStyles.container}>
        {/* Header */}
        <View style={pickerStyles.header}>
          <Pressable onPress={onClose} style={pickerStyles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </Pressable>
          <Text style={pickerStyles.title}>{title}</Text>
          <View style={pickerStyles.closeButton} />
        </View>

        {/* Search */}
        <View style={pickerStyles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={pickerStyles.searchIcon} />
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </Pressable>
          )}
        </View>

        {/* List */}
        {loading ? (
          <View style={pickerStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  pickerStyles.item,
                  selectedValue === item.value && pickerStyles.itemSelected,
                ]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text
                  style={[
                    pickerStyles.itemText,
                    selectedValue === item.value && pickerStyles.itemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {selectedValue === item.value && (
                  <Ionicons name="checkmark" size={22} color="#007AFF" />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={pickerStyles.emptyContainer}>
                <Text style={pickerStyles.emptyText}>No items found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "600", color: "#000" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#000" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  itemSelected: { backgroundColor: "#F2F2F7" },
  itemText: { fontSize: 16, color: "#000", flex: 1 },
  itemTextSelected: { fontWeight: "500" },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 16, color: "#999" },
});

export default function ClockInDetail() {
  const { session } = useSession();
  const doClockIn = useTimeStore((s) => s.doClockIn);

  const [location, setLocation] = useState(null);

  // Last clock-in
  const [lastClockIn, setLastClockIn] = useState(null);

  // Nearest jobs
  const [nearestJobs, setNearestJobs] = useState([]);
  const [projectsRaw, setProjectsRaw] = useState([]);

  // Project
  const [jobPickerVisible, setJobPickerVisible] = useState(false);
  const [job, setJob] = useState(null);
  const [jobItems, setJobItems] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Cost Code
  const [costPickerVisible, setCostPickerVisible] = useState(false);
  const [costCode, setCostCode] = useState(null);
  const [costItems, setCostItems] = useState([]);
  const [loadingCosts, setLoadingCosts] = useState(false);

  // Equipment
  const [equipPickerVisible, setEquipPickerVisible] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [loadingEquip, setLoadingEquip] = useState(true);

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSelectedLabel = (items, value) => {
    const item = items.find((i) => i.value === value);
    return item ? item.label : "";
  };

  // Load last clock-in from storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LAST_CLOCKIN_KEY);
        if (stored) setLastClockIn(JSON.parse(stored));
      } catch {}
    })();
  }, []);

  // Get location silently in background
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc.coords);
    })();
  }, []);

  // Load Projects
  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      setLoadingJobs(true);
      try {
        const res = await apiCall(session.access_token, "projects", "GET");
        if (res.success && res.data) {
          const projectsData = Array.isArray(res.data) ? res.data : res.data.projects || [];
          setProjectsRaw(projectsData);
          setJobItems(projectsData.map((p) => ({ label: p.name, value: p.id })));
        } else {
          Alert.alert("Error", `Unable to load projects: ${res.message}`);
        }
      } catch (error) {
        Alert.alert("Error", "Unable to load projects. Please check your connection.");
      } finally {
        setLoadingJobs(false);
      }
    })();
  }, [session]);

  // Compute nearest jobs whenever location or projects update
  useEffect(() => {
    if (!location || projectsRaw.length === 0) return;
    const withDistance = projectsRaw
      .filter((p) => p.lat && p.lng)
      .map((p) => ({
        ...p,
        distance: getDistanceMiles(location.latitude, location.longitude, p.lat, p.lng),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
    setNearestJobs(withDistance);
  }, [location, projectsRaw]);

  // Load Cost Codes by Project
  useEffect(() => {
    if (!session?.access_token || !job) {
      setCostItems([]);
      return;
    }
    setCostCode(null);
    setLoadingCosts(true);
    (async () => {
      try {
        const res = await apiCall(session.access_token, `projects/${job}/cost-codes`, "GET");
        if (res.success && res.data) {
          const data = Array.isArray(res.data) ? res.data : res.data.cost_codes || [];
          setCostItems(
            data
              .filter((c) => c.cost_code && c.cost_code.active !== false)
              .map((c) => ({ label: `${c.cost_code.code} - ${c.cost_code.name}`, value: c.cost_code.id }))
          );
        } else {
          setCostItems([]);
        }
      } catch {
        setCostItems([]);
      } finally {
        setLoadingCosts(false);
      }
    })();
  }, [job, session]);

  // Load Equipment
  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      setLoadingEquip(true);
      try {
        const res = await apiCall(session.access_token, "equipment", "GET");
        if (res.success && res.data) {
          const data = Array.isArray(res.data) ? res.data : res.data.equipment || [];
          setEquipmentItems(
            data
              .filter((e) => e.active !== false)
              .map((e) => ({
                label: e.type && e.label ? `${e.type} - ${e.label}` : e.label || e.type || "Unknown",
                value: e.id,
              }))
          );
        }
      } catch (error) {
        console.error("Error loading equipment:", error);
      } finally {
        setLoadingEquip(false);
      }
    })();
  }, [session]);

  const handleStart = async () => {
    if (!job || !costCode) {
      Alert.alert("Validation Error", "Please select a Job and Cost Code.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await doClockIn(session, {
        project_id: job,
        cost_code_id: costCode,
        equipment_id: equipment || null,
        notes: notes.trim() || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      });

      if (!response.success) {
        Alert.alert("Clock-in Failed", response.message || "An error occurred");
        setIsSubmitting(false);
        return;
      }

      // Save last clock-in for quick start
      try {
        await AsyncStorage.setItem(LAST_CLOCKIN_KEY, JSON.stringify({
          jobId: job,
          jobLabel: getSelectedLabel(jobItems, job),
          costCodeId: costCode,
          costCodeLabel: getSelectedLabel(costItems, costCode),
          equipmentId: equipment || null,
          equipmentLabel: equipment ? getSelectedLabel(equipmentItems, equipment) : null,
        }));
      } catch {}

      router.back();
    } catch (error) {
      console.error("Clock-in error:", error);
      Alert.alert("Error", "Failed to clock in. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.flex}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color="#1a1a1a" />
              </Pressable>
              <Text style={styles.headerTitle}>Clock In</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Form */}
            <View style={styles.form}>

              {/* Quick Start Banner */}
            {lastClockIn && !job && (
              <Pressable
                style={styles.quickStart}
                onPress={() => {
                  setJob(lastClockIn.jobId);
                  setCostCode(lastClockIn.costCodeId);
                  if (lastClockIn.equipmentId) setEquipment(lastClockIn.equipmentId);
                }}
              >
                <View style={styles.quickStartLeft}>
                  <Ionicons name="flash" size={18} color="#F67011" />
                  <View>
                    <Text style={styles.quickStartLabel}>Quick Start</Text>
                    <Text style={styles.quickStartSub} numberOfLines={1}>
                      {lastClockIn.jobLabel} · {lastClockIn.costCodeLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.quickStartAction}>Use</Text>
              </Pressable>
            )}

            {/* Nearest Jobs */}
            {nearestJobs.length > 0 && !job && (
              <View style={styles.nearestContainer}>
                <View style={styles.nearestHeader}>
                  <Ionicons name="location" size={14} color="#888" />
                  <Text style={styles.nearestTitle}>Nearest Jobs</Text>
                </View>
                {nearestJobs.map((p) => (
                  <Pressable
                    key={p.id}
                    style={styles.nearestRow}
                    onPress={() => setJob(p.id)}
                  >
                    <View style={styles.nearestLeft}>
                      <View style={styles.nearestDot} />
                      <Text style={styles.nearestName} numberOfLines={1}>{p.name}</Text>
                    </View>
                    <Text style={styles.nearestDistance}>
                      {p.distance < 0.1
                        ? "< 0.1 mi"
                        : `${p.distance.toFixed(1)} mi`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Job */}
              <Pressable style={styles.fieldRow} onPress={() => setJobPickerVisible(true)}>
                <View style={styles.fieldLeft}>
                  <Ionicons name="briefcase-outline" size={20} color="#F67011" />
                  <Text style={styles.fieldLabel}>Job</Text>
                </View>
                <View style={styles.fieldRight}>
                  {loadingJobs ? (
                    <ActivityIndicator size="small" color="#999" />
                  ) : (
                    <>
                      <Text style={[styles.fieldValue, !job && styles.fieldPlaceholder]} numberOfLines={1}>
                        {job ? getSelectedLabel(jobItems, job) : "Select a job"}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </>
                  )}
                </View>
              </Pressable>

              {/* Cost Code */}
              <Pressable
                style={[styles.fieldRow, !job && styles.fieldDisabled]}
                onPress={() => job && setCostPickerVisible(true)}
                disabled={!job}
              >
                <View style={styles.fieldLeft}>
                  <Ionicons name="code-outline" size={20} color="#F67011" />
                  <Text style={styles.fieldLabel}>Cost Code</Text>
                </View>
                <View style={styles.fieldRight}>
                  {loadingCosts ? (
                    <ActivityIndicator size="small" color="#999" />
                  ) : (
                    <>
                      <Text style={[styles.fieldValue, !costCode && styles.fieldPlaceholder]} numberOfLines={1}>
                        {costCode ? getSelectedLabel(costItems, costCode) : job ? "Select a cost code" : "Select a job first"}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </>
                  )}
                </View>
              </Pressable>

              {/* Equipment */}
              <Pressable style={styles.fieldRow} onPress={() => setEquipPickerVisible(true)}>
                <View style={styles.fieldLeft}>
                  <Ionicons name="construct-outline" size={20} color="#F67011" />
                  <Text style={styles.fieldLabel}>Equipment</Text>
                </View>
                <View style={styles.fieldRight}>
                  {loadingEquip ? (
                    <ActivityIndicator size="small" color="#999" />
                  ) : (
                    <>
                      <Text style={[styles.fieldValue, !equipment && styles.fieldPlaceholder]} numberOfLines={1}>
                        {equipment ? getSelectedLabel(equipmentItems, equipment) : "None (optional)"}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </>
                  )}
                </View>
              </Pressable>

              {/* Notes */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldLeft}>
                  <Ionicons name="create-outline" size={20} color="#F67011" />
                  <Text style={styles.fieldLabel}>Notes</Text>
                </View>
                <TextInput
                  style={[styles.fieldValue, styles.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional..."
                  placeholderTextColor="#ccc"
                  multiline={false}
                />
              </View>

            </View>

            {/* Start Button */}
            <View style={styles.footer}>
              <Pressable
                style={[styles.button, (loadingJobs || loadingEquip || isSubmitting) && styles.buttonDisabled]}
                onPress={handleStart}
                disabled={loadingJobs || loadingEquip || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Start</Text>
                )}
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Pickers */}
      <ModalPicker
        visible={jobPickerVisible}
        onClose={() => setJobPickerVisible(false)}
        title="Select Job"
        items={jobItems}
        selectedValue={job}
        onSelect={setJob}
        loading={loadingJobs}
      />
      <ModalPicker
        visible={costPickerVisible}
        onClose={() => setCostPickerVisible(false)}
        title="Select Cost Code"
        items={costItems}
        selectedValue={costCode}
        onSelect={setCostCode}
        loading={loadingCosts}
      />
      <ModalPicker
        visible={equipPickerVisible}
        onClose={() => setEquipPickerVisible(false)}
        title="Select Equipment"
        items={equipmentItems}
        selectedValue={equipment}
        onSelect={setEquipment}
        loading={loadingEquip}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },

  // Nearest Jobs
  nearestContainer: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#efefef",
    overflow: "hidden",
  },
  nearestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
  },
  nearestTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nearestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#efefef",
  },
  nearestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  nearestDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F67011",
  },
  nearestName: {
    fontSize: 14,
    color: "#1a1a1a",
    flex: 1,
  },
  nearestDistance: {
    fontSize: 13,
    color: "#888",
    marginLeft: 8,
  },

  // Quick Start
  quickStart: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: "#fff8f3",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde8d4",
  },
  quickStartLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  quickStartLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F67011",
  },
  quickStartSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 1,
    maxWidth: 220,
  },
  quickStartAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F67011",
    paddingLeft: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
  },

  // Form
  form: {
    flex: 1,
    paddingTop: 8,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  fieldDisabled: {
    opacity: 0.4,
  },
  fieldLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: 120,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  fieldRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a1a",
    textAlign: "right",
  },
  fieldPlaceholder: {
    color: "#ccc",
  },
  notesInput: {
    textAlign: "right",
    paddingVertical: 0,
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  button: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});