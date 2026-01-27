import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "../../../constants/theme";
import { useSession } from "../../../utils/ctx";
import { useProject } from "../../components/projectComponents/projectContext";
import {
  getAllProjectCostCodes,
  getCostCodes,
  assignCostCodeToProject,
  removeCostCodeFromProject,
  updateProjectCostCodeBudget,
} from "../../../utils/api";

/**
 * Project Cost Codes Overview
 */
export default function CostCodesOverview() {
  const { session } = useSession();
  const token = session?.access_token;

  const { selectedProject, selectedProjectId } = useProject();
  const projectId = selectedProject?.id || selectedProjectId;

  const [loading, setLoading] = useState(true);
  const [projectCostCodes, setProjectCostCodes] = useState([]);
  const [allCostCodes, setAllCostCodes] = useState([]);
  const [error, setError] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const [selectedToAdd, setSelectedToAdd] = useState(new Set());
  const [focusedField, setFocusedField] = useState(null);

  /* ---------------- Load ---------------- */
  useEffect(() => {
    if (!token || !projectId) return;

    async function load() {
      setLoading(true);
      setError(null);

      const [assigned, all] = await Promise.all([
        getAllProjectCostCodes(token, projectId),
        getCostCodes(token),
      ]);

      if (!assigned.success) {
        setError(assigned.message || "Failed to load project cost codes");
        setLoading(false);
        return;
      }

      setProjectCostCodes(assigned.data || []);
      setAllCostCodes(all.success ? all.data : []);
      setLoading(false);
    }

    load();
  }, [token, projectId]);

  const refreshAssigned = async () => {
    const res = await getAllProjectCostCodes(token, projectId);
    if (res.success) setProjectCostCodes(res.data || []);
  };

  /* ---------------- Derived ---------------- */
  const availableCostCodes = useMemo(() => {
    const used = new Set(projectCostCodes.map(pc => pc.cost_code.id));
    return allCostCodes.filter(cc => !used.has(cc.id));
  }, [projectCostCodes, allCostCodes]);

  const activeCodes = projectCostCodes.filter(pc => pc.is_active);
  const inactiveCodes = projectCostCodes.filter(pc => !pc.is_active);

  /* ---------------- Actions ---------------- */
  const toggleSelect = (id) => {
    setSelectedToAdd(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAdd = async () => {
    if (selectedToAdd.size === 0) return;

    setSaving(true);
    setError(null);

    for (const costCodeId of selectedToAdd) {
      const res = await assignCostCodeToProject(token, projectId, {
        cost_code_id: costCodeId,
      });
      if (!res.success) {
        setError(res.message || "Failed to add one or more cost codes");
        break;
      }
    }

    await refreshAssigned();
    setSelectedToAdd(new Set());
    setAddOpen(false);
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSaving(true);

    const res = await updateProjectCostCodeBudget(
      token,
      projectId,
      editItem.cost_code_id,
      {
        budgeted_hours: editItem.budgeted_hours,
        budgeted_labor_cost: editItem.budgeted_labor_cost,
        budgeted_quantity: editItem.budgeted_quantity,
        is_active: editItem.is_active,
      }
    );

    if (res.success) {
      await refreshAssigned();
      setEditItem(null);
    } else {
      setError(res.message || "Failed to save changes");
    }

    setSaving(false);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);

    const res = await removeCostCodeFromProject(
      token,
      projectId,
      confirmDelete.cost_code_id
    );

    if (res.success) {
      await refreshAssigned();
      setConfirmDelete(null);
      setEditItem(null);
    } else {
      setError(res.message || "Failed to remove cost code");
    }

    setSaving(false);
  };

  /* ---------------- Guards ---------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading cost codes…</Text>
      </View>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Project Cost Codes</Text>
          <Text style={styles.subtitle}>
            Cost codes enabled for time tracking on this project
          </Text>
        </View>

        <Pressable style={styles.addButton} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add Cost Code</Text>
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {activeCodes.length > 0 && (
          <>
            <SectionHeader icon="checkmark-circle" text="Active Cost Codes" color={colors.semantic.success} />
            {activeCodes.map(renderCard)}
          </>
        )}

        {inactiveCodes.length > 0 && (
          <>
            <SectionHeader icon="pause-circle" text="Inactive Cost Codes" color={colors.text.tertiary} />
            {inactiveCodes.map(renderCard)}
          </>
        )}
      </ScrollView>

      {/* ---------- EDIT MODAL ---------- */}
      <Modal visible={!!editItem} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editItem?.cost_code.code} — {editItem?.cost_code.name}
            </Text>

            <View style={styles.modalSection}>
              <LabeledInput
                label="Budgeted Hours"
                value={editItem?.budgeted_hours}
                focused={focusedField === "hours"}
                onFocus={() => setFocusedField("hours")}
                onBlur={() => setFocusedField(null)}
                onChange={v => setEditItem(m => ({ ...m, budgeted_hours: v }))}
              />

              <LabeledInput
                label="Budgeted Labor Cost"
                value={editItem?.budgeted_labor_cost}
                focused={focusedField === "labor"}
                onFocus={() => setFocusedField("labor")}
                onBlur={() => setFocusedField(null)}
                onChange={v => setEditItem(m => ({ ...m, budgeted_labor_cost: v }))}
              />

              <LabeledInput
                label="Budgeted Quantity"
                value={editItem?.budgeted_quantity}
                focused={focusedField === "qty"}
                onFocus={() => setFocusedField("qty")}
                onBlur={() => setFocusedField(null)}
                onChange={v => setEditItem(m => ({ ...m, budgeted_quantity: v }))}
              />
            </View>

            <Pressable
              style={styles.toggle}
              onPress={() => setEditItem(m => ({ ...m, is_active: !m.is_active }))}
            >
              <Ionicons
                name={editItem?.is_active ? "checkmark-circle" : "pause-circle"}
                size={18}
                color={editItem?.is_active ? colors.semantic.success : colors.text.tertiary}
              />
              <Text style={styles.toggleText}>
                {editItem?.is_active ? "Active" : "Inactive"}
              </Text>
            </Pressable>

            <View style={styles.dangerZone}>
              <Pressable onPress={() => setConfirmDelete(editItem)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.semantic.error} />
                <Text style={styles.deleteText}>Remove from Project</Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditItem(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveEdit} disabled={saving}>
                {saving ? <ActivityIndicator /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- DELETE CONFIRM ---------- */}
      <Modal visible={!!confirmDelete} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove Cost Code?</Text>
            <Text style={styles.subtitle}>
              This will remove the cost code from the project.
            </Text>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setConfirmDelete(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirmDelete} disabled={saving}>
                {saving ? <ActivityIndicator /> : <Text style={styles.deleteText}>Remove</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- ADD MODAL ---------- */}
      <Modal visible={addOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Cost Codes</Text>
            <Text style={styles.modalSubtitle}>
              Select one or more cost codes to add
            </Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {availableCostCodes.map(cc => {
                const selected = selectedToAdd.has(cc.id);
                return (
                  <Pressable
                    key={cc.id}
                    style={[
                      styles.selectRow,
                      selected && styles.selectRowSelected,
                    ]}
                    onPress={() => toggleSelect(cc.id)}
                  >
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={18}
                      color={selected ? colors.primary.orange : colors.text.tertiary}
                    />
                    <View>
                      <Text style={styles.code}>{cc.code}</Text>
                      <Text>{cc.name}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable onPress={() => {
                setSelectedToAdd(new Set());
                setAddOpen(false);
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.saveButton,
                  selectedToAdd.size === 0 && styles.saveButtonDisabled,
                ]}
                disabled={selectedToAdd.size === 0 || saving}
                onPress={handleBulkAdd}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Add {selectedToAdd.size || ""} Cost Code{selectedToAdd.size === 1 ? "" : "s"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  function renderCard(pc) {
    return (
      <Pressable
        key={pc.id}
        style={({ hovered }) => [
          styles.cardRow,
          hovered && styles.cardRowHover,
        ]}
        onPress={() => setEditItem({ ...pc })}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="pricetag" size={20} color={colors.primary.orange} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.code}>{pc.cost_code.code}</Text>
          <Text style={styles.name}>{pc.cost_code.name}</Text>

          {/* ✅ RESTORED METRICS */}
          <View style={styles.metricsRow}>
            <Metric icon="time-outline" label="Hours" value={pc.budgeted_hours} />
            <Metric icon="cash-outline" label="Labor" value={pc.budgeted_labor_cost} />
            <Metric icon="cube-outline" label="Qty" value={pc.budgeted_quantity} />
          </View>
        </View>

        <View style={[
          styles.statusPill,
          pc.is_active ? styles.statusActive : styles.statusInactive
        ]}>
          <Ionicons
            name={pc.is_active ? "checkmark-circle" : "pause-circle"}
            size={14}
            color={pc.is_active ? colors.semantic.success : colors.text.tertiary}
          />
          <Text style={styles.statusText}>
            {pc.is_active ? "Active" : "Inactive"}
          </Text>
        </View>
      </Pressable>
    );
  }
}

/* ---------- helpers ---------- */
function LabeledInput({ label, value, focused, onFocus, onBlur, onChange }) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
        ]}
        keyboardType="numeric"
        value={value != null ? String(value) : ""}
        onFocus={onFocus}
        onBlur={onBlur}
        onChangeText={v => onChange(Number(v) || null)}
      />
    </View>
  );
}

function SectionHeader({ icon, text, color }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.sectionLabel, { color }]}>{text}</Text>
    </View>
  );
}

function Metric({ icon, label, value }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={14} color={colors.text.tertiary} />
      <Text style={styles.metricText}>
        {label}: {value ?? "—"}
      </Text>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: colors.text.secondary },

  header: {
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold },
  subtitle: { fontSize: typography.fontSize.sm, color: colors.text.secondary },

  addButton: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.orange,
    ...shadows.md,
  },
  addButtonText: { color: "#fff", fontWeight: typography.fontWeight.semibold },

  list: { padding: spacing.lg, gap: spacing.sm },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  cardRowHover: { borderColor: colors.primary.orange },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.orangeSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  code: { color: colors.primary.orange, fontWeight: typography.fontWeight.semibold },
  name: { fontWeight: typography.fontWeight.medium },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusActive: { backgroundColor: colors.semantic.successLight },
  statusInactive: { backgroundColor: colors.neutral.offWhite },
  statusText: { fontSize: typography.fontSize.xs },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.xl,
  },
  modalTitle: { fontWeight: typography.fontWeight.semibold },
  modalSubtitle: { color: colors.text.secondary },

  modalSection: {
    padding: spacing.md,
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },

  inputLabel: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    outlineStyle: "none",
  },
  inputFocused: {
    borderColor: colors.primary.orange,
  },

  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.offWhite,
  },
  toggleText: { fontWeight: typography.fontWeight.medium },

  dangerZone: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.sm,
  },
  deleteBtn: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  deleteText: { color: colors.semantic.error, fontWeight: typography.fontWeight.medium },

  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  selectRowSelected: {
    backgroundColor: colors.primary.orangeSubtle,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: { color: colors.text.secondary },

  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.orange,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: typography.fontWeight.semibold,
  },

  errorBox: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.semantic.errorLight,
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  errorText: { color: colors.semantic.error },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metric: { 
    flexDirection: "row",
     gap: 4 
  },
  metricText: { 
    fontSize: typography.fontSize.xs, 
    color: colors.text.secondary 
  },
});
