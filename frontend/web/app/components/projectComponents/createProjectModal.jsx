import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput, ActivityIndicator,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography,  shadows,} from "../../../constants/theme";
import { createProject, getCustomers } from "../../../utils/api";
import CustomerModal from "./customerModal";

export default function CreateProjectModal({ visible, onClose, token, companyId, onCreated,}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    customer_id: null,
    geofence_m: "",
    lat: "",
    lng: "",
  });

  // Fetch customers when modal opens
  const loadCustomers = async () => {
    if (!token || !companyId) return;

    setLoadingCustomers(true);
    const res = await getCustomers(token, companyId);
    if (res.success) {
      setCustomers(res.data.customers || []);
    }
    setLoadingCustomers(false);
  };

  useEffect(() => {
    if (!visible || !token || !companyId) return;
    loadCustomers();
  }, [visible, token, companyId]);

  useEffect(() => {
    if (!visible) {
      setCustomerOpen(false);
      setCustomerModalVisible(false);
    }
  }, [visible]);

  const canCreate = form.name.trim().length > 0 && !saving;

  const handleCustomersUpdated = (nextCustomers) => {
    setCustomers(nextCustomers || []);
  };

  const handleCustomerSelected = (customer) => {
    setForm((f) => ({
      ...f,
      customer_id: customer?.id || null,
    }));

    setCustomerModalVisible(false);
    setCustomerOpen(false);
  };

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

  const selectedCustomer = customers.find((c) => c.id === form.customer_id) || null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Project</Text>
              <Pressable onPress={onClose}>
                <Ionicons
                  name="close"
                  size={22}
                  color={colors.text.secondary}
                />
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

                  <Pressable
                    onPress={() => setCustomerOpen((v) => !v)}
                    style={[
                      styles.dropdownTrigger,
                      customerOpen && styles.dropdownTriggerOpen,
                      customerOpen && styles.dropdownTriggerExpanded,
                    ]}
                  >
                  {!customerOpen ? (
                    <Text style={styles.dropdownText}>
                      {selectedCustomer?.name || "No customer"}
                    </Text>
                  ) : (
                    <View style={styles.dropdownTriggerContent}>
                      <View style={styles.dropdownTriggerTopRow}>
                        <Text style={styles.dropdownSelectedName}>
                          {selectedCustomer?.name || "No customer"}
                        </Text>

                        {selectedCustomer ? (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>Selected</Text>
                          </View>
                        ) : null}
                      </View>

                      {selectedCustomer ? (
                        <>
                          <View style={styles.customerMetaRow}>
                            <Ionicons
                              name="person-outline"
                              size={14}
                              color={colors.text.tertiary}
                            />
                            <Text style={styles.customerMetaText}>
                              {selectedCustomer.contact_name || "No contact name"}
                            </Text>
                          </View>

                          <View style={styles.customerMetaRow}>
                            <Ionicons
                              name="mail-outline"
                              size={14}
                              color={colors.text.tertiary}
                            />
                            <Text style={styles.customerMetaText}>
                              {selectedCustomer.contact_email || "No contact email"}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.dropdownPlaceholderText}>
                          Select an existing customer or manage customers
                        </Text>
                      )}
                    </View>
                  )}

                  <Ionicons
                    name={customerOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.text.secondary}
                  />
                </Pressable>

                {customerOpen && (
                  <View style={styles.dropdownMenu}>
                    {loadingCustomers ? (
                      <ActivityIndicator style={{ padding: spacing.md }} />
                    ) : (
                      <ScrollView
                        style={styles.dropdownScroll}
                        contentContainerStyle={styles.dropdownScrollContent}
                      >
                        <Pressable
                          onPress={() => {
                            setForm((f) => ({ ...f, customer_id: null }));
                            setCustomerOpen(false);
                          }}
                          style={[
                            styles.customerOptionCard,
                            !form.customer_id && styles.customerOptionCardActive,
                          ]}
                        >
                          <View style={styles.customerOptionHeader}>
                            <Text style={styles.customerOptionName}>No customer</Text>
                            {!form.customer_id ? (
                              <View style={styles.checkBadge}>
                                <Ionicons
                                  name="checkmark"
                                  size={14}
                                  color={colors.primary.orange}
                                />
                              </View>
                            ) : null}
                          </View>

                          <Text style={styles.customerOptionEmptyText}>
                            Leave this project unassigned to a customer
                          </Text>
                        </Pressable>

                        {customers.map((c) => {
                          const isSelected = form.customer_id === c.id;

                          return (
                            <Pressable
                              key={c.id}
                              onPress={() => {
                                setForm((f) => ({ ...f, customer_id: c.id }));
                                setCustomerOpen(false);
                              }}
                              style={[
                                styles.customerOptionCard,
                                isSelected && styles.customerOptionCardActive,
                              ]}
                            >
                              <View style={styles.customerOptionHeader}>
                                <Text style={styles.customerOptionName}>{c.name}</Text>

                                {isSelected ? (
                                  <View style={styles.checkBadge}>
                                    <Ionicons
                                      name="checkmark"
                                      size={14}
                                      color={colors.primary.orange}
                                    />
                                  </View>
                                ) : null}
                              </View>

                              <View style={styles.customerMetaRow}>
                                <Ionicons
                                  name="person-outline"
                                  size={14}
                                  color={colors.text.tertiary}
                                />
                                <Text style={styles.customerMetaText}>
                                  {c.contact_name || "No contact name"}
                                </Text>
                              </View>

                              <View style={styles.customerMetaRow}>
                                <Ionicons
                                  name="mail-outline"
                                  size={14}
                                  color={colors.text.tertiary}
                                />
                                <Text style={styles.customerMetaText}>
                                  {c.contact_email || "No contact email"}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}

                        <Pressable
                          onPress={() => {
                            setCustomerOpen(false);
                            setCustomerModalVisible(true);
                          }}
                          style={styles.manageCustomersButton}
                        >
                          <Ionicons
                            name="people-outline"
                            size={16}
                            color={colors.primary.orange}
                          />
                          <Text style={styles.manageCustomersText}>Manage customers</Text>
                        </Pressable>
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>

              {/* Geofence radius */}
              <Field
                label="Geofence (meters)"
                icon="radio-outline"
                value={form.geofence_m}
                onChangeText={(t) =>
                  setForm((f) => ({ ...f, geofence_m: t }))
                }
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

      <CustomerModal
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        token={token}
        companyId={companyId}
        selectedCustomerId={form.customer_id}
        onSelectCustomer={handleCustomerSelected}
        onCustomersUpdated={handleCustomersUpdated}
      />
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
    outlineStyle: "solid",
    outlineColor: "transparent",
  },
  row: { flexDirection: "row", gap: spacing.md },
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
  dropdownAddItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  dropdownAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dropdownAddText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.orange,
    fontWeight: typography.fontWeight.semibold,
  },

dropdownTrigger: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border.dark,
  borderRadius: borderRadius.lg,
  backgroundColor: colors.neutral.white,
},

dropdownTriggerOpen: {
  borderColor: colors.primary.orange,
  ...shadows.sm,
},

dropdownTriggerExpanded: {
  alignItems: "flex-start",
},

dropdownText: {
  fontSize: typography.fontSize.md,
  color: colors.text.primary,
},

dropdownTriggerContent: {
  flex: 1,
  gap: spacing.xs,
},

dropdownTriggerTopRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
},

dropdownSelectedName: {
  flex: 1,
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.semibold,
  color: colors.text.primary,
},

dropdownPlaceholderText: {
  fontSize: typography.fontSize.sm,
  color: colors.text.tertiary,
},

selectedBadge: {
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
  borderRadius: borderRadius.full,
  backgroundColor: colors.primary.orangeSubtle,
},

selectedBadgeText: {
  fontSize: typography.fontSize.xs,
  fontWeight: typography.fontWeight.semibold,
  color: colors.primary.orange,
},

dropdownMenu: {
  marginTop: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border.light,
  borderRadius: borderRadius.lg,
  backgroundColor: colors.surface.card,
  ...shadows.md,
},

dropdownScroll: {
  maxHeight: 320,
},

dropdownScrollContent: {
  padding: spacing.sm,
  gap: spacing.sm,
},

customerOptionCard: {
  borderWidth: 1,
  borderColor: colors.border.light,
  borderRadius: borderRadius.lg,
  padding: spacing.md,
  backgroundColor: colors.neutral.white,
  gap: spacing.xs,
},

customerOptionCardActive: {
  borderColor: colors.primary.orange,
  backgroundColor: colors.primary.orangeSubtle,
},

customerOptionHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing.sm,
},

customerOptionName: {
  flex: 1,
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.semibold,
  color: colors.text.primary,
},

customerMetaRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
},

customerMetaText: {
  flex: 1,
  fontSize: typography.fontSize.sm,
  color: colors.text.secondary,
},

customerOptionEmptyText: {
  fontSize: typography.fontSize.sm,
  color: colors.text.secondary,
},

checkBadge: {
  width: 22,
  height: 22,
  borderRadius: 11,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.neutral.white,
  borderWidth: 1,
  borderColor: colors.primary.orange,
},

manageCustomersButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xs,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  borderRadius: borderRadius.lg,
  borderWidth: 1,
  borderColor: colors.border.light,
  backgroundColor: colors.surface.card,
},

manageCustomersText: {
  fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.semibold,
  color: colors.primary.orange,
},
});
