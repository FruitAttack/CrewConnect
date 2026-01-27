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
  const handleAdd = async (cc) => {
    setSaving(true);
    const res = await assignCostCodeToProject(token, projectId, {
      cost_code_id: cc.id,
    });

    if (res.success) {
      await refreshAssigned();
      setAddOpen(false);
    } else {
      setError(res.message || "Failed to add cost code");
    }
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
            <Text style={styles.sectionLabel}>Active</Text>
            {activeCodes.map(renderCard)}
          </>
        )}

        {inactiveCodes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Inactive</Text>
            {inactiveCodes.map(renderCard)}
          </>
        )}
      </ScrollView>

      {/* ---------- Edit Modal ---------- */}
      <Modal visible={!!editItem} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editItem?.cost_code.code} — {editItem?.cost_code.name}
            </Text>

            <LabeledInput
              icon="time-outline"
              label="Budgeted Hours"
              value={editItem?.budgeted_hours}
              onChange={v => setEditItem(m => ({ ...m, budgeted_hours: v }))}
            />

            <LabeledInput
              icon="cash-outline"
              label="Budgeted Labor Cost"
              value={editItem?.budgeted_labor_cost}
              onChange={v => setEditItem(m => ({ ...m, budgeted_labor_cost: v }))}
            />

            <LabeledInput
              icon="cube-outline"
              label="Budgeted Quantity"
              value={editItem?.budgeted_quantity}
              onChange={v => setEditItem(m => ({ ...m, budgeted_quantity: v }))}
            />

            <Pressable
              style={styles.toggle}
              onPress={() =>
                setEditItem(m => ({ ...m, is_active: !m.is_active }))
              }
            >
              <Ionicons
                name={editItem?.is_active ? "checkmark-circle" : "close-circle"}
                size={16}
                color={editItem?.is_active ? colors.semantic.success : colors.text.tertiary}
              />
              <Text>{editItem?.is_active ? "Active" : "Inactive"}</Text>
            </Pressable>

            <Pressable
              style={styles.deleteBtn}
              onPress={() => setConfirmDelete(editItem)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.semantic.error} />
              <Text style={styles.deleteText}>Remove from Project</Text>
            </Pressable>

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

      {/* ---------- Delete Confirm ---------- */}
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

      {/* ---------- Add Modal ---------- */}
      <Modal visible={addOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Cost Code</Text>

            <ScrollView style={{ maxHeight: 320 }}>
              {availableCostCodes.map(cc => (
                <Pressable
                  key={cc.id}
                  style={styles.modalItem}
                  onPress={() => handleAdd(cc)}
                >
                  <Text style={styles.code}>{cc.code}</Text>
                  <Text>{cc.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable onPress={() => setAddOpen(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.code}>{pc.cost_code.code}</Text>
          <Text style={styles.name}>{pc.cost_code.name}</Text>

          <View style={styles.metricsRow}>
            <Metric icon="time-outline" label="Hours" value={pc.budgeted_hours} />
            <Metric icon="cash-outline" label="Labor" value={pc.budgeted_labor_cost} />
            <Metric icon="cube-outline" label="Qty" value={pc.budgeted_quantity} />
          </View>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {pc.is_active ? "Active" : "Inactive"}
          </Text>
        </View>
      </Pressable>
    );
  }
}

/* ---------- helpers ---------- */
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

function LabeledInput({ icon, label, value, onChange }) {
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={16} color={colors.text.tertiary} />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={value != null ? String(value) : ""}
          onChangeText={v => onChange(Number(v) || null)}
        />
      </View>
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

  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
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

  code: { color: colors.primary.orange, fontWeight: typography.fontWeight.semibold },
  name: { fontWeight: typography.fontWeight.medium },

  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metric: { flexDirection: "row", gap: 4 },
  metricText: { fontSize: typography.fontSize.xs, color: colors.text.secondary },

  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral.offWhite,
  },
  statusText: { fontSize: typography.fontSize.xs },

  emptyState: { alignItems: "center", paddingVertical: spacing.xxxxl },
  emptyTitle: { fontWeight: typography.fontWeight.semibold },
  emptySubtitle: { color: colors.text.secondary },

  errorBox: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.semantic.errorLight,
    borderRadius: borderRadius.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  errorText: { color: colors.semantic.error },

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

  inputLabel: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  input: { flex: 1 },

  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.offWhite,
  },

  deleteBtn: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  deleteText: { color: colors.semantic.error, fontWeight: typography.fontWeight.medium },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
  },
  cancelText: { color: colors.text.secondary },
  saveText: { color: colors.primary.orange, fontWeight: typography.fontWeight.semibold },

  modalItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
});
