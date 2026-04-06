import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl, Modal as RNModal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getEquipment, createEquipment, updateEquipment, deleteEquipment, getUserProfile } from '../../../utils/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';

// Modal Component
const Modal = ({ visible, onClose, title, subtitle, children }) => {
  if (!visible) return null;
  return (
    <View style={modalStyles.overlay}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <View>
            <Text style={modalStyles.title}>{title}</Text>
            {subtitle && <Text style={modalStyles.subtitle}>{subtitle}</Text>}
          </View>
          <Pressable style={modalStyles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </Pressable>
        </View>
        <ScrollView style={modalStyles.body} contentContainerStyle={modalStyles.bodyContent}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { width: '90%', maxWidth: 440, maxHeight: '85%', backgroundColor: colors.neutral.white, borderRadius: 12, ...shadows.xl, zIndex: 10000 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  subtitle: { fontSize: 13, color: colors.text.tertiary, marginTop: 4 },
  closeBtn: { padding: 4 },
  body: { maxHeight: 500 },
  bodyContent: { padding: 16 },
});

// Form Field
const FormField = ({ label, required, hint, children }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.secondary, marginBottom: 8 }}>{label} {required && <Text style={{ color: colors.semantic.error }}>*</Text>}</Text>
    {children}
    {hint && <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 4 }}>{hint}</Text>}
  </View>
);

// Confirm Dialog
const ConfirmDialog = ({ visible, onClose, onConfirm, title, message }) => (
  <RNModal visible={visible} transparent animationType="fade">
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.neutral.white, borderRadius: 12, width: '100%', maxWidth: 400, ...shadows.xl }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border.light }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>{title}</Text>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 14, color: colors.text.secondary, marginBottom: 20 }}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={{ flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border.medium, alignItems: 'center' }} onPress={onClose}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>Cancel</Text>
            </Pressable>
            <Pressable style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.semantic.error, alignItems: 'center' }} onPress={onConfirm}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  </RNModal>
);

export default function EquipmentPage() {
  const { session } = useSession();
  const token = session?.access_token;
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState(params.status || 'all');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({ type: '', label: '', model: '', active: true });
  const [sortField, setSortField] = useState('type');
  const [sortDirection, setSortDirection] = useState('asc');

  const statusCounts = useMemo(() => ({ all: equipment.length, active: equipment.filter(e => e.active).length, inactive: equipment.filter(e => !e.active).length }), [equipment]);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const meRes = await getUserProfile(token);
      const cid = meRes?.data?.user?.default_company_id;
      setCompanyId(cid);
      const res = await getEquipment(token, cid);
      // API returns { equipment: [...] } in backend, but utils/api returns data wrapper — normalize
      const data = res?.data?.equipment || res?.data || [];
      setEquipment(data);
    } catch (err) {
      console.error('Error loading equipment:', err);
      setError('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!token) return;
    setRefreshing(true);
    try {
      const res = await getEquipment(token, companyId);
      const data = res?.data?.equipment || res?.data || [];
      setEquipment(data);
    } finally { setRefreshing(false); }
  }

  useEffect(() => { load(); }, [token]);

  const types = useMemo(() => {
    const setTypes = new Set(equipment.map(e => e.type).filter(Boolean));
    return Array.from(setTypes).sort();
  }, [equipment]);

  const filtered = useMemo(() => {
    let result = equipment.filter(eq => {
      const matchesSearch = !search || eq.label?.toLowerCase().includes(search.toLowerCase()) || eq.model?.toLowerCase().includes(search.toLowerCase()) || eq.type?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && eq.active) || (statusFilter === 'inactive' && !eq.active);
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'label': aVal = (a.label || '').toLowerCase(); bVal = (b.label || '').toLowerCase(); break;
        case 'type': aVal = (a.type || '').toLowerCase(); bVal = (b.type || '').toLowerCase(); break;
        case 'model': aVal = (a.model || '').toLowerCase(); bVal = (b.model || '').toLowerCase(); break;
        case 'active': aVal = a.active ? 1 : 0; bVal = b.active ? 1 : 0; break;
        default: aVal = (a.type || '').toLowerCase(); bVal = (b.type || '').toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [equipment, search, statusFilter, sortField, sortDirection]);

  const handleSort = (field) => { if (sortField === field) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); } else { setSortField(field); setSortDirection('asc'); } };

  const openAddModal = () => { setFormData({ type: '', label: '', model: '', active: true }); setModalMode('add'); setSelectedEquipment(null); setModalVisible(true); };
  const openEditModal = (eq) => { setFormData({ type: eq.type || '', label: eq.label || '', model: eq.model || '', active: eq.active !== false }); setModalMode('edit'); setSelectedEquipment(eq); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setSelectedEquipment(null); setError(null); };

  const handleSave = async () => {
    if (!formData.label || !formData.type) { setError('Type and label are required'); return; }
    setSaving(true);
    try {
      const payload = { ...formData, company_id: companyId };
      const res = modalMode === 'add' ? await createEquipment(token, payload) : await updateEquipment(token, selectedEquipment.id, formData);
      if (!res.success) { setError(res.message || 'Failed to save'); setSaving(false); return; }
      closeModal();
      refresh();
    } catch (err) { setError('An error occurred'); }
    finally { setSaving(false); }
  };

  const handleArchive = async () => {
    if (!confirmArchive) return;
    try {
      const res = await updateEquipment(token, confirmArchive.id, { active: !confirmArchive.active });
      if (!res.success) { setError(res.message || 'Failed to update status'); }
      setConfirmArchive(null);
      refresh();
    } catch (err) { setError('Failed to update status'); setConfirmArchive(null); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await deleteEquipment(token, confirmDelete.id, true);
      if (!res.success) { setError(res.message || 'Failed to delete'); setConfirmDelete(null); return; }
      setConfirmDelete(null);
      refresh();
    } catch (err) { setError('Failed to delete'); setConfirmDelete(null); }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary.orange} /><Text style={styles.loadingText}>Loading equipment...</Text></View>;

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <Ionicons name="search" size={16} color={searchFocused ? colors.primary.orange : colors.text.tertiary} />
            <TextInput style={styles.searchInput} placeholder="Search equipment..." placeholderTextColor={colors.text.tertiary} value={search} onChangeText={setSearch} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            {search.length > 0 && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.text.tertiary} /></Pressable>}
          </View>

          <View style={styles.viewToggle}>
            {['all', 'active', 'inactive'].map(s => (
              <Pressable key={s} style={[styles.viewBtn, statusFilter === s && styles.viewBtnActive]} onPress={() => setStatusFilter(s)}>
                <Text style={[styles.viewBtnCount, statusFilter === s && styles.viewBtnCountActive]}>{statusCounts[s]}</Text>
                <Text style={[styles.viewText, statusFilter === s && styles.viewTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.toolbarRight}>
          <Pressable style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add Equipment</Text>
          </Pressable>
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}><Ionicons name="close" size={16} color={colors.semantic.error} /></Pressable>
        </View>
      )}

      {/* Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Equipment</Text>
          <Text style={styles.codeCount}>{filtered.length} item{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        <View style={styles.columnHeaderRow}>
          <Pressable style={{ flex: 2, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('label')}>
            <Text style={styles.columnLabel}>Label</Text>
            {sortField === 'label' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <Pressable style={{ width: 120, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('type')}>
            <Text style={styles.columnLabel}>Type</Text>
            {sortField === 'type' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <Pressable style={{ flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('model')}>
            <Text style={styles.columnLabel}>Model</Text>
            {sortField === 'model' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <Pressable style={{ flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('active')}>
            <Text style={styles.columnLabel}>Status</Text>
            {sortField === 'active' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <View style={{ width: 120 }}><Text style={styles.columnLabel}>Actions</Text></View>
        </View>

        <ScrollView style={styles.tableBody} contentContainerStyle={styles.tableBodyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary.orange} />}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="hardware-chip-outline" size={32} color={colors.text.tertiary} /></View>
              <Text style={styles.emptyTitle}>No equipment found</Text>
              <Text style={styles.emptySubtitle}>{search ? 'Try a different search' : 'Add your first equipment item'}</Text>
            </View>
          ) : (
            filtered.map(eq => (
              <Pressable key={eq.id} style={({ hovered }) => [styles.row, hovered && styles.rowHovered, !eq.active && styles.rowInactive]}>
                <View style={{ flex: 2, minWidth: 200 }}>
                  <Text style={[styles.nameText, !eq.active && styles.nameTextInactive]} numberOfLines={1}>{eq.label}</Text>
                </View>
                <View style={{ width: 120 }}>
                  <Text style={styles.unitText}>{eq.type || '—'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 120 }}>
                  <Text style={styles.modelText}>{eq.model || '—'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 80 }}>
                  <Text style={[styles.statusText, eq.active ? styles.statusActive : styles.statusInactive]}>{eq.active ? 'Active' : 'Inactive'}</Text>
                </View>
                <View style={{ width: 120, flexDirection: 'row', gap: 4 }}>
                  <Pressable style={({ hovered }) => [styles.actionBtn, hovered && styles.actionBtnHovered]} onPress={() => openEditModal(eq)}>
                    <Ionicons name="pencil" size={14} color={colors.text.secondary} />
                  </Pressable>
                  <Pressable style={({ hovered }) => [styles.actionBtn, hovered && styles.actionBtnHovered]} onPress={() => setConfirmArchive(eq)}>
                    <Ionicons name={eq.active ? 'archive-outline' : 'arrow-undo-outline'} size={14} color={colors.text.secondary} />
                  </Pressable>
                  <Pressable style={({ hovered }) => [styles.actionBtn, hovered && styles.actionBtnHovered]} onPress={() => setConfirmDelete(eq)}>
                    <Ionicons name="trash-outline" size={14} color={colors.semantic.error} />
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} onClose={closeModal} title={modalMode === 'add' ? 'Add Equipment' : 'Edit Equipment'} subtitle={modalMode === 'add' ? 'Create a new equipment item' : `Editing ${selectedEquipment?.label}`}>
        {error && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.semantic.errorLight, padding: 12, borderRadius: 8, marginBottom: 16 }}><Ionicons name="alert-circle" size={16} color={colors.semantic.error} /><Text style={{ flex: 1, fontSize: 12, color: colors.semantic.error }}>{error}</Text></View>}

        <FormField label="Type" required>
          <TextInput style={styles.input} value={formData.type} onChangeText={v => setFormData({ ...formData, type: v })} placeholder="e.g., Truck, Excavator" placeholderTextColor={colors.text.tertiary} />
        </FormField>

        <FormField label="Label" required>
          <TextInput style={styles.input} value={formData.label} onChangeText={v => setFormData({ ...formData, label: v })} placeholder="Equipment name" placeholderTextColor={colors.text.tertiary} />
        </FormField>

        <FormField label="Model">
          <TextInput style={styles.input} value={formData.model} onChangeText={v => setFormData({ ...formData, model: v })} placeholder="Model or spec" placeholderTextColor={colors.text.tertiary} />
        </FormField>

        <View style={styles.modalFooter}>
          <Pressable style={styles.cancelBtn} onPress={closeModal}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{modalMode === 'add' ? 'Create' : 'Save'}</Text>}</Pressable>
        </View>
      </Modal>

      {/* Archive Confirmation */}
      <ConfirmDialog
        visible={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={handleArchive}
        title={confirmArchive?.active ? 'Archive Equipment' : 'Restore Equipment'}
        message={confirmArchive?.active
          ? `Archive "${confirmArchive?.label}"? It will be marked inactive but can be restored later.`
          : `Restore "${confirmArchive?.label}"? It will be marked active again.`}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog visible={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} title="Permanently Delete Equipment" message={`Permanently delete "${confirmDelete?.label}"? This cannot be undone and will fail if the equipment has time entries.`} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.text.tertiary },

  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 16, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.primary.orange },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.neutral.offWhite, borderRadius: 6, paddingHorizontal: 10, height: 34, minWidth: 200, maxWidth: 280, borderWidth: 1, borderColor: 'transparent' },
  searchContainerFocused: { borderColor: colors.primary.orange, backgroundColor: colors.neutral.white },
  searchInput: { flex: 1, fontSize: 13, color: colors.text.primary, outlineStyle: 'none' },

  viewToggle: { flexDirection: 'row', backgroundColor: colors.neutral.offWhite, borderRadius: 6, padding: 2 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 },
  viewBtnActive: { backgroundColor: colors.neutral.white, ...shadows.sm },
  viewText: { fontSize: 12, fontWeight: '500', color: colors.text.tertiary },
  viewTextActive: { color: colors.text.primary },
  viewBtnCount: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary, minWidth: 16, textAlign: 'center' },
  viewBtnCountActive: { color: colors.primary.orange },

  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.semantic.errorLight, padding: 12, borderRadius: 8, marginHorizontal: 16, marginTop: 12 },
  errorText: { flex: 1, color: colors.semantic.error, fontSize: 13 },

  tableContainer: { flex: 1, marginHorizontal: 16, marginTop: 12, marginBottom: 16, backgroundColor: colors.neutral.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  tableTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  codeCount: { fontSize: 12, color: colors.text.tertiary },

  columnHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.neutral.offWhite, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  columnLabel: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },

  tableBody: { flex: 1 },
  tableBodyContent: { paddingBottom: 16 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  rowHovered: { backgroundColor: colors.neutral.offWhite },
  rowInactive: { opacity: 0.6 },

  nameText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  nameTextInactive: { color: colors.text.tertiary },
  unitText: { fontSize: 12, color: colors.text.secondary, textTransform: 'capitalize' },
  modelText: { fontSize: 12, color: colors.text.secondary },

  // Status text
  statusText: { fontSize: 12, fontWeight: '500' },
  statusActive: { color: '#10b981' },
  statusInactive: { color: colors.text.tertiary },

  actionBtn: { padding: 6, borderRadius: 4 },
  actionBtnHovered: { backgroundColor: colors.neutral.offWhite },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: colors.text.tertiary },

  // Modal form
  input: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text.primary, backgroundColor: colors.neutral.white },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border.light, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border.medium },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, backgroundColor: colors.primary.orange },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
