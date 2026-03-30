import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows,} from '../../../constants/theme';
import { useProject } from '../../components/projectComponents/projectContext';
import { useLocalSearchParams, router } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getProject, updateProject, getCustomers, deleteProject,} from '../../../utils/api';
import CustomerModal from '../../components/projectComponents/customerModal';

function FieldRow({ icon, label, value, editing, onChangeText, placeholder, keyboardType = 'default', multiline = false,}) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLabelWrap}>
        <View style={styles.fieldIcon}>
          <Ionicons name={icon} size={16} color={colors.text.tertiary} />
        </View>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>

      <View style={styles.fieldValueWrap}>
        {editing ? (
          <TextInput
            value={value ?? ''}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            style={[styles.input, multiline && styles.inputMultiline]}
            keyboardType={keyboardType}
            multiline={multiline}
          />
        ) : (
          <Text style={styles.fieldValue} numberOfLines={multiline ? 3 : 1}>
            {value?.toString()?.trim() ? value : '—'}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ProjectOverview() {
  const { selectedProject, selectedProjectId, setSelectedProject } = useProject();
  const params = useLocalSearchParams();
  const { session } = useSession();
  const token = session?.access_token;

  const [project, setProject] = useState(selectedProject || null);
  const projectIdFromQuery = params?.projectId || null;

  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [deleteError, setDeleteError] = useState(null);

  const selectedCustomer =
  customers.find((c) => c.id === draft?.customer_id) ||
  draft?.customers ||
  null;
  

  // Load project
  useEffect(() => {
    let mounted = true;

    async function ensureProject() {
      if (selectedProject && selectedProject.id) {
        setProject(selectedProject);
        return;
      }

      const idToFetch = projectIdFromQuery || selectedProjectId;
      if (!idToFetch || !token) {
        setProject(null);
        return;
      }

      setLoading(true);
      const res = await getProject(token, idToFetch);
      if (!mounted) return;

      if (res.success && res.data?.project) {
        setProject(res.data.project);
        try {
          setSelectedProject(res.data.project);
        } catch (err) {}
      } else {
        console.warn('Failed to load project:', res.message);
        setProject(null);
      }
      setLoading(false);
    }

    ensureProject();
    return () => {
      mounted = false;
    };
  }, [selectedProject, selectedProjectId, projectIdFromQuery, token]);

  useEffect(() => {
    if (project) setDraft(project);
  }, [project]);

  useEffect(() => {
    if (!isEditing) {
      setCustomerOpen(false);
      setCustomerModalVisible(false);
    }
  }, [isEditing]);

  // When project changes (or when entering edit mode), prep draft
  const canSave = useMemo(() => {
    if (!project || !draft) return false;
    const nameOk = (draft.name || '').trim().length > 0;
    const changed =
      draft.name !== project.name ||
      draft.address !== project.address ||
      draft.customer_id !== project.customer_id ||
      draft.geofence_m !== project.geofence_m ||
      draft.lat !== project.lat ||
      draft.lng !== project.lng ||
      draft.active !== project.active;
    return nameOk && changed && !saving;
  }, [project, draft, saving]);

  const loadCustomers = async () => {
    if (!token || !project?.company_id) return;

    setCustomersLoading(true);
    const res = await getCustomers(token, project.company_id);
    if (res.success) {
      setCustomers(res.data.customers || []);
    }
    setCustomersLoading(false);
  };

  useEffect(() => {
    if (!token || !project?.company_id) return;
    loadCustomers();
  }, [token, project?.company_id]);

  const startEditing = () => {
    if (!project) return;
    setSaveError(null);
    setSaveSuccess(false);
    setDraft(project);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setSaveError(null);
    setSaveSuccess(false);
    setDraft(project);
    setCustomerOpen(false);
    setCustomerModalVisible(false);
    setIsEditing(false);
  };

  const handleCustomersUpdated = (nextCustomers) => {
    setCustomers(nextCustomers || []);
  };

  const handleCustomerSelected = (customer) => {
    setDraft((d) => ({
      ...d,
      customer_id: customer?.id || null,
      customers: customer
        ? {
            id: customer.id,
            name: customer.name,
            contact_name: customer.contact_name || null,
            contact_email: customer.contact_email || null,
          }
        : null,
    }));

    setCustomerModalVisible(false);
    setCustomerOpen(false);
  };

  const onSave = async () => {
    if (!token || !project?.id || !draft) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const updates = {
      name: draft.name?.trim(),
      address: draft.address?.trim() || null,
      customer_id: draft.customer_id || null,
      geofence_m: draft.geofence_m === '' || draft.geofence_m === null ? null : Number(draft.geofence_m),
      lat: draft.lat === '' || draft.lat === null ? null : Number(draft.lat),
      lng: draft.lng === '' || draft.lng === null ? null : Number(draft.lng),
      active: !!draft.active,
      parent_id: draft.parent_id || null,
    };

    const res = await updateProject(token, project.id, updates);

    if (res.success && res.data?.project) {
      const refreshed = await getProject(token, project.id);

      if (refreshed.success && refreshed.data?.project) {
        setProject(refreshed.data.project);
        try {
          setSelectedProject(refreshed.data.project);
        } catch (err) {}
      } else {
        setProject(res.data.project);
        try {
          setSelectedProject(res.data.project);
        } catch (err) {}
      }

      setIsEditing(false);
      setSaveSuccess(true);
    } else {
      setSaveError(res.message || 'Failed to save project');
    }

    setSaving(false);
  };

  if (loading || !project) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Project Overview</Text>
            <Text style={styles.subtitle}>{loading ? 'Loading project…' : 'No project selected'}</Text>
          </View>
        </View>

        <View style={styles.placeholderCard}>
          <ActivityIndicator size="large" color={colors.primary.orange} />
          <Text style={styles.placeholderTitle}>{loading ? 'Loading…' : 'Open a project from Projects'}</Text>
          <Text style={styles.placeholderText}>
            Select a project to view and edit its details here.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{project.name}</Text>
            <Text style={styles.subtitle}>
              {project.address?.trim() ? project.address : 'Project details'}
            </Text>
          </View>

          {/* Right-side actions */}
          {!isEditing ? (
            <Pressable
              onPress={startEditing}
              style={({ pressed, hovered }) => [
                styles.primaryButton,
                hovered && styles.primaryButtonHovered,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Ionicons name="create-outline" size={18} color={colors.text.inverse} />
              <Text style={styles.primaryButtonText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={styles.headerActions}>
              <Pressable
                onPress={cancelEditing}
                style={({ pressed, hovered }) => [
                  styles.secondaryButton,
                  hovered && styles.secondaryButtonHovered,
                  pressed && styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onSave}
                disabled={!canSave}
                style={({ pressed, hovered }) => [
                  styles.primaryButton,
                  !canSave && styles.primaryButtonDisabled,
                  hovered && canSave && styles.primaryButtonHovered,
                  pressed && canSave && styles.primaryButtonPressed,
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Ionicons name="checkmark" size={18} color={colors.text.inverse} />
                )}
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Status strip */}
        <View style={styles.statusStrip}>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: project.active ? colors.semantic.success : colors.text.tertiary }]} />
            <Text style={styles.statusText}>{project.active ? 'Active' : 'Inactive'}</Text>
          </View>

          {saveSuccess && (
            <View style={styles.successPill}>
              <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
              <Text style={styles.successText}>Saved</Text>
            </View>
          )}

          {saveError && (
            <View style={styles.errorPill}>
              <Ionicons name="alert-circle" size={16} color={colors.semantic.error} />
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}
        </View>

        {/* Core details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary.orange} />
            </View>
            <Text style={styles.cardTitle}>Core Details</Text>
          </View>

          <FieldRow
            icon="pricetag-outline"
            label="Project Name"
            value={isEditing ? draft?.name : project.name}
            editing={isEditing}
            onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
            placeholder="Project name"
          />

          <FieldRow
            icon="location-outline"
            label="Address"
            value={isEditing ? draft?.address : project.address}
            editing={isEditing}
            onChangeText={(t) => setDraft((d) => ({ ...d, address: t }))}
            placeholder="Street, city, state"
            multiline
          />
        </View>

        {/* Customer Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="business-outline" size={18} color={colors.primary.orange} />
            </View>
            <Text style={styles.cardTitle}>Customer</Text>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldLabelWrap}>
              <View style={styles.fieldIcon}>
                <Ionicons name="briefcase-outline" size={16} color={colors.text.tertiary} />
              </View>
              <Text style={styles.fieldLabel}>Customer</Text>
            </View>

            <View style={styles.fieldValueWrap}>
              {!isEditing ? (
                <Text style={styles.fieldValue}>
                  {project.customers?.name || '—'}
                </Text>
              ) : (
            <>
              <Pressable
                onPress={() => setCustomerOpen((v) => !v)}
                style={[
                  styles.dropdownTrigger,
                  customerOpen && styles.dropdownTriggerOpen,
                ]}
              >
                {!customerOpen ? (
                  <Text style={styles.dropdownText}>
                    {selectedCustomer?.name || 'No customer'}
                  </Text>
                ) : (
                  <View style={styles.dropdownTriggerContent}>
                    <View style={styles.dropdownTriggerTopRow}>
                      <Text style={styles.dropdownSelectedName}>
                        {selectedCustomer?.name || 'No customer'}
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
                            {selectedCustomer.contact_name || 'No contact name'}
                          </Text>
                        </View>

                        <View style={styles.customerMetaRow}>
                          <Ionicons
                            name="mail-outline"
                            size={14}
                            color={colors.text.tertiary}
                          />
                          <Text style={styles.customerMetaText}>
                            {selectedCustomer.contact_email || 'No contact email'}
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
                  name={customerOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.text.secondary}
                />
              </Pressable>

              {customerOpen && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={styles.dropdownScroll} contentContainerStyle={styles.dropdownScrollContent}>
                    <Pressable
                      onPress={() => {
                        setDraft((d) => ({
                          ...d,
                          customer_id: null,
                          customers: null,
                        }));
                        setCustomerOpen(false);
                      }}
                      style={[
                        styles.customerOptionCard,
                        !draft?.customer_id && styles.customerOptionCardActive,
                      ]}
                    >
                      <View style={styles.customerOptionHeader}>
                        <Text style={styles.customerOptionName}>No customer</Text>
                        {!draft?.customer_id ? (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={14} color={colors.primary.orange} />
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.customerOptionEmptyText}>
                        Leave this project unassigned to a customer
                      </Text>
                    </Pressable>

                    {customers.map((c) => {
                      const isSelected = draft?.customer_id === c.id;

                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            setDraft((d) => ({
                              ...d,
                              customer_id: c.id,
                              customers: {
                                id: c.id,
                                name: c.name,
                                contact_name: c.contact_name || null,
                                contact_email: c.contact_email || null,
                              },
                            }));
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
                                <Ionicons name="checkmark" size={14} color={colors.primary.orange} />
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
                              {c.contact_name || 'No contact name'}
                            </Text>
                          </View>

                          <View style={styles.customerMetaRow}>
                            <Ionicons
                              name="mail-outline"
                              size={14}
                              color={colors.text.tertiary}
                            />
                            <Text style={styles.customerMetaText}>
                              {c.contact_email || 'No contact email'}
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
                </View>
              )}
            </>
              )}
            </View>
          </View>

          <FieldRow
            icon="mail-outline"
            label="Contact Email"
            value={
              isEditing
                ? draft?.customers?.contact_email
                : project.customers?.contact_email
            }
            editing={false}
          />

          <FieldRow
            icon="person-outline"
            label="Contact Name"
            value={
              isEditing
                ? draft?.customers?.contact_name
                : project.customers?.contact_name
            }
            editing={false}
          />
        </View>

        {/* Location Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="navigate-outline" size={18} color={colors.primary.orange} />
            </View>
            <Text style={styles.cardTitle}>Location</Text>
          </View>

          <FieldRow
            icon="radio-outline"
            label="Geofence (meters)"
            value={isEditing ? String(draft?.geofence_m ?? '') : (project.geofence_m ?? '')}
            editing={isEditing}
            onChangeText={(t) => setDraft((d) => ({ ...d, geofence_m: t }))}
            placeholder="e.g. 150"
            keyboardType="numeric"
          />

          <FieldRow
            icon="map-outline"
            label="Latitude"
            value={isEditing ? String(draft?.lat ?? '') : (project.lat ?? '')}
            editing={isEditing}
            onChangeText={(t) => setDraft((d) => ({ ...d, lat: t }))}
            placeholder="e.g. 39.7392"
            keyboardType="numeric"
          />

          <FieldRow
            icon="map-outline"
            label="Longitude"
            value={isEditing ? String(draft?.lng ?? '') : (project.lng ?? '')}
            editing={isEditing}
            onChangeText={(t) => setDraft((d) => ({ ...d, lng: t }))}
            placeholder="e.g. -104.9903"
            keyboardType="numeric"
          />
        </View>

        {/* Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary.orange} />
            </View>
            <Text style={styles.cardTitle}>Status</Text>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.fieldLabelWrap}>
              <View style={styles.fieldIcon}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.text.tertiary} />
              </View>
              <Text style={styles.fieldLabel}>Active</Text>
            </View>

            <View style={styles.fieldValueWrap}>
              {isEditing ? (
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, active: !d.active }))}
                  style={({ pressed, hovered }) => [
                    styles.togglePill,
                    draft?.active ? styles.togglePillOn : styles.togglePillOff,
                    pressed && styles.togglePillPressed,
                    hovered && styles.togglePillHovered,
                  ]}
                >
                  <View style={[styles.toggleDot, draft?.active ? styles.toggleDotOn : styles.toggleDotOff]} />
                  <Text style={styles.toggleText}>{draft?.active ? 'Active' : 'Inactive'}</Text>
                </Pressable>
              ) : (
                <Text style={styles.fieldValue}>{project.active ? 'Active' : 'Inactive'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Delete Project Button */}
        {isEditing && (
          <View style={{ marginTop: spacing.xl }}>
            <Pressable
              onPress={() => setDeleteOpen(true)}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.neutral.white} />
              <Text style={styles.deleteButtonText}>Delete Project</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <CustomerModal
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        token={token}
        companyId={project?.company_id}
        selectedCustomerId={draft?.customer_id || null}
        onSelectCustomer={handleCustomerSelected}
        onCustomersUpdated={handleCustomersUpdated}
      />

      <Modal
        visible={deleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete Project?</Text>
            <Text style={styles.confirmText}>
              This action cannot be undone. The project will be permanently deleted.
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setDeleteOpen(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  if (!token || !project?.id) return;
                  setDeleting(true);

                  const res = await deleteProject(token, project.id, true);

                  setDeleting(false);

                  if (!res?.success) {
                    const rawMessage = res?.message || '';

                    if (rawMessage.includes('time_entries')) {
                      setDeleteError(
                        'This project cannot be permanently deleted because it has time entries associated with it. You can archive it instead.'
                      );
                    } else {
                      setDeleteError(rawMessage || 'Failed to delete project.');
                    }
                    return;
                  }

                  setDeleteOpen(false);
                  setSelectedProject(null);
                  router.replace({
                    pathname: '/(app)/projects',
                    params: {
                      toast: `"${project.name}" was successfully deleted`,
                    },
                  });
                }}
                style={styles.confirmDeleteButton}
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

      <Modal
        visible={!!deleteError}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteError(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Deletion Failed</Text>

            <Text style={styles.confirmText}>
              {deleteError}
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setDeleteError(null)}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  pageTitle: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: typography.fontSize.md, color: colors.text.secondary },

  statusStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: colors.text.secondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },

  successPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.semantic.successLight,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  successText: { color: colors.semantic.success, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },

  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.semantic.errorLight,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    maxWidth: 420,
  },
  errorText: { color: colors.semantic.error, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },

  card: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.md,
  },
  fieldLabelWrap: { width: 170, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: 2 },
  fieldIcon: { width: 22, alignItems: 'center' },
  fieldLabel: { color: colors.text.tertiary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
  fieldValueWrap: { flex: 1 },
  fieldValue: { color: colors.text.primary, fontSize: typography.fontSize.md, lineHeight: 22 },

  input: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.orange,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.md,
  },
  primaryButtonText: { color: colors.text.inverse, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  primaryButtonHovered: { backgroundColor: colors.primary.orangeDark, ...shadows.glow },
  primaryButtonPressed: { transform: [{ scale: 0.98 }] },
  primaryButtonDisabled: { opacity: 0.6 },

  secondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryButtonText: { color: colors.text.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  secondaryButtonHovered: { backgroundColor: colors.surface.cardHover },
  secondaryButtonPressed: { transform: [{ scale: 0.98 }] },

  placeholderCard: {
    backgroundColor: colors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  placeholderTitle: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  placeholderText: { fontSize: typography.fontSize.md, color: colors.text.secondary, textAlign: 'center', maxWidth: 420 },

  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  togglePillOn: {
    backgroundColor: colors.semantic.successLight,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  togglePillOff: {
    backgroundColor: colors.neutral.offWhite,
    borderColor: colors.border.light,
  },
  togglePillHovered: { opacity: 0.95 },
  togglePillPressed: { transform: [{ scale: 0.98 }] },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleDotOn: { backgroundColor: colors.semantic.success },
  toggleDotOff: { backgroundColor: colors.text.tertiary },
  toggleText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
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
    overflow: 'hidden',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dropdownAddText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary.orange,
    fontWeight: typography.fontWeight.semibold,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: colors.neutral.white,
    fontWeight: typography.fontWeight.semibold,
  },
  confirmCard: {
    width: '100%',
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
  },
  confirmText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  confirmDeleteButton: {
    backgroundColor: colors.semantic.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  confirmDeleteText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  
  dropdownTrigger: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: spacing.sm,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border.default,
  borderRadius: borderRadius.lg,
  backgroundColor: colors.neutral.white,
},

dropdownTriggerOpen: {
  borderColor: colors.primary.orange,
  ...shadows.sm,
},

dropdownTriggerContent: {
  flex: 1,
  gap: spacing.xs,
},

dropdownTriggerTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
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
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: spacing.sm,
},

customerOptionName: {
  flex: 1,
  fontSize: typography.fontSize.md,
  fontWeight: typography.fontWeight.semibold,
  color: colors.text.primary,
},

customerMetaRow: {
  flexDirection: 'row',
  alignItems: 'center',
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
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.neutral.white,
  borderWidth: 1,
  borderColor: colors.primary.orange,
},
manageCustomersButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
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
