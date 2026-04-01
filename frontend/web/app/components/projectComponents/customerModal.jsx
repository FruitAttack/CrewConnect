import React, { useEffect, useMemo, useState } from "react";
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
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../../constants/theme";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../../../utils/api";

const EMPTY_FORM = {
  name: "",
  contact_email: "",
  contact_name: "",
};

export default function CustomerModal({
  visible,
  onClose,
  token,
  companyId,
  selectedCustomerId = null,
  onSelectCustomer,
  onCustomersUpdated,
}) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const trimmedEmail = form.contact_email.trim();
  const emailValid =
    trimmedEmail.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  const inlineError = useMemo(() => {
    if (!emailValid) return "Enter a valid contact email.";
    return error;
  }, [emailValid, error]);

  const canSubmit =
    form.name.trim().length > 0 && emailValid && !saving && !deleting;

  const applyCustomers = (nextCustomers) => {
    const normalized = nextCustomers || [];
    setCustomers(normalized);
    onCustomersUpdated?.(normalized);
    return normalized;
  };

  const loadCustomers = async () => {
    if (!token || !companyId) return [];

    setLoading(true);
    setError(null);

    const res = await getCustomers(token, companyId);
    let nextCustomers = [];

    if (res.success) {
      nextCustomers = applyCustomers(res.data?.customers || []);
    } else {
      setError(res.message || "Failed to load customers");
    }

    setLoading(false);
    return nextCustomers;
  };

  useEffect(() => {
    if (!visible) {
      setMode("list");
      setForm(EMPTY_FORM);
      setEditingCustomerId(null);
      setDeleteTarget(null);
      setSaving(false);
      setDeleting(false);
      setError(null);
      return;
    }

    loadCustomers();
  }, [visible, token, companyId]);

  const closeModal = () => {
    if (saving || deleting) return;
    onClose?.();
  };

  const startCreate = () => {
    setMode("create");
    setForm(EMPTY_FORM);
    setEditingCustomerId(null);
    setError(null);
  };

  const startEdit = (customer) => {
    setMode("edit");
    setEditingCustomerId(customer.id);
    setForm({
      name: customer.name || "",
      contact_email: customer.contact_email || "",
      contact_name: customer.contact_name || "",
    });
    setError(null);
  };

  const backToList = () => {
    if (saving || deleting) return;
    setMode("list");
    setForm(EMPTY_FORM);
    setEditingCustomerId(null);
    setError(null);
  };

  const handleSelectCustomer = (customer) => {
    onSelectCustomer?.(customer);
    closeModal();
  };

  const handleSubmit = async () => {
    if (!canSubmit || !token || !companyId) return;

    setSaving(true);
    setError(null);

    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      contact_email: trimmedEmail || null,
      contact_name: form.contact_name.trim() || null,
    };

    const res =
      mode === "edit" && editingCustomerId
        ? await updateCustomer(token, editingCustomerId, payload)
        : await createCustomer(token, payload);

    const customer = res.data?.customer || null;

    if (res.success && customer) {
      await loadCustomers();

      if (mode === "create") {
        onSelectCustomer?.(customer);
        closeModal();
      } else {
        if (selectedCustomerId === customer.id) {
          onSelectCustomer?.(customer);
        }
        backToList();
      }
    } else {
      setError(
        res.message ||
          (mode === "edit"
            ? "Failed to update customer"
            : "Failed to create customer")
      );
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id || !token || deleting) return;

    setDeleting(true);
    setError(null);

    const res = await deleteCustomer(token, deleteTarget.id);

    if (res.success) {
      const nextCustomers = await loadCustomers();

      if (selectedCustomerId === deleteTarget.id) {
        onSelectCustomer?.(null);
      }

      const deletedCustomerId = deleteTarget.id;
      setDeleteTarget(null);

      if (
        mode === "edit" &&
        editingCustomerId &&
        editingCustomerId === deletedCustomerId
      ) {
        backToList();
      }

      if (!nextCustomers.find((c) => c.id === deletedCustomerId)) {
        setError(null);
      }
    } else {
      setError(res.message || "Failed to delete customer");
    }

    setDeleting(false);
  };

  const renderListView = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <Pressable onPress={closeModal} disabled={saving || deleting}>
          <Ionicons name="close" size={22} color={colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Manage customers</Text>
        <Text style={styles.subCopy}>
          View contact details, edit records, remove old customers, or add a new one.
        </Text>
      </View>

      <View style={styles.listWrap}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary.orange} />
            <Text style={styles.stateText}>Loading customers…</Text>
          </View>
        ) : customers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="people-outline"
              size={28}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>No customers yet</Text>
            <Text style={styles.emptyText}>
              Add your first customer to attach it to a project.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.cardList}>
            {customers.map((customer) => {
              const isSelected = selectedCustomerId === customer.id;

              return (
                <View key={customer.id} style={styles.customerCard}>
                  <View style={styles.customerTopRow}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.customerNameRow}>
                        <Text style={styles.customerName}>{customer.name}</Text>
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color={colors.semantic.success}
                            />
                            <Text style={styles.selectedBadgeText}>Selected</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.customerMetaRow}>
                        <Ionicons
                          name="person-outline"
                          size={14}
                          color={colors.text.tertiary}
                        />
                        <Text style={styles.customerMetaText}>
                          {customer.contact_name?.trim() || "No contact name"}
                        </Text>
                      </View>

                      <View style={styles.customerMetaRow}>
                        <Ionicons
                          name="mail-outline"
                          size={14}
                          color={colors.text.tertiary}
                        />
                        <Text style={styles.customerMetaText}>
                          {customer.contact_email?.trim() || "No contact email"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.customerActions}>
                    {!!onSelectCustomer && (
                      <Pressable
                        onPress={() => handleSelectCustomer(customer)}
                        style={[
                          styles.selectButton,
                          isSelected && styles.selectButtonSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectButtonText,
                            isSelected && styles.selectButtonTextSelected,
                          ]}
                        >
                          {isSelected ? "Selected" : "Use Customer"}
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => startEdit(customer)}
                      style={styles.inlineButton}
                    >
                      <Ionicons
                        name="create-outline"
                        size={15}
                        color={colors.text.primary}
                      />
                      <Text style={styles.inlineButtonText}>Edit</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setDeleteTarget(customer)}
                      style={styles.inlineDeleteButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color={colors.semantic.error}
                      />
                      <Text style={styles.inlineDeleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {inlineError && (
        <View style={styles.globalErrorWrap}>
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle"
              size={18}
              color={colors.semantic.error}
            />
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Pressable onPress={closeModal} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Close</Text>
        </Pressable>

        <Pressable onPress={startCreate} style={styles.primaryButton}>
          <Ionicons name="add" size={18} color={colors.text.inverse} />
          <Text style={styles.primaryButtonText}>Add New Customer</Text>
        </Pressable>
      </View>
    </>
  );

  const renderFormView = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Pressable onPress={backToList} style={styles.backButton}>
            <Ionicons
              name="chevron-back"
              size={18}
              color={colors.text.primary}
            />
          </Pressable>
          <Text style={styles.title}>
            {mode === "edit" ? "Edit Customer" : "Add New Customer"}
          </Text>
        </View>

        <Pressable onPress={closeModal} disabled={saving || deleting}>
          <Ionicons name="close" size={22} color={colors.text.secondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.formContent}>
        <Field
          label="Customer Name"
          icon="business-outline"
          value={form.name}
          onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
          placeholder="e.g. Acme Development"
          required
          autoFocus
        />

        <Field
          label="Contact Name"
          icon="person-outline"
          value={form.contact_name}
          onChangeText={(t) => setForm((f) => ({ ...f, contact_name: t }))}
          placeholder="e.g. Jane Smith"
        />

        <Field
          label="Contact Email"
          icon="mail-outline"
          value={form.contact_email}
          onChangeText={(t) => setForm((f) => ({ ...f, contact_email: t }))}
          placeholder="contact@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {inlineError && (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle"
              size={18}
              color={colors.semantic.error}
            />
            <Text style={styles.errorText}>{inlineError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={backToList} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Back</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
        >
          {saving ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons
                name={mode === "edit" ? "save-outline" : "add"}
                size={18}
                color={colors.text.inverse}
              />
              <Text style={styles.primaryButtonText}>
                {mode === "edit" ? "Save Changes" : "Create Customer"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            {mode === "list" ? renderListView() : renderFormView()}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!deleteTarget}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete Customer?</Text>
            <Text style={styles.confirmText}>
              {deleteTarget?.name
                ? `This will delete "${deleteTarget.name}" from your customer list.`
                : "This will delete the selected customer."}
            </Text>
            <Text style={styles.confirmSubText}>
              Make sure it is not still needed on other projects before removing it.
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setDeleteTarget(null)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleDelete}
                style={styles.confirmDeleteButton}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

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
        style={[styles.input, focused && styles.inputFocused]}
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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 680,
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
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral.offWhite,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  subTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subCopy: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  listWrap: {
    flex: 1,
    minHeight: 260,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  cardList: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  customerCard: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  customerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  customerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  customerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.semantic.successLight,
  },
  selectedBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.semantic.success,
  },
  customerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  customerMetaText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  customerActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  selectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.orange,
  },
  selectButtonSelected: {
    backgroundColor: colors.primary.orangeSubtle,
  },
  selectButtonText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  selectButtonTextSelected: {
    color: colors.primary.orangeDark,
  },
  inlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.offWhite,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inlineButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  inlineDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.semantic.errorLight,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.18)",
  },
  inlineDeleteButtonText: {
    color: colors.semantic.error,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 220,
  },
  stateText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  emptyText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  globalErrorWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  formContent: {
    padding: spacing.lg,
  },
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
    outlineStyle: "solid",
    outlineColor: "transparent",
  },
  inputFocused: {
    borderColor: colors.primary.orange,
    shadowColor: colors.primary.orange,
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  cancelButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary.orange,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 170,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryButtonText: {
    color: colors.text.primary,
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
  errorText: { color: colors.semantic.error, flex: 1 },
  confirmCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  confirmTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  confirmText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  confirmSubText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  confirmDeleteButton: {
    backgroundColor: colors.semantic.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 96,
    alignItems: "center",
  },
  confirmDeleteText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
});
