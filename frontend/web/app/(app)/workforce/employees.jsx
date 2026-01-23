import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { 
  getAllUsers, 
  getUser, 
  createUser, 
  updateUser, 
  deleteUser, 
  activateUser,
  getUserProfile 
} from '../../../utils/api';
import { colors, shadows } from '../../../constants/theme';

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'foreman', label: 'Foreman' },
  { key: 'employee', label: 'Employee' },
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
const FormField = ({ label, required, children }) => (
  <View style={formStyles.field}>
    <Text style={formStyles.label}>
      {label} {required && <Text style={formStyles.required}>*</Text>}
    </Text>
    {children}
  </View>
);

const formStyles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 },
  required: { color: colors.semantic.error },
});

export default function EmployeesPage() {
  const { session } = useSession();
  const params = useLocalSearchParams();
  const token = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add, edit, view
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role_key: 'employee',
    is_active: true,
    can_view_rates: false,
  });

  const fetchEmployees = useCallback(async () => {
    if (!token || !companyId) return;
    try {
      const res = await getAllUsers(token, { company_id: companyId });
      if (res.success) {
        setEmployees(res.data?.users || []);
      } else {
        setError(res.error || 'Failed to load employees');
      }
    } catch (err) {
      setError('Failed to load employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    async function init() {
      if (!token) return;
      const res = await getUserProfile(token);
      if (res.success && res.data?.user?.default_company_id) {
        setCompanyId(res.data.user.default_company_id);
      }
    }
    init();
  }, [token]);

  useEffect(() => {
    if (companyId) fetchEmployees();
  }, [companyId, fetchEmployees]);

  // Handle URL params for quick actions
  useEffect(() => {
    if (params.action === 'add') {
      openAddModal();
    }
  }, [params.action]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  // Filter employees
  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = !search || 
        emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase()) ||
        emp.phone?.includes(search);
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && emp.is_active) ||
        (statusFilter === 'inactive' && !emp.is_active);
      
      const matchesRole = roleFilter === 'all' || emp.role_key === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, search, statusFilter, roleFilter]);

  // Modal handlers
  const openAddModal = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role_key: 'employee',
      is_active: true,
      can_view_rates: false,
    });
    setModalMode('add');
    setSelectedEmployee(null);
    setModalVisible(true);
  };

  const openEditModal = (emp) => {
    setFormData({
      email: emp.email || '',
      password: '',
      full_name: emp.full_name || '',
      phone: emp.phone || '',
      role_key: emp.role_key || 'employee',
      is_active: emp.is_active,
      can_view_rates: emp.can_view_rates || false,
    });
    setModalMode('edit');
    setSelectedEmployee(emp);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedEmployee(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      if (modalMode === 'add') {
        if (!formData.email || !formData.password) {
          setError('Email and password are required');
          setSaving(false);
          return;
        }
        const res = await createUser(token, {
          ...formData,
          company_id: companyId,
        });
        if (!res.success) {
          setError(res.error || 'Failed to create employee');
          setSaving(false);
          return;
        }
      } else {
        const updates = { ...formData };
        delete updates.password; // Don't send password on update unless changed
        delete updates.email; // Email can't be changed
        
        const res = await updateUser(token, selectedEmployee.id, updates);
        if (!res.success) {
          setError(res.error || 'Failed to update employee');
          setSaving(false);
          return;
        }
      }
      
      closeModal();
      fetchEmployees();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (emp) => {
    try {
      if (emp.is_active) {
        await deleteUser(token, emp.id); // Soft delete
      } else {
        await activateUser(token, emp.id);
      }
      fetchEmployees();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading employees...</Text>
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
            placeholder="Search employees..."
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

          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Role:</Text>
            <View style={styles.filterBtns}>
              <Pressable
                style={[styles.filterBtn, roleFilter === 'all' && styles.filterBtnActive]}
                onPress={() => setRoleFilter('all')}
              >
                <Text style={[styles.filterBtnText, roleFilter === 'all' && styles.filterBtnTextActive]}>All</Text>
              </Pressable>
              {ROLES.map(r => (
                <Pressable
                  key={r.key}
                  style={[styles.filterBtn, roleFilter === r.key && styles.filterBtnActive]}
                  onPress={() => setRoleFilter(r.key)}
                >
                  <Text style={[styles.filterBtnText, roleFilter === r.key && styles.filterBtnTextActive]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add Employee</Text>
        </Pressable>
      </View>

      {/* Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Employees</Text>
          <Text style={styles.tableCount}>{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
          <View style={styles.tableInner}>
            {/* Column Headers */}
            <View style={styles.columnHeaderRow}>
              <View style={styles.employeeHeaderCell}><Text style={styles.columnLabel}>Employee</Text></View>
              <View style={styles.roleHeaderCell}><Text style={styles.columnLabel}>Role</Text></View>
              <View style={styles.contactHeaderCell}><Text style={styles.columnLabel}>Contact</Text></View>
              <View style={styles.statusHeaderCell}><Text style={styles.columnLabel}>Status</Text></View>
              <View style={styles.actionsHeaderCell}><Text style={styles.columnLabel}>Actions</Text></View>
            </View>

            {/* Rows */}
            <ScrollView style={styles.tableBody} contentContainerStyle={styles.tableBodyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />}>
              {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="people-outline" size={32} color={colors.text.tertiary} />
                  </View>
                  <Text style={styles.emptyTitle}>No employees found</Text>
                  <Text style={styles.emptySubtitle}>{search ? 'Try a different search' : 'Add your first employee'}</Text>
                </View>
              ) : (
                filtered.map(emp => (
                  <View key={emp.id} style={styles.row}>
                    <View style={styles.employeeCell}>
                      <View style={[styles.avatar, !emp.is_active && styles.avatarInactive]}>
                        <Text style={[styles.avatarText, !emp.is_active && styles.avatarTextInactive]}>{getInitials(emp.full_name)}</Text>
                      </View>
                      <View style={styles.employeeDetails}>
                        <Text style={styles.employeeName} numberOfLines={1}>{emp.full_name || 'No name'}</Text>
                        <Text style={styles.employeeEmail} numberOfLines={1}>{emp.email}</Text>
                      </View>
                    </View>

                    <View style={styles.roleCell}>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{emp.role_key || 'None'}</Text>
                      </View>
                    </View>

                    <View style={styles.contactCell}>
                      <Text style={styles.contactText} numberOfLines={1}>{emp.phone || '—'}</Text>
                    </View>

                    <View style={styles.statusCell}>
                      <View style={[styles.statusBadge, emp.is_active ? styles.statusActive : styles.statusInactive]}>
                        <View style={[styles.statusDot, emp.is_active ? styles.statusDotActive : styles.statusDotInactive]} />
                        <Text style={[styles.statusText, emp.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionsCell}>
                      <View style={styles.actionBtns}>
                        <Pressable style={styles.actionBtn} onPress={() => openEditModal(emp)}>
                          <Ionicons name="pencil" size={14} color={colors.text.secondary} />
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={() => handleToggleActive(emp)}>
                          <Ionicons name={emp.is_active ? 'eye-off' : 'eye'} size={14} color={colors.text.secondary} />
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
        title={modalMode === 'add' ? 'Add Employee' : 'Edit Employee'}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.semantic.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <FormField label="Full Name" required>
          <TextInput
            style={styles.input}
            value={formData.full_name}
            onChangeText={(v) => setFormData({ ...formData, full_name: v })}
            placeholder="John Smith"
            placeholderTextColor={colors.text.tertiary}
          />
        </FormField>

        <FormField label="Email" required>
          <TextInput
            style={[styles.input, modalMode === 'edit' && styles.inputDisabled]}
            value={formData.email}
            onChangeText={(v) => setFormData({ ...formData, email: v })}
            placeholder="john@company.com"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={modalMode === 'add'}
          />
        </FormField>

        {modalMode === 'add' && (
          <FormField label="Password" required>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(v) => setFormData({ ...formData, password: v })}
              placeholder="••••••••"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry
            />
          </FormField>
        )}

        <FormField label="Phone">
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(v) => setFormData({ ...formData, phone: v })}
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="phone-pad"
          />
        </FormField>

        <FormField label="Role" required>
          <View style={styles.roleSelector}>
            {ROLES.map(r => (
              <Pressable
                key={r.key}
                style={[styles.roleOption, formData.role_key === r.key && styles.roleOptionActive]}
                onPress={() => setFormData({ ...formData, role_key: r.key })}
              >
                <Text style={[styles.roleOptionText, formData.role_key === r.key && styles.roleOptionTextActive]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormField>

        <View style={styles.checkboxRow}>
          <Pressable
            style={styles.checkbox}
            onPress={() => setFormData({ ...formData, can_view_rates: !formData.can_view_rates })}
          >
            <Ionicons
              name={formData.can_view_rates ? 'checkbox' : 'square-outline'}
              size={20}
              color={formData.can_view_rates ? colors.primary.orange : colors.text.tertiary}
            />
            <Text style={styles.checkboxLabel}>Can view pay rates</Text>
          </Pressable>
        </View>

        <View style={styles.modalFooter}>
          <Pressable style={styles.cancelBtn} onPress={closeModal}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{modalMode === 'add' ? 'Create Employee' : 'Save Changes'}</Text>
            )}
          </Pressable>
        </View>
      </Modal>
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
  tableInner: { minWidth: 700, flex: 1 },

  columnHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.neutral.offWhite, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  columnLabel: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  employeeHeaderCell: { flex: 2, minWidth: 200 },
  roleHeaderCell: { flex: 1, minWidth: 100 },
  contactHeaderCell: { flex: 1, minWidth: 120 },
  statusHeaderCell: { flex: 1, minWidth: 100 },
  actionsHeaderCell: { width: 100 },

  tableBody: { flex: 1 },
  tableBodyContent: { paddingBottom: 16 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },

  employeeCell: { flex: 2, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary.orangeSubtle, alignItems: 'center', justifyContent: 'center' },
  avatarInactive: { backgroundColor: colors.neutral.offWhite },
  avatarText: { fontSize: 12, fontWeight: '600', color: colors.primary.orange },
  avatarTextInactive: { color: colors.text.tertiary },
  employeeDetails: { flex: 1 },
  employeeName: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  employeeEmail: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },

  roleCell: { flex: 1, minWidth: 100 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: colors.neutral.offWhite },
  roleBadgeText: { fontSize: 11, fontWeight: '500', color: colors.text.secondary, textTransform: 'capitalize' },

  contactCell: { flex: 1, minWidth: 120 },
  contactText: { fontSize: 12, color: colors.text.secondary },

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

  actionsCell: { width: 100 },
  actionBtns: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 8, borderRadius: 6, backgroundColor: colors.neutral.offWhite },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: colors.text.tertiary },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.semantic.errorLight, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 12, color: colors.semantic.error },

  input: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.text.primary, backgroundColor: colors.neutral.white },
  inputDisabled: { backgroundColor: colors.neutral.offWhite, color: colors.text.tertiary },

  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.border.light, backgroundColor: colors.neutral.white },
  roleOptionActive: { borderColor: colors.primary.orange, backgroundColor: colors.primary.orangeSubtle },
  roleOptionText: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },
  roleOptionTextActive: { color: colors.primary.orange },

  checkboxRow: { marginBottom: 16 },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxLabel: { fontSize: 13, color: colors.text.primary },

  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border.light, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border.medium },
  cancelBtnText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, backgroundColor: colors.primary.orange },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});