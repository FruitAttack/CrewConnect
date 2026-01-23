import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { 
  getAllCostCodes, 
  getCostCode, 
  createCostCode, 
  updateCostCode, 
  deleteCostCode, 
  activateCostCode,
  getUserProfile 
} from '../../../utils/api';
import { colors, shadows } from '../../../constants/theme';

const UNITS = [
  { key: 'hours', label: 'Hours' },
  { key: 'each', label: 'Each' },
  { key: 'lf', label: 'Linear Feet' },
  { key: 'sf', label: 'Square Feet' },
  { key: 'cy', label: 'Cubic Yards' },
  { key: 'tons', label: 'Tons' },
];

// Modal Component
const Modal = ({ visible, onClose, title, children }) => {
  if (!visible) return null;
  return (
    <View style={modalStyles.overlay}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{title}</Text>
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
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { width: '90%', maxWidth: 500, maxHeight: '80%', backgroundColor: colors.neutral.white, borderRadius: 12, ...shadows.xl, zIndex: 1001 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  closeBtn: { padding: 4 },
  body: { maxHeight: 400 },
  bodyContent: { padding: 16 },
});

// Form Field Component
const FormField = ({ label, required, hint, children }) => (
  <View style={formStyles.field}>
    <Text style={formStyles.label}>
      {label} {required && <Text style={formStyles.required}>*</Text>}
    </Text>
    {children}
    {hint && <Text style={formStyles.hint}>{hint}</Text>}
  </View>
);

const formStyles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 },
  required: { color: colors.semantic.error },
  hint: { fontSize: 11, color: colors.text.tertiary, marginTop: 4 },
});

// Confirm Dialog
const ConfirmDialog = ({ visible, onClose, onConfirm, title, message, confirmText = 'Delete', destructive = true }) => {
  if (!visible) return null;
  return (
    <View style={modalStyles.overlay}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={[modalStyles.container, { maxWidth: 400 }]}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{title}</Text>
        </View>
        <View style={modalStyles.bodyContent}>
          <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 16 }}>{message}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            <Pressable style={confirmStyles.cancelBtn} onPress={onClose}>
              <Text style={confirmStyles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[confirmStyles.confirmBtn, destructive && confirmStyles.confirmBtnDestructive]} onPress={onConfirm}>
              <Text style={confirmStyles.confirmBtnText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const confirmStyles = StyleSheet.create({
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border.medium },
  cancelBtnText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  confirmBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, backgroundColor: colors.primary.orange },
  confirmBtnDestructive: { backgroundColor: colors.semantic.error },
  confirmBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});

export default function CostCodesPage() {
  const { session } = useSession();
  const params = useLocalSearchParams();
  const token = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [costCodes, setCostCodes] = useState([]);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add, edit
  const [selectedCostCode, setSelectedCostCode] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit_of_measure: 'hours',
    parent_id: null,
    display_order: 0,
  });

  const fetchCostCodes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getAllCostCodes(token);
      if (res.success) {
        setCostCodes(Array.isArray(res.data) ? res.data : []);
      } else {
        setError(res.error || 'Failed to load cost codes');
      }
    } catch (err) {
      setError('Failed to load cost codes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    async function init() {
      if (!token) return;
      const res = await getUserProfile(token);
      if (res.success && res.data?.user?.default_company_id) {
        setCompanyId(res.data.user.default_company_id);
      }
      fetchCostCodes();
    }
    init();
  }, [token, fetchCostCodes]);

  // Handle URL params for quick actions
  useEffect(() => {
    if (params.action === 'add') {
      openAddModal();
    }
  }, [params.action]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCostCodes();
  };

  // Filter cost codes
  const filtered = useMemo(() => {
    return costCodes.filter(cc => {
      const matchesSearch = !search || 
        cc.code?.toLowerCase().includes(search.toLowerCase()) ||
        cc.name?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && cc.active) ||
        (statusFilter === 'inactive' && !cc.active);

      return matchesSearch && matchesStatus;
    });
  }, [costCodes, search, statusFilter]);

  // Group by parent (CSI divisions)
  const grouped = useMemo(() => {
    const parents = filtered.filter(cc => !cc.parent_id);
    const children = filtered.filter(cc => cc.parent_id);
    
    return parents.map(parent => ({
      ...parent,
      children: children.filter(c => c.parent_id === parent.id),
    }));
  }, [filtered]);

  // Get flat list for non-grouped view
  const flatList = useMemo(() => {
    return filtered.sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      return a.code.localeCompare(b.code);
    });
  }, [filtered]);

  // Modal handlers
  const openAddModal = () => {
    setFormData({
      code: '',
      name: '',
      unit_of_measure: 'hours',
      parent_id: null,
      display_order: 0,
    });
    setModalMode('add');
    setSelectedCostCode(null);
    setModalVisible(true);
  };

  const openEditModal = (cc) => {
    setFormData({
      code: cc.code || '',
      name: cc.name || '',
      unit_of_measure: cc.unit_of_measure || 'hours',
      parent_id: cc.parent_id || null,
      display_order: cc.display_order || 0,
    });
    setModalMode('edit');
    setSelectedCostCode(cc);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCostCode(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!formData.code || !formData.name) {
        setError('Code and name are required');
        setSaving(false);
        return;
      }

      if (modalMode === 'add') {
        const res = await createCostCode(token, formData);
        if (!res.success) {
          setError(res.error || 'Failed to create cost code');
          setSaving(false);
          return;
        }
      } else {
        const res = await updateCostCode(token, selectedCostCode.id, formData);
        if (!res.success) {
          setError(res.error || 'Failed to update cost code');
          setSaving(false);
          return;
        }
      }
      
      closeModal();
      fetchCostCodes();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cc) => {
    try {
      await activateCostCode(token, cc.id, { active: !cc.active });
      fetchCostCodes();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await deleteCostCode(token, confirmDelete.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete cost code');
      }
      setConfirmDelete(null);
      fetchCostCodes();
    } catch (err) {
      setError('Failed to delete cost code');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading cost codes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cost codes..."
            placeholderTextColor={colors.text.tertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
            </Pressable>
          )}
        </View>

        <View style={styles.filters}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.filterBtns}>
              {['all', 'active', 'inactive'].map(s => (
                <Pressable
                  key={s}
                  style={[styles.filterBtn, statusFilter === s && styles.filterBtnActive]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.filterBtnText, statusFilter === s && styles.filterBtnTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Cost Code</Text>
        </Pressable>
      </View>

      {/* Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Cost Codes</Text>
          <Text style={styles.tableCount}>{filtered.length} cost code{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
          <View style={styles.tableInner}>
            {/* Column Headers */}
            <View style={styles.columnHeaderRow}>
              <View style={styles.codeHeaderCell}><Text style={styles.columnLabel}>Code</Text></View>
              <View style={styles.nameHeaderCell}><Text style={styles.columnLabel}>Name</Text></View>
              <View style={styles.unitHeaderCell}><Text style={styles.columnLabel}>Unit</Text></View>
              <View style={styles.statusHeaderCell}><Text style={styles.columnLabel}>Status</Text></View>
              <View style={styles.actionsHeaderCell}><Text style={styles.columnLabel}>Actions</Text></View>
            </View>

            {/* Rows */}
            <ScrollView style={styles.tableBody} contentContainerStyle={styles.tableBodyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />}>
              {flatList.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="pricetag-outline" size={32} color={colors.text.tertiary} />
                  </View>
                  <Text style={styles.emptyTitle}>No cost codes found</Text>
                  <Text style={styles.emptySubtitle}>{search ? 'Try a different search' : 'Add your first cost code'}</Text>
                </View>
              ) : (
                flatList.map(cc => (
                  <View key={cc.id} style={[styles.row, !cc.active && styles.rowInactive]}>
                    <View style={styles.codeCell}>
                      <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{cc.code}</Text>
                      </View>
                    </View>

                    <View style={styles.nameCell}>
                      <Text style={[styles.nameText, !cc.active && styles.nameTextInactive]} numberOfLines={1}>
                        {cc.name}
                      </Text>
                      {cc.parent_id && (
                        <Text style={styles.parentRef}>
                          ↳ {costCodes.find(p => p.id === cc.parent_id)?.code || 'Parent'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.unitCell}>
                      <Text style={styles.unitText}>{cc.unit_of_measure || 'hours'}</Text>
                    </View>

                    <View style={styles.statusCell}>
                      <View style={[styles.statusBadge, cc.active ? styles.statusActive : styles.statusInactive]}>
                        <View style={[styles.statusDot, cc.active ? styles.statusDotActive : styles.statusDotInactive]} />
                        <Text style={[styles.statusText, cc.active ? styles.statusTextActive : styles.statusTextInactive]}>
                          {cc.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionsCell}>
                      <View style={styles.actionBtns}>
                        <Pressable style={styles.actionBtn} onPress={() => openEditModal(cc)}>
                          <Ionicons name="pencil" size={14} color={colors.text.secondary} />
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={() => handleToggleActive(cc)}>
                          <Ionicons name={cc.active ? 'eye-off' : 'eye'} size={14} color={colors.text.secondary} />
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={() => setConfirmDelete(cc)}>
                          <Ionicons name="trash-outline" size={14} color={colors.semantic.error} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={closeModal}
        title={modalMode === 'add' ? 'Add Cost Code' : 'Edit Cost Code'}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.semantic.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FormField label="Code" required hint="e.g., 02-100 or 03-300">
          <TextInput
            style={styles.input}
            value={formData.code}
            onChangeText={(v) => setFormData({ ...formData, code: v })}
            placeholder="00-000"
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="characters"
          />
        </FormField>

        <FormField label="Name" required>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(v) => setFormData({ ...formData, name: v })}
            placeholder="Site Preparation"
            placeholderTextColor={colors.text.tertiary}
          />
        </FormField>

        <FormField label="Unit of Measure">
          <View style={styles.unitSelector}>
            {UNITS.map(u => (
              <Pressable
                key={u.key}
                style={[styles.unitOption, formData.unit_of_measure === u.key && styles.unitOptionActive]}
                onPress={() => setFormData({ ...formData, unit_of_measure: u.key })}
              >
                <Text style={[styles.unitOptionText, formData.unit_of_measure === u.key && styles.unitOptionTextActive]}>
                  {u.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormField>

        <FormField label="Parent Code" hint="Optional - for grouping under a division">
          <View style={styles.parentSelector}>
            <Pressable
              style={[styles.parentOption, !formData.parent_id && styles.parentOptionActive]}
              onPress={() => setFormData({ ...formData, parent_id: null })}
            >
              <Text style={[styles.parentOptionText, !formData.parent_id && styles.parentOptionTextActive]}>None</Text>
            </Pressable>
            {costCodes.filter(cc => !cc.parent_id && cc.id !== selectedCostCode?.id).slice(0, 10).map(cc => (
              <Pressable
                key={cc.id}
                style={[styles.parentOption, formData.parent_id === cc.id && styles.parentOptionActive]}
                onPress={() => setFormData({ ...formData, parent_id: cc.id })}
              >
                <Text style={[styles.parentOptionText, formData.parent_id === cc.id && styles.parentOptionTextActive]}>
                  {cc.code} - {cc.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormField>

        <FormField label="Display Order" hint="Lower numbers appear first">
          <TextInput
            style={styles.input}
            value={String(formData.display_order)}
            onChangeText={(v) => setFormData({ ...formData, display_order: parseInt(v) || 0 })}
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="number-pad"
          />
        </FormField>

        <View style={styles.modalFooter}>
          <Pressable style={styles.cancelBtn} onPress={closeModal}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{modalMode === 'add' ? 'Create Cost Code' : 'Save Changes'}</Text>
            )}
          </Pressable>
        </View>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Cost Code"
        message={`Are you sure you want to delete "${confirmDelete?.code} - ${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.text.tertiary },

  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  searchContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 200, maxWidth: 300, backgroundColor: colors.neutral.offWhite, borderRadius: 6, paddingHorizontal: 10, height: 36 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.text.primary, outlineStyle: 'none' },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  filterGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { fontSize: 11, fontWeight: '500', color: colors.text.tertiary },
  filterBtns: { flexDirection: 'row', gap: 4 },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: colors.neutral.offWhite },
  filterBtnActive: { backgroundColor: colors.primary.orange },
  filterBtnText: { fontSize: 11, fontWeight: '500', color: colors.text.secondary },
  filterBtnTextActive: { color: '#fff' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary.orange, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  tableContainer: { flex: 1, margin: 16, backgroundColor: colors.neutral.white, borderRadius: 10, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  tableTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  tableCount: { fontSize: 12, color: colors.text.tertiary },

  horizontalScroll: { flex: 1 },
  horizontalScrollContent: { flexGrow: 1 },
  tableInner: { minWidth: 650, flex: 1 },

  columnHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.neutral.offWhite, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  columnLabel: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  codeHeaderCell: { width: 120 },
  nameHeaderCell: { flex: 2, minWidth: 200 },
  unitHeaderCell: { flex: 1, minWidth: 100 },
  statusHeaderCell: { flex: 1, minWidth: 100 },
  actionsHeaderCell: { width: 120 },

  tableBody: { flex: 1 },
  tableBodyContent: { paddingBottom: 16 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  rowInactive: { backgroundColor: colors.neutral.offWhite + '50' },

  codeCell: { width: 120 },
  codeBox: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: colors.primary.orangeSubtle },
  codeText: { fontSize: 12, fontWeight: '700', color: colors.primary.orange, fontFamily: 'monospace' },

  nameCell: { flex: 2, minWidth: 200 },
  nameText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  nameTextInactive: { color: colors.text.tertiary },
  parentRef: { fontSize: 10, color: colors.text.tertiary, marginTop: 2 },

  unitCell: { flex: 1, minWidth: 100 },
  unitText: { fontSize: 12, color: colors.text.secondary, textTransform: 'capitalize' },

  statusCell: { flex: 1, minWidth: 100 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusActive: { backgroundColor: colors.semantic.successLight },
  statusInactive: { backgroundColor: colors.neutral.offWhite },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: colors.semantic.success },
  statusDotInactive: { backgroundColor: colors.text.tertiary },
  statusText: { fontSize: 11, fontWeight: '500' },
  statusTextActive: { color: colors.semantic.success },
  statusTextInactive: { color: colors.text.tertiary },

  actionsCell: { width: 120 },
  actionBtns: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8, borderRadius: 6, backgroundColor: colors.neutral.offWhite },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: colors.text.tertiary },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.semantic.errorLight, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 12, color: colors.semantic.error },

  input: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.text.primary, backgroundColor: colors.neutral.white },

  unitSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border.light, backgroundColor: colors.neutral.white },
  unitOptionActive: { borderColor: colors.primary.orange, backgroundColor: colors.primary.orangeSubtle },
  unitOptionText: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },
  unitOptionTextActive: { color: colors.primary.orange },

  parentSelector: { gap: 6 },
  parentOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border.light, backgroundColor: colors.neutral.white },
  parentOptionActive: { borderColor: colors.primary.orange, backgroundColor: colors.primary.orangeSubtle },
  parentOptionText: { fontSize: 12, color: colors.text.secondary },
  parentOptionTextActive: { color: colors.primary.orange, fontWeight: '500' },

  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border.light, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border.medium },
  cancelBtnText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, backgroundColor: colors.primary.orange },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
