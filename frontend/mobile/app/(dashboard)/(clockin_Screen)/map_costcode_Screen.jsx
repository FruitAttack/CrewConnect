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
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { apiCall } from "../../../utils/api";
import { useSession } from "../../../utils/ctx";
import { useTimeStore } from "../../../store/timeStore";

// Conditionally import map components
import MapComponentWeb from "./MapComponentWeb";
import MapComponentNative from "./MapComponentNative";

// Geofence validation helpers
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;

    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function isUserInProjectBoundary(userLat, userLng, project) {
  if (!project.geofenceEnabled) return false;

  if (project.geofenceType === "RADIUS" && project.geofenceCenter) {
    const center = project.geofenceCenter;
    const distance = calculateDistance(userLat, userLng, center.lat, center.lng);
    return distance <= (project.geofenceRadius || 100);
  } else if (project.geofenceType === "POLYGON" && project.geofencePolygon) {
    return isPointInPolygon(userLat, userLng, project.geofencePolygon);
  }

  return false;
}

// Select the right map component based on platform
const MapComponent = Platform.OS === "web" ? MapComponentWeb : MapComponentNative;

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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  itemSelected: {
    backgroundColor: "#F2F2F7",
  },
  itemText: {
    fontSize: 16,
    color: "#000",
    flex: 1,
  },
  itemTextSelected: {
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});

export default function ClockInDetail() {
  const { session } = useSession();
  const doClockIn = useTimeStore((s) => s.doClockIn);

  // ------------------ Location ------------------
  const [location, setLocation] = useState(null);

  // ------------------ Project (Job) ------------------
  const [jobPickerVisible, setJobPickerVisible] = useState(false);
  const [job, setJob] = useState(null);
  const [jobItems, setJobItems] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [projectsRaw, setProjectsRaw] = useState([]);

  // ------------------ Nearby Project Suggestion ------------------
  const [nearbyProject, setNearbyProject] = useState(null);
  const [showNearbyModal, setShowNearbyModal] = useState(false);

  // ------------------ Cost Code ------------------
  const [costPickerVisible, setCostPickerVisible] = useState(false);
  const [costCode, setCostCode] = useState(null);
  const [costItems, setCostItems] = useState([]);
  const [loadingCosts, setLoadingCosts] = useState(false);

  // ------------------ Equipment ------------------
  const [equipPickerVisible, setEquipPickerVisible] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const [equipmentItems, setEquipmentItems] = useState([]);
  const [loadingEquip, setLoadingEquip] = useState(true);

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get selected labels for display
  const getSelectedLabel = (items, value) => {
    const item = items.find((i) => i.value === value);
    return item ? item.label : "";
  };

  // ------------------ Get User Location ------------------
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = currentLocation.coords;

      setLocation({ latitude, longitude });
    })();
  }, []);

  // ------------------ Load Projects ------------------
  useEffect(() => {
    if (!session?.access_token) return;

    (async () => {
      setLoadingJobs(true);
      try {
        const res = await apiCall(session.access_token, "projects", "GET");

        if (res.success && res.data) {
          const projectsData = Array.isArray(res.data)
            ? res.data
            : res.data.projects || [];

          console.log("Projects loaded:", projectsData.length);
          setProjectsRaw(projectsData);

          if (Array.isArray(projectsData) && projectsData.length > 0) {
            setJobItems(
              projectsData.map((p) => ({
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
        Alert.alert(
          "Error",
          "Unable to load projects. Please check your connection."
        );
      } finally {
        setLoadingJobs(false);
      }
    })();
  }, [session]);

  // ------------------ Check if User is Within Project Boundary ------------------
  useEffect(() => {
    if (!location || projectsRaw.length === 0 || job) return;

    const { latitude, longitude } = location;

    const nearbyProjects = projectsRaw.filter((project) =>
      isUserInProjectBoundary(latitude, longitude, project)
    );

    if (nearbyProjects.length >= 1) {
      setNearbyProject(nearbyProjects[0]);
      setShowNearbyModal(true);
    }
  }, [location, projectsRaw, job]);

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
          const costCodesData = Array.isArray(res.data)
            ? res.data
            : res.data.cost_codes || [];

          if (Array.isArray(costCodesData) && costCodesData.length > 0) {
            setCostItems(
              costCodesData
                .filter((c) => c.cost_code && c.cost_code.active !== false)
                .map((c) => ({
                  label: `${c.cost_code.code} - ${c.cost_code.name}`,
                  value: c.cost_code.id,
                }))
            );
          } else {
            setCostItems([]);
          }
        } else {
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
          const equipmentData = Array.isArray(res.data)
            ? res.data
            : res.data.equipment || [];

          if (Array.isArray(equipmentData) && equipmentData.length > 0) {
            setEquipmentItems(
              equipmentData
                .filter((e) => e.active !== false)
                .map((e) => ({
                  label:
                    e.type && e.label
                      ? `${e.type} - ${e.label}`
                      : e.label || e.type || "Unknown",
                  value: e.id,
                }))
            );
          }
        }
      } catch (error) {
        console.error("Error loading equipment:", error);
      } finally {
        setLoadingEquip(false);
      }
    })();
  }, [session]);

  // ------------------ Handle Nearby Project Selection ------------------
  const handleAcceptNearbyProject = () => {
    if (nearbyProject) {
      setJob(nearbyProject.id);
      setShowNearbyModal(false);
      setNearbyProject(null);
    }
  };

  const handleDeclineNearbyProject = () => {
    setShowNearbyModal(false);
    setNearbyProject(null);
  };

  // ------------------ Submit ------------------
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

      router.back();
    } catch (error) {
      console.error("Clock-in error:", error);
      Alert.alert("Error", "Failed to clock in. Please try again.");
      setIsSubmitting(false);
    }
  };

  // ------------------ UI ------------------
  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapComponent
          location={location}
          projects={projectsRaw}
          selectedProjectId={job}
        />
      </View>

      {/* Nearby Project Suggestion Modal */}
      <Modal
        visible={showNearbyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDeclineNearbyProject}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nearby Project Detected</Text>
            <Text style={styles.modalText}>
              You appear to be at{" "}
              <Text style={styles.modalProjectName}>{nearbyProject?.name}</Text>.
              {"\n"}Would you like to clock in here?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonSecondary}
                onPress={handleDeclineNearbyProject}
              >
                <Text style={styles.modalButtonSecondaryText}>No, Choose Manually</Text>
              </Pressable>
              <Pressable
                style={styles.modalButtonPrimary}
                onPress={handleAcceptNearbyProject}
              >
                <Text style={styles.modalButtonPrimaryText}>Yes, Clock In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Picker Modals */}
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

      {/* Bottom Card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.cardWrapper}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.card}>
            {/* Job Field */}
            <Pressable
              style={styles.fieldRow}
              onPress={() => setJobPickerVisible(true)}
            >
              <Text style={styles.fieldLabel}>Job:</Text>
              <View style={styles.fieldValueRow}>
                {loadingJobs ? (
                  <ActivityIndicator size="small" color="#999" />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.fieldValueText,
                        !job && styles.fieldPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {job ? getSelectedLabel(jobItems, job) : "Select a job"}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </>
                )}
              </View>
            </Pressable>

            {/* Cost Code Field */}
            <Pressable
              style={[styles.fieldRow, !job && styles.fieldDisabled]}
              onPress={() => job && setCostPickerVisible(true)}
              disabled={!job}
            >
              <Text style={styles.fieldLabel}>Cost Code:</Text>
              <View style={styles.fieldValueRow}>
                {loadingCosts ? (
                  <ActivityIndicator size="small" color="#999" />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.fieldValueText,
                        !costCode && styles.fieldPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {costCode
                        ? getSelectedLabel(costItems, costCode)
                        : job
                        ? "Select a cost code"
                        : "Select a job first"}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </>
                )}
              </View>
            </Pressable>

            {/* Equipment Field */}
            <Pressable
              style={styles.fieldRow}
              onPress={() => setEquipPickerVisible(true)}
            >
              <Text style={styles.fieldLabel}>Equipment:</Text>
              <View style={styles.fieldValueRow}>
                {loadingEquip ? (
                  <ActivityIndicator size="small" color="#999" />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.fieldValueText,
                        !equipment && styles.fieldPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {equipment
                        ? getSelectedLabel(equipmentItems, equipment)
                        : "None (optional)"}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </>
                )}
              </View>
            </Pressable>

            {/* Notes Field */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Notes:</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor="#999"
                multiline={false}
              />
            </View>

            {/* Start Button */}
            <Pressable
              style={[
                styles.button,
                (loadingJobs || loadingEquip || isSubmitting) &&
                  styles.buttonDisabled,
              ]}
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  mapContainer: {
    flex: 1,
    width: "100%",
    minHeight: 200,
    overflow: "hidden",
  },
  cardWrapper: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  card: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  fieldRow: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingBottom: 12,
  },
  fieldDisabled: {
    opacity: 0.5,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldValueText: {
    fontSize: 17,
    color: "#000",
    flex: 1,
  },
  fieldPlaceholder: {
    color: "#999",
  },
  notesInput: {
    fontSize: 17,
    color: "#000",
    paddingVertical: 4,
  },
  button: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  modalProjectName: {
    fontWeight: "600",
    color: "#000",
  },
  modalButtons: {
    flexDirection: "column",
    gap: 12,
  },
  modalButtonPrimary: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonSecondary: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonSecondaryText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
});