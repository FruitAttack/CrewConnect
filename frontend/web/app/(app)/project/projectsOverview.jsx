import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';
import { useProject } from "../../components/projectComponents/projectContext";
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getProject, updateProject } from '../../../utils/api';

function FieldRow({ icon, label, value, editing, onChangeText, placeholder, keyboardType = 'default', multiline = false }) {
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

  // edit state
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load project (same logic you had, just adds local loading flag)
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
        try { setSelectedProject(res.data.project); } catch (err) {}
      } else {
        console.warn('Failed to load project:', res.message);
        setProject(null);
      }
      setLoading(false);
    }

    ensureProject();
    return () => { mounted = false; };
  }, [selectedProject, selectedProjectId, projectIdFromQuery, token]);

  // When project changes (or when entering edit mode), prep draft
  useEffect(() => {
    if (project) setDraft(project);
  }, [project]);

  const canSave = useMemo(() => {
    if (!project || !draft) return false;
    // basic validation: name required
    const nameOk = (draft.name || '').trim().length > 0;
    // don’t allow save if nothing changed
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
    setIsEditing(false);
  };

  const onSave = async () => {
    if (!token || !project?.id || !draft) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Only send fields your backend allows updating (it removes id/company_id/created_at anyway)
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
      setProject(res.data.project);
      try { setSelectedProject(res.data.project); } catch (err) {}
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
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

        <FieldRow
          icon="briefcase-outline"
          label="Customer"
          value={project.customers?.name || (project.customer_id ? String(project.customer_id) : '')}
          editing={false}
        />

        <FieldRow
          icon="mail-outline"
          label="Contact Email"
          value={project.customers?.contact_email}
          editing={false}
        />

        <FieldRow
          icon="person-outline"
          label="Contact Name"
          value={project.customers?.contact_name}
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
    </ScrollView>
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
});
