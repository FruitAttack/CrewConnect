import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Platform,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../../utils/ctx";
import {
  getTimeEntries,
  getUserProfile,
  getTimecardApprovals,
  bulkUpdateTimecardApprovals,
  updateTimeEntry,
} from "../../../utils/api";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../../constants/theme";

// Fixed widths for alignment - all columns use exact pixel widths
const CHECKBOX_WIDTH = 32;
const DAY_COLUMN_WIDTH = 52;
const DAYS_CONTAINER_WIDTH = DAY_COLUMN_WIDTH * 7; // 364px for all 7 days
const TOTAL_COLUMN_WIDTH = 70;
const CHEVRON_WIDTH = 24;
const SCROLLBAR_WIDTH = 8;

// Emerald green 500 for active status
const activeColor = "#10b981";

// Pulsing Dot Component for active status
const PulsingDot = ({ color = activeColor, size = 10 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View
      style={{
        position: "absolute",
        bottom: -1,
        right: -1,
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Pulsing ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: size - 4,
          height: size - 4,
          borderRadius: (size - 4) / 2,
          backgroundColor: color,
          opacity: 0.4,
          transform: [{ scale: pulseAnim }],
        }}
      />
      {/* Solid dot with white border */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: colors.neutral.white,
        }}
      />
    </View>
  );
};

// Date Picker Dropdown
const DatePickerDropdown = ({ selectedDate, onSelectDate, onClose, view }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isInSelectedWeek = (day) => {
    if (!day || view !== "week") return false;
    const d = new Date(year, month, day);
    const selStart = new Date(selectedDate);
    selStart.setDate(selStart.getDate() - selStart.getDay());
    const selEnd = new Date(selStart);
    selEnd.setDate(selEnd.getDate() + 6);
    return d >= selStart && d <= selEnd;
  };

  const isSelected = (day) => {
    if (!day) return false;
    if (view === "week") return isInSelectedWeek(day);
    return (
      new Date(year, month, day).toDateString() === selectedDate.toDateString()
    );
  };

  const isToday = (day) =>
    day &&
    new Date(year, month, day).toDateString() === new Date().toDateString();

  const handleDayPress = (day) => {
    if (day) {
      const newDate = new Date(year, month, day);
      onSelectDate(newDate);
      onClose();
    }
  };

  const handleQuickSelect = (type) => {
    let newDate;
    if (type === "today") {
      newDate = new Date();
    } else if (type === "thisWeek") {
      newDate = new Date();
      newDate.setDate(newDate.getDate() - newDate.getDay());
    } else if (type === "lastWeek") {
      newDate = new Date();
      newDate.setDate(newDate.getDate() - newDate.getDay() - 7);
    }
    onSelectDate(newDate);
    onClose();
  };

  return (
    <View style={dpStyles.container}>
      <View style={dpStyles.quickSelect}>
        <Pressable
          style={dpStyles.quickBtn}
          onPress={() => handleQuickSelect("today")}
        >
          <Text style={dpStyles.quickText}>Today</Text>
        </Pressable>
        <Pressable
          style={dpStyles.quickBtn}
          onPress={() => handleQuickSelect("thisWeek")}
        >
          <Text style={dpStyles.quickText}>This Week</Text>
        </Pressable>
        <Pressable
          style={dpStyles.quickBtn}
          onPress={() => handleQuickSelect("lastWeek")}
        >
          <Text style={dpStyles.quickText}>Last Week</Text>
        </Pressable>
      </View>
      <View style={dpStyles.divider} />
      <View style={dpStyles.header}>
        <Pressable
          onPress={() => setViewDate(new Date(year, month - 1, 1))}
          style={dpStyles.navBtn}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={colors.text.secondary}
          />
        </Pressable>
        <Text style={dpStyles.monthText}>
          {months[month]} {year}
        </Text>
        <Pressable
          onPress={() => setViewDate(new Date(year, month + 1, 1))}
          style={dpStyles.navBtn}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.text.secondary}
          />
        </Pressable>
      </View>
      <View style={dpStyles.weekRow}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <Text key={d} style={dpStyles.weekDay}>
            {d}
          </Text>
        ))}
      </View>
      <View style={dpStyles.daysGrid}>
        {days.map((day, idx) => (
          <Pressable
            key={idx}
            style={[
              dpStyles.dayCell,
              isSelected(day) && dpStyles.dayCellSelected,
              isToday(day) && !isSelected(day) && dpStyles.dayCellToday,
            ]}
            onPress={() => handleDayPress(day)}
            disabled={!day}
          >
            <Text
              style={[
                dpStyles.dayText,
                isSelected(day) && dpStyles.dayTextSelected,
                isToday(day) && !isSelected(day) && dpStyles.dayTextToday,
              ]}
            >
              {day || ""}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const dpStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderRadius: 10,
    padding: 12,
    ...shadows.lg,
    minWidth: 280,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickSelect: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  quickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: 4,
  },
  quickText: { fontSize: 11, fontWeight: "500", color: colors.text.secondary },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: { padding: 4 },
  monthText: { fontSize: 13, fontWeight: "600", color: colors.text.primary },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekDay: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  dayCellSelected: { backgroundColor: colors.primary.orange },
  dayCellToday: { borderWidth: 1, borderColor: colors.primary.orange },
  dayText: { fontSize: 12, color: colors.text.primary },
  dayTextSelected: { color: "#fff", fontWeight: "600" },
  dayTextToday: { color: colors.primary.orange, fontWeight: "600" },
});

// Status Badge Component (for approval status)
const StatusBadge = ({ status }) => {
  const config = {
    approved: {
      icon: "checkmark-circle",
      color: activeColor,
      label: "Approved",
    },
    rejected: {
      icon: "close-circle",
      color: colors.semantic.error,
      label: "Rejected",
    },
    pending_changes: {
      icon: "alert-circle",
      color: colors.semantic.warning,
      label: "Changes Requested",
    },
  };
  const { icon, color, label } = config[status] || {};
  if (!icon) return null;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  text: { fontSize: 11, fontWeight: "500" },
});

// ─── Edit Entry Modal ─────────────────────────────────────────────────────────
const EditEntryModal = ({ visible, onClose, entry, onSave }) => {
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [breakMin, setBreakMin] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Convert ISO string to datetime-local format "YYYY-MM-DDTHH:MM"
  const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (entry) {
      setClockIn(toLocalInput(entry.clock_in));
      setClockOut(toLocalInput(entry.clock_out));
      setBreakMin(String(entry.break_minutes || 0));
      setNotes(entry.notes || "");
      setError(null);
    }
  }, [entry]);

  const computedHours = useMemo(() => {
    if (!clockIn || !clockOut) return null;
    const diff =
      (new Date(clockOut) - new Date(clockIn)) / 3600000 -
      (parseInt(breakMin) || 0) / 60;
    return diff > 0 ? diff.toFixed(2) : null;
  }, [clockIn, clockOut, breakMin]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates = {
        clock_in: clockIn ? new Date(clockIn).toISOString() : undefined,
        clock_out: clockOut ? new Date(clockOut).toISOString() : null,
        break_minutes: parseInt(breakMin) || 0,
        notes,
      };
      await onSave(entry.id, updates);
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!entry) return null;

  const displayDate = new Date(entry.clock_in).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const webInputStyle = {
    border: `1px solid ${colors.border.light}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    color: colors.text.primary,
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    backgroundColor: colors.neutral.white,
    boxSizing: "border-box",
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={editStyles.overlay}>
        <Pressable
          style={editStyles.backdrop}
          onPress={!saving ? onClose : undefined}
        />
        <View style={editStyles.modal}>
          {/* Header */}
          <View style={editStyles.header}>
            <View style={{ flex: 1 }}>
              <Text style={editStyles.title}>Edit Time Entry</Text>
              <Text style={editStyles.subtitle}>
                {entry.project?.name || "No project"} · {displayDate}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={editStyles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Form Body */}
          <ScrollView
            style={editStyles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Clock In */}
            <View style={editStyles.fieldGroup}>
              <Text style={editStyles.label}>Clock In</Text>
              {Platform.OS === "web" ? (
                <input
                  type="datetime-local"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  style={webInputStyle}
                />
              ) : (
                <TextInput
                  style={editStyles.input}
                  value={clockIn}
                  onChangeText={setClockIn}
                  placeholder="YYYY-MM-DDTHH:MM"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
            </View>

            {/* Clock Out */}
            <View style={editStyles.fieldGroup}>
              <Text style={editStyles.label}>Clock Out</Text>
              {Platform.OS === "web" ? (
                <input
                  type="datetime-local"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  style={webInputStyle}
                />
              ) : (
                <TextInput
                  style={editStyles.input}
                  value={clockOut}
                  onChangeText={setClockOut}
                  placeholder="Leave blank if still active"
                  placeholderTextColor={colors.text.tertiary}
                />
              )}
              {!entry.clock_out && (
                <View style={editStyles.activeNote}>
                  <Ionicons
                    name="radio-button-on"
                    size={12}
                    color={activeColor}
                  />
                  <Text style={editStyles.activeNoteText}>
                    Currently active — setting a clock out will end this shift
                  </Text>
                </View>
              )}
            </View>

            {/* Break Minutes */}
            <View style={editStyles.fieldGroup}>
              <Text style={editStyles.label}>Break (minutes)</Text>
              <TextInput
                style={[editStyles.input, editStyles.inputSmall]}
                value={breakMin}
                onChangeText={(v) => setBreakMin(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>

            {/* Notes */}
            <View style={editStyles.fieldGroup}>
              <Text style={editStyles.label}>Notes</Text>
              <TextInput
                style={[editStyles.input, editStyles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Computed Hours Summary */}
            {computedHours && (
              <View style={editStyles.summaryRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.primary.orange}
                />
                <Text style={editStyles.summaryText}>
                  {computedHours}h worked after breaks
                </Text>
              </View>
            )}
            {clockIn && clockOut && !computedHours && (
              <View style={[editStyles.summaryRow, editStyles.summaryRowError]}>
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color={colors.semantic.error}
                />
                <Text
                  style={[
                    editStyles.summaryText,
                    { color: colors.semantic.error },
                  ]}
                >
                  Clock out must be after clock in
                </Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={editStyles.errorRow}>
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color={colors.semantic.error}
                />
                <Text style={editStyles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={editStyles.footer}>
            <Pressable
              style={editStyles.cancelBtn}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={editStyles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                editStyles.saveBtn,
                (saving || (clockIn && clockOut && !computedHours)) &&
                  editStyles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || (clockIn && clockOut && !computedHours)}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={editStyles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const editStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modal: {
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    overflow: "hidden",
    ...shadows.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: 12, color: colors.text.tertiary, marginTop: 3 },
  closeBtn: { padding: 4, marginLeft: 12 },
  body: { padding: 20, maxHeight: 440 },
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.neutral.white,
    outlineStyle: "none",
  },
  inputSmall: { maxWidth: 140 },
  inputMultiline: { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
  activeNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  activeNoteText: { fontSize: 11, color: activeColor, fontStyle: "italic" },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary.orangeSubtle,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  summaryRowError: { backgroundColor: "#FEF2F2" },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary.orange,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: { fontSize: 13, color: colors.semantic.error, flex: 1 },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});

// Action Modal Component
const ActionModal = ({
  visible,
  onClose,
  selectedCount,
  onApprove,
  onReject,
  onRequestChanges,
  processing,
}) => {
  const [step, setStep] = useState("initial");
  const [note, setNote] = useState("");
  const [successAction, setSuccessAction] = useState("");

  const resetAndClose = () => {
    setStep("initial");
    setNote("");
    onClose();
  };

  const handleApprove = async () => {
    await onApprove();
    setSuccessAction("approved");
    setStep("success");
  };

  const handleReject = async () => {
    await onReject(note);
    setSuccessAction("rejected");
    setStep("success");
  };

  const handleRequestChanges = async () => {
    await onRequestChanges(note);
    setSuccessAction("requested changes for");
    setStep("success");
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <Pressable
          style={modalStyles.backdrop}
          onPress={!processing ? resetAndClose : undefined}
        />
        <View style={modalStyles.modal}>
          {step === "initial" && (
            <>
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>Review Timecards</Text>
                <Text style={modalStyles.subtitle}>
                  {selectedCount} employee{selectedCount !== 1 ? "s" : ""}{" "}
                  selected
                </Text>
              </View>
              <View style={modalStyles.body}>
                <Pressable
                  style={modalStyles.actionBtn}
                  onPress={handleApprove}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color={activeColor} />
                  ) : (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={activeColor}
                    />
                  )}
                  <View style={modalStyles.actionText}>
                    <Text style={modalStyles.actionTitle}>Approve</Text>
                    <Text style={modalStyles.actionDesc}>
                      Mark timecards as approved
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={modalStyles.actionBtn}
                  onPress={() => setStep("reject")}
                  disabled={processing}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.semantic.error}
                  />
                  <View style={modalStyles.actionText}>
                    <Text style={modalStyles.actionTitle}>Reject</Text>
                    <Text style={modalStyles.actionDesc}>
                      Reject with a note
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={modalStyles.actionBtn}
                  onPress={() => setStep("changes")}
                  disabled={processing}
                >
                  <Ionicons
                    name="alert-circle"
                    size={24}
                    color={colors.semantic.warning}
                  />
                  <View style={modalStyles.actionText}>
                    <Text style={modalStyles.actionTitle}>Request Changes</Text>
                    <Text style={modalStyles.actionDesc}>
                      Ask for corrections
                    </Text>
                  </View>
                </Pressable>
              </View>
              <Pressable
                style={modalStyles.cancelBtnFooter}
                onPress={resetAndClose}
                disabled={processing}
              >
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </Pressable>
            </>
          )}
          {(step === "reject" || step === "changes") && (
            <>
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>
                  {step === "reject" ? "Reject Timecards" : "Request Changes"}
                </Text>
                <Text style={modalStyles.subtitle}>
                  {selectedCount} employee{selectedCount !== 1 ? "s" : ""}{" "}
                  selected
                </Text>
              </View>
              <View style={modalStyles.body}>
                <Text style={modalStyles.noteLabel}>Add a note (optional)</Text>
                <TextInput
                  style={modalStyles.noteInput}
                  placeholder="Enter reason or details..."
                  placeholderTextColor={colors.text.tertiary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
                <View style={modalStyles.noteActions}>
                  <Pressable
                    style={modalStyles.backBtn}
                    onPress={() => {
                      setStep("initial");
                      setNote("");
                    }}
                    disabled={processing}
                  >
                    <Text style={modalStyles.backBtnText}>Back</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      modalStyles.submitBtn,
                      step === "reject" && modalStyles.submitBtnReject,
                    ]}
                    onPress={
                      step === "reject" ? handleReject : handleRequestChanges
                    }
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={modalStyles.submitBtnText}>
                        {step === "reject" ? "Reject" : "Request Changes"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          )}
          {step === "success" && (
            <View style={modalStyles.successBody}>
              <View style={modalStyles.successIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={activeColor}
                />
              </View>
              <Text style={modalStyles.successTitle}>Success!</Text>
              <Text style={modalStyles.successDesc}>
                You {successAction} {selectedCount} timecard
                {selectedCount !== 1 ? "s" : ""}.
              </Text>
              <Pressable style={modalStyles.doneBtn} onPress={resetAndClose}>
                <Text style={modalStyles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    ...shadows.xl,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: { fontSize: 18, fontWeight: "600", color: colors.text.primary },
  subtitle: { fontSize: 13, color: colors.text.tertiary, marginTop: 4 },
  body: { padding: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: "600", color: colors.text.primary },
  actionDesc: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  cancelBtnFooter: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: colors.text.secondary },
  successBody: { padding: 32, alignItems: "center" },
  successIcon: { marginBottom: 16 },
  successTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
  },
  doneBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.primary.orange,
    borderRadius: 8,
  },
  doneBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  noteLabel: { fontSize: 14, color: colors.text.secondary, marginBottom: 10 },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  noteActions: { flexDirection: "row", gap: 10 },
  backBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { fontSize: 14, fontWeight: "600", color: colors.text.primary },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.semantic.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnReject: { backgroundColor: colors.semantic.error },
  submitBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});

// Employee Row Component
const EmployeeRow = ({
  employee,
  weekDays,
  view,
  isLargeScreen,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onEditEntry,
  getHoursForDay,
  formatHours,
  getInitials,
}) => (
  <View style={styles.employeeRowContainer}>
    <Pressable
      style={({ hovered }) => [
        styles.employeeRow,
        isSelected && styles.employeeRowSelected,
        hovered && !isSelected && styles.employeeRowHovered,
      ]}
      onPress={onToggleExpand}
    >
      <View style={styles.checkboxCell}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
        >
          <Ionicons
            name={isSelected ? "checkbox" : "square-outline"}
            size={20}
            color={isSelected ? colors.primary.orange : colors.text.tertiary}
          />
        </Pressable>
      </View>
      <View style={styles.employeeCell}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(employee.name)}</Text>
          {employee.isActive && <PulsingDot color={activeColor} size={10} />}
        </View>
        <View style={styles.employeeDetails}>
          <View style={styles.employeeNameRow}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            {employee.status && employee.status !== "pending" && (
              <StatusBadge status={employee.status} />
            )}
          </View>
          <Text style={styles.employeeEmail} numberOfLines={1}>
            {employee.email || "No email"}
          </Text>
        </View>
      </View>
      {view === "week" && isLargeScreen && (
        <View style={styles.daysContainer}>
          {weekDays.map((day) => {
            const hours = getHoursForDay(employee, day.date);
            return (
              <View
                key={day.dayNum}
                style={[styles.dayCell, day.isToday && styles.todayCellBg]}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    hours > 0 && styles.dayCellTextFilled,
                    hours > 8 && styles.dayCellTextOvertime,
                  ]}
                >
                  {formatHours(hours)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      <View style={styles.totalCell}>
        <Text
          style={[
            styles.totalHours,
            employee.totalHours > 40 && styles.totalHoursOvertime,
          ]}
        >
          {employee.totalHours.toFixed(1)}h
        </Text>
      </View>
      <View style={styles.chevronCell}>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.text.tertiary}
        />
      </View>
    </Pressable>

    {isExpanded && (
      <View style={styles.expandedDetails}>
        {employee.entries.length === 0 ? (
          <Text style={styles.noEntriesText}>No time entries</Text>
        ) : (
          employee.entries.map((entry, idx) => {
            const clockIn = new Date(entry.clock_in);
            const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
            const hours = clockOut
              ? (
                  (clockOut - clockIn) / (1000 * 60 * 60) -
                  (entry.break_minutes || 0) / 60
                ).toFixed(1)
              : "Active";

            return (
              <Pressable
                key={entry.id || idx}
                style={({ hovered }) => [
                  styles.entryDetail,
                  hovered && styles.entryDetailHovered,
                ]}
                onPress={() => onEditEntry(entry)}
              >
                <View style={styles.entryLeft}>
                  <Text style={styles.entryDate}>
                    {clockIn.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <Text style={styles.entryProject}>
                    {entry.project?.name || "No project"}
                  </Text>
                </View>
                <View style={styles.entryRight}>
                  <Text style={styles.entryTime}>
                    {clockIn.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {clockOut
                      ? clockOut.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Now"}
                  </Text>
                  <Text
                    style={[
                      styles.entryHours,
                      !clockOut && styles.entryHoursActive,
                    ]}
                  >
                    {hours}
                    {clockOut ? "h" : ""}
                  </Text>
                </View>
                {/* Edit pencil icon */}
                <View style={styles.entryEditIcon}>
                  <Ionicons
                    name="pencil-outline"
                    size={13}
                    color={colors.text.tertiary}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    )}
  </View>
);

// Main Component
export default function Timecards() {
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const isLargeScreen = width >= 1024;

  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [employeeStatuses, setEmployeeStatuses] = useState({});

  // Edit entry state
  const [editEntry, setEditEntry] = useState(null);

  const datePickerRef = useRef(null);
  const token = session?.access_token;

  useEffect(() => {
    async function fetchUserProfile() {
      if (!token) return;
      const response = await getUserProfile(token);
      if (response.success && response.data?.user?.default_company_id) {
        setCompanyId(response.data.user.default_company_id);
      }
    }
    fetchUserProfile();
  }, [token]);

  const getWeekRange = useCallback((date) => {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }, []);

  const weekDays = useMemo(() => {
    const { startDate } = getWeekRange(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      return {
        date: day,
        dayName: day.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: day.getDate(),
        isToday: day.toDateString() === new Date().toDateString(),
      };
    });
  }, [selectedDate, getWeekRange]);

  const fetchTimeEntries = useCallback(async () => {
    if (!token || !companyId) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const { startDate, endDate } =
        view === "week"
          ? getWeekRange(selectedDate)
          : { startDate: selectedDate, endDate: selectedDate };
      const weekStartStr = startDate.toISOString().split("T")[0];

      const [entriesResponse, approvalsResponse] = await Promise.all([
        getTimeEntries(token, companyId, {
          start_date: weekStartStr,
          end_date: endDate.toISOString().split("T")[0],
          all_users: "true",
        }),
        getTimecardApprovals(token, companyId, weekStartStr),
      ]);

      if (
        entriesResponse.success &&
        entriesResponse.data?.time_entries !== undefined
      ) {
        setTimeEntries(entriesResponse.data.time_entries);
      } else {
        setError(entriesResponse.message || "Failed to load time entries");
      }

      if (approvalsResponse.success && Array.isArray(approvalsResponse.data)) {
        const statusMap = {};
        approvalsResponse.data.forEach((approval) => {
          const statusKey = `${approval.user_id}_${approval.week_start}`;
          statusMap[statusKey] = approval.status;
        });
        setEmployeeStatuses((prev) => ({ ...prev, ...statusMap }));
      }
    } catch (err) {
      setError("Failed to load time entries");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, companyId, selectedDate, view, getWeekRange]);

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      fetchTimeEntries();
    }
  }, [companyId, selectedDate, view, fetchTimeEntries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTimeEntries();
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (view === "week") newDate.setDate(newDate.getDate() + direction * 7);
    else newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  const formatDateHeader = () => {
    if (view === "day")
      return selectedDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    const { startDate, endDate } = getWeekRange(selectedDate);
    return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const currentWeekKey = useMemo(() => {
    const { startDate } = getWeekRange(selectedDate);
    return startDate.toISOString().split("T")[0];
  }, [selectedDate, getWeekRange]);

  const employeesData = useMemo(() => {
    const grouped = {};
    timeEntries.forEach((entry) => {
      const userId = entry.user_id;
      if (!grouped[userId])
        grouped[userId] = {
          id: userId,
          name: entry.user?.full_name || "Unknown",
          email: entry.user?.email,
          entries: [],
          isActive: false,
        };
      grouped[userId].entries.push(entry);
      if (!entry.clock_out) grouped[userId].isActive = true;
    });
    return Object.values(grouped).map((emp) => {
      const totalHours = emp.entries.reduce((sum, e) => {
        if (!e.clock_out) return sum;
        const clockIn = new Date(e.clock_in);
        const clockOut = new Date(e.clock_out);
        return (
          sum +
          ((clockOut - clockIn) / (1000 * 60 * 60) -
            (e.break_minutes || 0) / 60)
        );
      }, 0);
      const statusKey = `${emp.id}_${currentWeekKey}`;
      return {
        ...emp,
        totalHours,
        status: employeeStatuses[statusKey] || "pending",
      };
    });
  }, [timeEntries, employeeStatuses, currentWeekKey]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employeesData;
    const q = searchQuery.toLowerCase();
    return employeesData.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q),
    );
  }, [employeesData, searchQuery]);

  const getHoursForDay = (employee, date) => {
    const dayStr = date.toDateString();
    return employee.entries
      .filter((e) => new Date(e.clock_in).toDateString() === dayStr)
      .reduce((sum, e) => {
        if (!e.clock_out) return sum;
        const clockIn = new Date(e.clock_in);
        const clockOut = new Date(e.clock_out);
        return (
          sum +
          ((clockOut - clockIn) / (1000 * 60 * 60) -
            (e.break_minutes || 0) / 60)
        );
      }, 0);
  };

  const formatHours = (hours) => (hours === 0 ? "–" : hours.toFixed(1));
  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const toggleEmployeeSelection = (id) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedEmployees(newSet);
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.size === filteredEmployees.length)
      setSelectedEmployees(new Set());
    else setSelectedEmployees(new Set(filteredEmployees.map((e) => e.id)));
  };

  const updateStatuses = async (status, notes = null) => {
    const { startDate, endDate } = getWeekRange(selectedDate);
    const weekStart = startDate.toISOString().split("T")[0];
    const weekEnd = endDate.toISOString().split("T")[0];

    const response = await bulkUpdateTimecardApprovals(token, {
      company_id: companyId,
      week_start: weekStart,
      week_end: weekEnd,
      user_ids: Array.from(selectedEmployees),
      status,
      notes,
    });

    if (response.success) {
      const newStatuses = { ...employeeStatuses };
      selectedEmployees.forEach((id) => {
        const statusKey = `${id}_${currentWeekKey}`;
        newStatuses[statusKey] = status;
      });
      setEmployeeStatuses(newStatuses);
      return true;
    } else {
      alert(
        "Failed to save approval: " + (response.message || "Unknown error"),
      );
      return false;
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    await updateStatuses("approved");
    setProcessing(false);
  };

  const handleReject = async (note) => {
    setProcessing(true);
    const success = await updateStatuses("rejected", note);
    setProcessing(false);
    if (success) {
      setShowActionModal(false);
      setSelectedEmployees(new Set());
    }
  };

  const handleRequestChanges = async (note) => {
    setProcessing(true);
    const success = await updateStatuses("pending_changes", note);
    setProcessing(false);
    if (success) {
      setShowActionModal(false);
      setSelectedEmployees(new Set());
    }
  };

  const handleModalClose = () => {
    if (!processing) {
      setShowActionModal(false);
      setSelectedEmployees(new Set());
    }
  };

  // ─── Handle save from edit modal ───────────────────────────────────────────
  const handleSaveEntry = async (entryId, updates) => {
    const response = await updateTimeEntry(token, entryId, updates);
    if (!response.success) {
      throw new Error("Pleae check to make sure your edit does not overlap with existing time entries and try again.");
    }
    // Update local state optimistically so the UI refreshes immediately
    setTimeEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, ...updates } : e)),
    );
    // Then re-fetch to get fully populated relational data
    fetchTimeEntries();
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker && Platform.OS === "web") {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showDatePicker]);

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading timecards...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <View
            style={[
              styles.searchContainer,
              searchFocused && styles.searchContainerFocused,
            ]}
          >
            <Ionicons
              name="search"
              size={16}
              color={
                searchFocused ? colors.primary.orange : colors.text.tertiary
              }
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={colors.text.tertiary}
                />
              </Pressable>
            )}
          </View>
          <View style={styles.viewToggle}>
            <Pressable
              style={[styles.viewBtn, view === "day" && styles.viewBtnActive]}
              onPress={() => setView("day")}
            >
              <Text
                style={[
                  styles.viewText,
                  view === "day" && styles.viewTextActive,
                ]}
              >
                Day
              </Text>
            </Pressable>
            <Pressable
              style={[styles.viewBtn, view === "week" && styles.viewBtnActive]}
              onPress={() => setView("week")}
            >
              <Text
                style={[
                  styles.viewText,
                  view === "week" && styles.viewTextActive,
                ]}
              >
                Week
              </Text>
            </Pressable>
          </View>
          <View style={styles.datePickerContainer} ref={datePickerRef}>
            <View style={styles.dateNav}>
              <Pressable
                style={styles.navArrow}
                onPress={() => navigateDate(-1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={colors.text.secondary}
                />
              </Pressable>
              <Pressable
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={colors.primary.orange}
                />
                <Text style={styles.dateText}>{formatDateHeader()}</Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color={colors.text.tertiary}
                />
              </Pressable>
              <Pressable
                style={styles.navArrow}
                onPress={() => navigateDate(1)}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.text.secondary}
                />
              </Pressable>
            </View>
            {showDatePicker && (
              <View style={styles.datePickerDropdown}>
                <DatePickerDropdown
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onClose={() => setShowDatePicker(false)}
                  view={view}
                />
              </View>
            )}
          </View>
          <Pressable
            style={styles.todayBtn}
            onPress={() => setSelectedDate(new Date())}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </Pressable>
        </View>
        <View style={styles.toolbarRight}>
          <Pressable
            style={({ hovered }) => [
              styles.exportBtn,
              hovered && styles.exportBtnHovered,
            ]}
          >
            <Ionicons
              name="download-outline"
              size={16}
              color={colors.text.primary}
            />
            <Text style={styles.exportBtnText}>Export</Text>
          </Pressable>
          <Pressable
            style={[
              styles.approveBtn,
              selectedEmployees.size === 0 && styles.approveBtnDisabled,
            ]}
            disabled={selectedEmployees.size === 0}
            onPress={() => setShowActionModal(true)}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={selectedEmployees.size > 0 ? "#fff" : colors.text.tertiary}
            />
            <Text
              style={[
                styles.approveBtnText,
                selectedEmployees.size === 0 && styles.approveBtnTextDisabled,
              ]}
            >
              Review
              {selectedEmployees.size > 0 ? ` (${selectedEmployees.size})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={20}
            color={colors.semantic.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchTimeEntries}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!error && filteredEmployees.length > 0 && (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Pressable style={styles.selectAllBtn} onPress={selectAllEmployees}>
              <Ionicons
                name={
                  selectedEmployees.size === filteredEmployees.length
                    ? "checkbox"
                    : "square-outline"
                }
                size={18}
                color={
                  selectedEmployees.size === filteredEmployees.length
                    ? colors.primary.orange
                    : colors.text.tertiary
                }
              />
              <Text style={styles.selectAllText}>Select All</Text>
            </Pressable>
            <Text style={styles.employeeCount}>
              {filteredEmployees.length} employee
              {filteredEmployees.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <ScrollView
            style={styles.tableBody}
            contentContainerStyle={styles.tableBodyContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary.orange}
              />
            }
            stickyHeaderIndices={view === "week" && isLargeScreen ? [0] : []}
          >
            {view === "week" && isLargeScreen && (
              <View style={styles.columnHeaderRow}>
                <View style={styles.checkboxHeaderCell} />
                <View style={styles.employeeHeaderCell}>
                  <Text style={styles.columnLabel}>Employee</Text>
                </View>
                <View style={styles.daysHeaderContainer}>
                  {weekDays.map((day) => (
                    <View
                      key={day.dayNum}
                      style={[
                        styles.dayHeaderCell,
                        day.isToday && styles.todayHeaderCell,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          day.isToday && styles.todayLabel,
                        ]}
                      >
                        {day.dayName}
                      </Text>
                      <Text
                        style={[
                          styles.dayNum,
                          day.isToday && styles.todayLabel,
                        ]}
                      >
                        {day.dayNum}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.totalHeaderCell}>
                  <Text style={styles.columnLabel}>Total</Text>
                </View>
                <View style={styles.chevronHeaderCell} />
              </View>
            )}
            {filteredEmployees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                weekDays={weekDays}
                view={view}
                isLargeScreen={isLargeScreen}
                isSelected={selectedEmployees.has(emp.id)}
                isExpanded={expandedEmployee === emp.id}
                onToggleSelect={() => toggleEmployeeSelection(emp.id)}
                onToggleExpand={() =>
                  setExpandedEmployee(
                    expandedEmployee === emp.id ? null : emp.id,
                  )
                }
                onEditEntry={setEditEntry}
                getHoursForDay={getHoursForDay}
                formatHours={formatHours}
                getInitials={getInitials}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {!error && filteredEmployees.length === 0 && (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="time-outline"
                size={32}
                color={colors.text.tertiary}
              />
            </View>
            <Text style={styles.emptyTitle}>No timecards found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "No employees match your search"
                : `No time entries for this ${view}`}
            </Text>
          </View>
        </View>
      )}

      <ActionModal
        visible={showActionModal}
        onClose={handleModalClose}
        selectedCount={selectedEmployees.size}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestChanges={handleRequestChanges}
        processing={processing}
      />

      {/* Edit Entry Modal */}
      <EditEntryModal
        visible={!!editEntry}
        onClose={() => setEditEntry(null)}
        entry={editEntry}
        onSave={handleSaveEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBFBFB" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: { fontSize: 13, color: colors.text.tertiary },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
    flexWrap: "wrap",
    gap: 12,
    backgroundColor: "#FBFBFB",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    zIndex: 100,
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  toolbarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.neutral.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 200,
  },
  searchContainerFocused: { borderColor: colors.primary.orange },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    outlineStyle: "none",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.neutral.offWhite,
    borderRadius: 8,
    padding: 4,
  },
  viewBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  viewBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  viewText: { fontSize: 13, fontWeight: "500", color: colors.text.tertiary },
  viewTextActive: { color: colors.text.primary },
  datePickerContainer: { position: "relative", zIndex: 1000 },
  dateNav: { flexDirection: "row", alignItems: "center", gap: 2 },
  navArrow: { padding: 6, borderRadius: 4 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.neutral.offWhite,
  },
  dateText: { fontSize: 13, fontWeight: "600", color: colors.text.primary },
  datePickerDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 4,
    zIndex: 1001,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary.orange,
  },
  todayBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.neutral.white,
  },
  exportBtnHovered: { borderColor: colors.text.tertiary },
  exportBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text.primary,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary.orange,
  },
  approveBtnDisabled: { backgroundColor: colors.neutral.offWhite },
  approveBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  approveBtnTextDisabled: { color: colors.text.tertiary },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.semantic.errorLight,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  errorText: { flex: 1, color: colors.semantic.error, fontSize: 13 },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.semantic.error,
    borderRadius: 4,
  },
  retryBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  tableContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: colors.neutral.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.neutral.white,
  },
  selectAllBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  selectAllText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text.secondary,
  },
  employeeCount: { fontSize: 12, color: colors.text.tertiary },
  columnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.neutral.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  checkboxHeaderCell: { width: CHECKBOX_WIDTH },
  employeeHeaderCell: { flex: 1 },
  daysHeaderContainer: { width: DAYS_CONTAINER_WIDTH, flexDirection: "row" },
  dayHeaderCell: {
    width: DAY_COLUMN_WIDTH,
    alignItems: "center",
    paddingVertical: 2,
  },
  todayHeaderCell: {
    backgroundColor: colors.primary.orangeSubtle,
    borderRadius: 4,
  },
  totalHeaderCell: { width: TOTAL_COLUMN_WIDTH, alignItems: "flex-end" },
  chevronHeaderCell: { width: CHEVRON_WIDTH },
  columnLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayLabel: { fontSize: 10, fontWeight: "500", color: colors.text.tertiary },
  dayNum: { fontSize: 12, fontWeight: "600", color: colors.text.secondary },
  todayLabel: { color: colors.primary.orange },
  tableBody: { flex: 1 },
  tableBodyContent: { paddingBottom: 16 },
  employeeRowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 12,
  },
  employeeRowSelected: { backgroundColor: colors.primary.orangeSubtle },
  employeeRowHovered: { backgroundColor: colors.neutral.offWhite },
  checkboxCell: { width: CHECKBOX_WIDTH, alignItems: "center" },
  employeeCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  daysContainer: { width: DAYS_CONTAINER_WIDTH, flexDirection: "row" },
  dayCell: {
    width: DAY_COLUMN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  todayCellBg: {
    backgroundColor: colors.primary.orangeSubtle,
    borderRadius: 4,
  },
  totalCell: { width: TOTAL_COLUMN_WIDTH, alignItems: "flex-end" },
  chevronCell: { width: CHEVRON_WIDTH, alignItems: "center" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.orangeSubtle,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: { fontSize: 11, fontWeight: "600", color: colors.primary.orange },
  employeeDetails: { flex: 1 },
  employeeNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  employeeName: { fontSize: 13, fontWeight: "600", color: colors.text.primary },
  employeeEmail: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },
  dayCellText: { fontSize: 12, color: colors.text.tertiary },
  dayCellTextFilled: { color: colors.text.primary, fontWeight: "500" },
  dayCellTextOvertime: { color: colors.semantic.warning, fontWeight: "600" },
  totalHours: { fontSize: 13, fontWeight: "700", color: colors.text.primary },
  totalHoursOvertime: { color: colors.semantic.error },
  expandedDetails: {
    padding: 12,
    paddingLeft: CHECKBOX_WIDTH + 20,
    backgroundColor: colors.neutral.offWhite,
    gap: 6,
  },
  noEntriesText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: "italic",
  },
  entryDetail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral.white,
    padding: 10,
    borderRadius: 6,
  },
  entryDetailHovered: { backgroundColor: "#FFF8F5" },
  entryLeft: { flex: 1 },
  entryDate: { fontSize: 12, fontWeight: "500", color: colors.text.primary },
  entryProject: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  entryRight: { alignItems: "flex-end", marginRight: 8 },
  entryTime: { fontSize: 11, color: colors.text.secondary },
  entryHours: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.primary,
    marginTop: 2,
  },
  entryHoursActive: { color: activeColor },
  entryEditIcon: { paddingLeft: 4, opacity: 0.5 },
  emptyStateContainer: { flex: 1, padding: 16 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.neutral.offWhite,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 4,
  },
  emptySubtitle: { fontSize: 13, color: colors.text.tertiary },
});