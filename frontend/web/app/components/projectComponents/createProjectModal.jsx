import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "../../../constants/theme";
import { createProject, getCustomers } from "../../../utils/api";

export default function CreateProjectModal({
  visible,
  onClose,
  token,
  companyId,
  onCreated,
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [customerOpen, setCustomerOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    customer_id: null,
    geofence_m: "",
    lat: "",
    lng: "",
  });

  // Fetch customers when modal opens
  useEffect(() => {
    if (!visible || !token || !companyId) return;

    async function loadCustomers() {
      setLoadingCustomers(true);
      const res = await getCustomers(token, companyId);
      if (res.success) {
        setCustomers(res.data.customers || []);
      }
      setLoadingCustomers(false);
    }

    loadCustomers();
  }, [visible, token, companyId]);

  const canCreate = form.name.trim().length > 0 && !saving;

  const onCreate = async () => {
    if (!canCreate) return;

    setSaving(true);
    setError(null);

    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      address: form.address || null,
      customer_id: form.customer_id,
      geofence_m: form.geofence_m ? Number(form.geofence_m) : null,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
    };

    const res = await createProject(token, payload);

    if (res.success && res.data?.project) {
      onCreated(res.data.project);
      onClose();
    } else {
      setError(res.message || "Failed to create project");
    }

    setSaving(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Project</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Project Name */}
            <Field
              label="Project Name"
              icon="pricetag-outline"
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              placeholder="e.g. Downtown Office Build"
              required
            />

            {/* Address */}
            <Field
              label="Address"
              icon="location-outline"
              value={form.address}
              onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
              placeholder="Street, city, state"
              multiline
            />

            {/* Customer */}
            <View style={styles.field}>
                <Label icon="business-outline" text="Customer" />

                {/* Dropdown trigger */}
                <Pressable
                    onPress={() => setCustomerOpen((v) => !v)}
                    style={[
                    styles.dropdownTrigger,
                    customerOpen && styles.dropdownTriggerOpen,
                    ]}
                >
                    <Text style={styles.dropdownText}>
                    {customers.find(c => c.id === form.customer_id)?.name || "No customer"}
                    </Text>
                    <Ionicons
                    name={customerOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.text.secondary}
                    />
                </Pressable>

                {/* Dropdown menu */}
                {customerOpen && (
                    <View style={styles.dropdownMenu}>
                    {loadingCustomers ? (
                        <ActivityIndicator style={{ padding: spacing.md }} />
                    ) : (
                        <ScrollView style={{ maxHeight: 220 }}>
                        {/* No customer option */}
                        <Pressable
                            onPress={() => {
                            setForm((f) => ({ ...f, customer_id: null }));
                            setCustomerOpen(false);
                            }}
                            style={styles.dropdownItem}
                        >
                            <Text style={styles.dropdownItemText}>No customer</Text>
                        </Pressable>

                        {/* Customer options */}
                        {customers.map((c) => (
                            <Pressable
                            key={c.id}
                            onPress={() => {
                                setForm((f) => ({ ...f, customer_id: c.id }));
                                setCustomerOpen(false);
                            }}
                            style={[
                                styles.dropdownItem,
                                form.customer_id === c.id && styles.dropdownItemActive,
                            ]}
                            >
                            <Text style={styles.dropdownItemText}>{c.name}</Text>
                            </Pressable>
                        ))}
                        </ScrollView>
                    )}
                    </View>
                )}
                </View>

            {/* Geofence */}
            <Field
              label="Geofence (meters)"
              icon="radio-outline"
              value={form.geofence_m}
              onChangeText={(t) => setForm((f) => ({ ...f, geofence_m: t }))}
              keyboardType="numeric"
              placeholder="e.g. 150"
            />

            {/* Lat / Lng */}
            <View style={styles.row}>
              <Field
                label="Latitude"
                icon="map-outline"
                value={form.lat}
                onChangeText={(t) => setForm((f) => ({ ...f, lat: t }))}
                keyboardType="numeric"
                placeholder="e.g. 40.759"
              />
              <Field
                label="Longitude"
                icon="map-outline"
                value={form.lng}
                onChangeText={(t) => setForm((f) => ({ ...f, lng: t }))}
                keyboardType="numeric"
                placeholder="e.g. -111.848"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={colors.semantic.error}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onCreate}
              disabled={!canCreate}
              style={[
                styles.createButton,
                !canCreate && styles.createButtonDisabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.createText}>Create Project</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Small helpers ---------- */

function Label({ icon, text }) {
  return (
    <View style={styles.label}>
      <Ionicons name={icon} size={16} color={colors.text.tertiary} />
      <Text style={styles.labelText}>{text}</Text>
    </View>
  );
}

function Field({ label, icon, required, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Label icon={icon} text={required ? `${label} *` : label} />
      <TextInput
        {...props}
        style={[
          styles.input,
          focused && styles.inputFocused,
        ]}
        placeholderTextColor={colors.text.tertiary}
        selectionColor={colors.primary.orange}
        cursorColor={colors.primary.orange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "90%",
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  content: { padding: spacing.lg },
  field: { marginBottom: spacing.md },
  label: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  labelText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.dark,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    backgroundColor: colors.neutral.white,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
  },
  row: { flexDirection: "row", gap: spacing.md },
  customerList: { gap: spacing.xs },
  customerOption: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  customerOptionActive: {
    borderColor: colors.primary.orange,
    backgroundColor: colors.primary.orangeSubtle,
  },
  customerText: { fontSize: typography.fontSize.sm },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: { padding: spacing.sm },
  cancelText: { color: colors.text.secondary },
  createButton: {
    backgroundColor: colors.primary.orange,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  createButtonDisabled: { opacity: 0.6 },
  createText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.semantic.errorLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorText: { color: colors.semantic.error },
  inputFocused: {
    borderColor: colors.primary.orange,
    shadowColor: colors.primary.orange,
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  dropdownTrigger: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border.dark,
  borderRadius: borderRadius.md,
  backgroundColor: colors.neutral.white,
},
dropdownTriggerOpen: {
  borderColor: colors.primary.orange,
},
dropdownText: {
  fontSize: typography.fontSize.md,
  color: colors.text.primary,
},
dropdownMenu: {
  marginTop: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border.light,
  borderRadius: borderRadius.md,
  backgroundColor: colors.surface.card,
  overflow: "hidden",
  ...shadows.sm,
},
dropdownItem: {
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
},
dropdownItemActive: {
  backgroundColor: colors.primary.orangeSubtle,
},
dropdownItemText: {
  fontSize: typography.fontSize.sm,
  color: colors.text.primary,
},
});
