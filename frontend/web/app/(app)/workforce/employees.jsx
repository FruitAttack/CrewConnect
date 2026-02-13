import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getActiveRoster, updateUser, getUserProfile, createUser, deleteUser, getAllUsers, updateUserEmployment } from '../../../utils/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';

const activeColor = "#10b981";

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatRate(emp) {
  const employment = emp.user_employment?.[0] || {};
  const payType = employment.pay_type;
  const hourlyRate = employment.hourly_rate;
  const salaryAnnual = employment.salary_annual;
  
  if (payType === 'salary' && salaryAnnual) {
    // Format as $XX,XXX/yr
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salaryAnnual);
    return `${formatted}/yr`;
  } else if (hourlyRate) {
    // Format as $XX.XX/hr
    return `$${parseFloat(hourlyRate).toFixed(2)}/hr`;
  }
  return '—';
}

const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'foreman', label: 'Foreman' },
  { key: 'laborer', label: 'Laborer' },
  { key: 'office', label: 'Office' },
];

// Pulsing Dot for active/clocked-in status
const PulsingDot = ({ color = activeColor, size = 10 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.8, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);
  return (
    <View style={{ position: 'absolute', bottom: -1, right: -1, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size - 4, height: size - 4, borderRadius: (size - 4) / 2, backgroundColor: color, opacity: 0.4, transform: [{ scale: pulseAnim }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 2, borderColor: colors.neutral.white }} />
    </View>
  );
};

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
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { width: '90%', maxWidth: 440, maxHeight: '80%', backgroundColor: colors.neutral.white, borderRadius: 12, ...shadows.xl, zIndex: 10000 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  closeBtn: { padding: 4 },
  body: { maxHeight: 400 },
  bodyContent: { padding: 16 },
});

// Form Field
const FormField = ({ label, required, children }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.secondary, marginBottom: 8 }}>
      {label} {required && <Text style={{ color: colors.semantic.error }}>*</Text>}
    </Text>
    {children}
  </View>
);

export default function EmployeesPage() {
  const { session } = useSession();
  const token = session?.access_token;
  const params = useLocalSearchParams();
  const addNew = params?.addNew;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [roster, setRoster] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState(params.status || 'all');
  const [roleFilter, setRoleFilter] = useState(params.role || 'all');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('edit'); // 'edit' | 'add'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '',
    password: '',
    phone: '', 
    role_key: 'laborer', 
    is_active: true, 
    can_view_rates: false,
    pay_type: 'hourly',
    hourly_rate: '',
    salary_annual: '',
  });

  const [sortField, setSortField] = useState('full_name');
  const [sortDirection, setSortDirection] = useState('asc');

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const meRes = await getUserProfile(token);
      const user = meRes?.data?.user;
      const cid = user?.default_company_id;
      setCompanyId(cid);
      setCurrentUser(user);
      if (cid) {
        // Get active roster for clock status
        const rosterRes = await getActiveRoster(token, cid);
        const rosterData = rosterRes?.data?.roster || [];
        setRoster(rosterData);
        
        // Try to get all users (including inactive), fall back to roster if it fails
        let allUsers = [];
        try {
          const usersRes = await getAllUsers(token, { company_id: cid });
          allUsers = usersRes?.data?.users || usersRes?.data || [];
        } catch (err) {
          console.warn('getAllUsers failed, using roster data only:', err);
          // Fall back to extracting users from roster (won't include inactive users)
          allUsers = rosterData.map(r => r.user).filter(Boolean);
        }
        
        // Create a map of clocked-in status from roster
        const clockedInMap = new Map();
        rosterData.forEach(r => {
          if (r.user?.id) {
            clockedInMap.set(r.user.id, { 
              is_clocked_in: r.is_clocked_in,
              role_key: r.user.role_key 
            });
          }
        });
        
        const users = allUsers.map(usr => ({
          ...usr,
          is_clocked_in: clockedInMap.get(usr.id)?.is_clocked_in || false,
          role_key: usr.role_key || clockedInMap.get(usr.id)?.role_key || null,
          // Employment data should come from getAllUsers if backend includes it
          user_employment: usr.user_employment || [],
        }));
        
        setEmployees(users);
      }
    } catch (err) {
      console.error('Error loading employees:', err);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!companyId || !token) return;
    setRefreshing(true);
    try {
      const rosterRes = await getActiveRoster(token, companyId);
      const rosterData = rosterRes?.data?.roster || [];
      setRoster(rosterData);
      
      let allUsers = [];
      try {
        const usersRes = await getAllUsers(token, { company_id: companyId });
        allUsers = usersRes?.data?.users || usersRes?.data || [];
      } catch (err) {
        console.warn('getAllUsers failed, using roster data only');
        allUsers = rosterData.map(r => r.user).filter(Boolean);
      }
      
      const clockedInMap = new Map();
      rosterData.forEach(r => {
        if (r.user?.id) {
          clockedInMap.set(r.user.id, { 
            is_clocked_in: r.is_clocked_in,
            role_key: r.user.role_key 
          });
        }
      });
      
      const users = allUsers.map(usr => ({
        ...usr,
        is_clocked_in: clockedInMap.get(usr.id)?.is_clocked_in || false,
        role_key: usr.role_key || clockedInMap.get(usr.id)?.role_key || null,
      }));
      
      setEmployees(users);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  const statusCounts = useMemo(() => {
    return {
      all: employees.length,
      active: employees.filter(e => e.is_active).length,
      inactive: employees.filter(e => !e.is_active).length,
    };
  }, [employees]);

  const roleCounts = useMemo(() => {
    const counts = { all: employees.length };
    ROLES.forEach(r => {
      counts[r.key] = employees.filter(e => e.role_key === r.key).length;
    });
    return counts;
  }, [employees]);

  const filtered = useMemo(() => {
    let result = employees.filter(emp => {
      const matchesSearch = !search || emp.full_name?.toLowerCase().includes(search.toLowerCase()) || emp.email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && emp.is_active) || (statusFilter === 'inactive' && !emp.is_active);
      const matchesRole = roleFilter === 'all' || emp.role_key === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'full_name':
          aVal = (a.full_name || '').toLowerCase();
          bVal = (b.full_name || '').toLowerCase();
          break;
        case 'role_key':
          aVal = (a.role_key || '').toLowerCase();
          bVal = (b.role_key || '').toLowerCase();
          break;
        case 'phone':
          aVal = (a.phone || '').toLowerCase();
          bVal = (b.phone || '').toLowerCase();
          break;
        case 'hourly_rate':
          aVal = parseFloat(a.hourly_rate) || 0;
          bVal = parseFloat(b.hourly_rate) || 0;
          break;
        case 'is_active':
          aVal = a.is_active ? 1 : 0;
          bVal = b.is_active ? 1 : 0;
          break;
        default:
          aVal = (a.full_name || '').toLowerCase();
          bVal = (b.full_name || '').toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [employees, search, statusFilter, roleFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openEditModal = (emp) => {
    // role_key might be directly on user or nested in user_roles
    const roleKey = emp.role_key || emp.user_roles?.[0]?.role_key || 'laborer';
    // Get employment info
    const employment = emp.user_employment?.[0] || emp.employment || {};
    setFormData({ 
      full_name: emp.full_name || '', 
      email: emp.email || '',
      phone: emp.phone || '', 
      role_key: roleKey, 
      is_active: emp.is_active, 
      can_view_rates: emp.can_view_rates || false,
      pay_type: employment.pay_type || 'hourly',
      hourly_rate: employment.hourly_rate || '',
      salary_annual: employment.salary_annual || '',
    });
    setSelectedEmployee(emp);
    setModalMode('edit');
    setModalVisible(true);
  };

  const openAddModal = () => {
    setFormData({ 
      full_name: '', 
      email: '',
      password: '',
      phone: '', 
      role_key: 'laborer', 
      is_active: true, 
      can_view_rates: false,
      pay_type: 'hourly',
      hourly_rate: '',
      salary_annual: '',
    });
    setSelectedEmployee(null);
    setModalMode('add');
    setModalVisible(true);
  };

  useEffect( () => {
    if(addNew == 'true') {
      openAddModal();
    }
  }, [addNew]);

  const closeModal = () => { setModalVisible(false); setSelectedEmployee(null); setError(null); };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        // Create new employee
        if (!formData.full_name || !formData.email || !formData.password) {
          setError('Name, email, and password are required');
          setSaving(false);
          return;
        }
        const createData = {
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role_key: formData.role_key,
          can_view_rates: formData.can_view_rates,
          company_id: companyId,
        };
        const res = await createUser(token, createData);
        if (!res.success) { setError(res.message || 'Failed to create employee'); setSaving(false); return; }
        
        // Save employment/rate info for new user
        const newUserId = res.data?.user?.id;
        if (newUserId && (formData.hourly_rate || formData.salary_annual)) {
          await updateUserEmployment(token, newUserId, {
            company_id: companyId,
            pay_type: formData.pay_type,
            hourly_rate: formData.pay_type === 'hourly' ? parseFloat(formData.hourly_rate) || null : null,
            salary_annual: formData.pay_type === 'salary' ? parseFloat(formData.salary_annual) || null : null,
          });
        }
      } else {
        // Update existing employee
        const updateData = {
          full_name: formData.full_name,
          phone: formData.phone,
          role_key: formData.role_key,
          can_view_rates: formData.can_view_rates,
        };
        const res = await updateUser(token, selectedEmployee.id, updateData);
        if (!res.success) { setError(res.message || 'Failed to update'); setSaving(false); return; }
        
        // Save employment/rate info
        if (formData.hourly_rate || formData.salary_annual) {
          await updateUserEmployment(token, selectedEmployee.id, {
            company_id: companyId,
            pay_type: formData.pay_type,
            hourly_rate: formData.pay_type === 'hourly' ? parseFloat(formData.hourly_rate) || null : null,
            salary_annual: formData.pay_type === 'salary' ? parseFloat(formData.salary_annual) || null : null,
          });
        }
      }
      closeModal();
      refresh();
    } catch (err) { setError('An error occurred'); }
    finally { setSaving(false); }
  };

  const handleArchive = async (emp) => {
    try { 
      await updateUser(token, emp.id, { is_active: !emp.is_active }); 
      refresh(); 
    }
    catch (err) { setError('Failed to update status'); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      // Use hard delete since we only allow deleting archived employees
      const res = await deleteUser(token, confirmDelete.id, true);
      if (!res.success) {
        setError(res.message || 'Failed to delete employee');
        setConfirmDelete(null);
        return;
      }
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      setError('Failed to delete employee');
      setConfirmDelete(null);
    }
  };

  // Check if current user can view rates
  const canViewRates = currentUser?.can_view_rates || currentUser?.role_key === 'admin';

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary.orange} /><Text style={styles.loadingText}>Loading employees...</Text></View>;

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <Ionicons name="search" size={16} color={searchFocused ? colors.primary.orange : colors.text.tertiary} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search employees..." 
              placeholderTextColor={colors.text.tertiary} 
              value={search} 
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search.length > 0 && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.text.tertiary} /></Pressable>}
          </View>
          
          {/* Status Toggle */}
          <View style={styles.viewToggle}>
            {['all', 'active', 'inactive'].map(s => (
              <Pressable key={s} style={[styles.viewBtn, statusFilter === s && styles.viewBtnActive]} onPress={() => setStatusFilter(s)}>
                <Text style={[styles.viewBtnCount, statusFilter === s && styles.viewBtnCountActive]}>{statusCounts[s]}</Text>
                <Text style={[styles.viewText, statusFilter === s && styles.viewTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </Pressable>
            ))}
          </View>

          {/* Role Filter */}
          <View style={styles.viewToggle}>
            <Pressable style={[styles.viewBtn, roleFilter === 'all' && styles.viewBtnActive]} onPress={() => setRoleFilter('all')}>
              <Text style={[styles.viewBtnCount, roleFilter === 'all' && styles.viewBtnCountActive]}>{roleCounts.all}</Text>
              <Text style={[styles.viewText, roleFilter === 'all' && styles.viewTextActive]}>All Roles</Text>
            </Pressable>
            {ROLES.map(r => (
              <Pressable key={r.key} style={[styles.viewBtn, roleFilter === r.key && styles.viewBtnActive]} onPress={() => setRoleFilter(r.key)}>
                <Text style={[styles.viewBtnCount, roleFilter === r.key && styles.viewBtnCountActive]}>{roleCounts[r.key]}</Text>
                <Text style={[styles.viewText, roleFilter === r.key && styles.viewTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        
        <View style={styles.toolbarRight}>
          <Pressable style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Employee</Text>
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
          <Text style={styles.tableTitle}>Employees</Text>
          <Text style={styles.employeeCount}>{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Column Headers */}
        <View style={styles.columnHeaderRow}>
          <Pressable style={{ flex: 2, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('full_name')}>
            <Text style={styles.columnLabel}>Employee</Text>
            {sortField === 'full_name' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <Pressable style={{ flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('role_key')}>
            <Text style={styles.columnLabel}>Role</Text>
            {sortField === 'role_key' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <Pressable style={{ flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('phone')}>
            <Text style={styles.columnLabel}>Contact</Text>
            {sortField === 'phone' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          {canViewRates && (
            <Pressable style={{ width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('hourly_rate')}>
              <Text style={styles.columnLabel}>Rate</Text>
              {sortField === 'hourly_rate' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
            </Pressable>
          )}
          <Pressable style={{ flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('is_active')}>
            <Text style={styles.columnLabel}>Status</Text>
            {sortField === 'is_active' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <View style={{ width: 120 }}><Text style={styles.columnLabel}>Actions</Text></View>
        </View>

        <ScrollView style={styles.tableBody} contentContainerStyle={styles.tableBodyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary.orange} />}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Ionicons name="people-outline" size={32} color={colors.text.tertiary} /></View>
              <Text style={styles.emptyTitle}>No employees found</Text>
              <Text style={styles.emptySubtitle}>{search ? 'Try a different search' : 'No employees in this view'}</Text>
            </View>
          ) : (
            filtered.map(emp => (
              <Pressable key={emp.id} style={({ hovered }) => [styles.row, hovered && styles.rowHovered]}>
                <View style={{ flex: 2, minWidth: 200, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(emp.full_name)}</Text>
                    {emp.is_clocked_in && <PulsingDot color={activeColor} size={10} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.employeeName} numberOfLines={1}>{emp.full_name || 'No name'}</Text>
                    <Text style={styles.employeeEmail} numberOfLines={1}>{emp.email}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 100 }}>
                  <Text style={styles.roleText}>{emp.role_key || '—'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 120 }}>
                  <Text style={styles.contactText}>{emp.phone || '—'}</Text>
                </View>
                {canViewRates && (
                  <View style={{ width: 110 }}>
                    <Text style={styles.rateText}>{formatRate(emp)}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 80 }}>
                  <Text style={[styles.statusText, emp.is_active ? styles.statusActive : styles.statusInactive]}>
                    {emp.is_active ? 'Active' : 'Archived'}
                  </Text>
                </View>
                <View style={{ width: 120, flexDirection: 'row', gap: 4 }}>
                  <Pressable style={({ hovered }) => [styles.actionBtn, hovered && styles.actionBtnHovered]} onPress={() => openEditModal(emp)}>
                    <Ionicons name="pencil" size={14} color={colors.text.secondary} />
                  </Pressable>
                  <Pressable style={({ hovered }) => [styles.actionBtn, hovered && styles.actionBtnHovered]} onPress={() => handleArchive(emp)}>
                    <Ionicons name={emp.is_active ? 'archive-outline' : 'refresh-outline'} size={14} color={emp.is_active ? colors.text.secondary : colors.semantic.success} />
                  </Pressable>
                  {!emp.is_active && (
                    <Pressable style={({ hovered }) => [styles.actionBtn, styles.deleteBtn, hovered && styles.deleteBtnHovered]} onPress={() => setConfirmDelete(emp)}>
                      <Ionicons name="trash-outline" size={14} color={colors.semantic.error} />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      {/* Edit/Add Modal */}
      <Modal visible={modalVisible} onClose={closeModal} title={modalMode === 'add' ? 'Add Employee' : 'Edit Employee'}>
        {error && (
          <View style={styles.modalError}>
            <Ionicons name="alert-circle" size={16} color={colors.semantic.error} />
            <Text style={styles.modalErrorText}>{error}</Text>
          </View>
        )}
        <FormField label="Full Name" required>
          <TextInput style={styles.input} value={formData.full_name} onChangeText={v => setFormData({...formData, full_name: v})} placeholder="John Smith" placeholderTextColor={colors.text.tertiary} />
        </FormField>
        {modalMode === 'add' && (
          <FormField label="Email" required>
            <TextInput style={styles.input} value={formData.email} onChangeText={v => setFormData({...formData, email: v})} placeholder="john@example.com" placeholderTextColor={colors.text.tertiary} keyboardType="email-address" autoCapitalize="none" />
          </FormField>
        )}
        {modalMode === 'add' && (
          <FormField label="Password" required>
            <TextInput style={styles.input} value={formData.password} onChangeText={v => setFormData({...formData, password: v})} placeholder="Temporary password" placeholderTextColor={colors.text.tertiary} secureTextEntry />
          </FormField>
        )}
        <FormField label="Phone">
          <TextInput style={styles.input} value={formData.phone} onChangeText={v => setFormData({...formData, phone: v})} placeholder="(555) 123-4567" placeholderTextColor={colors.text.tertiary} />
        </FormField>
        <FormField label="Role" required>
          <View style={styles.roleSelector}>
            {ROLES.map(r => (
              <Pressable key={r.key} style={[styles.roleOption, formData.role_key === r.key && styles.roleOptionActive]} onPress={() => setFormData({...formData, role_key: r.key})}>
                <Text style={[styles.roleOptionText, formData.role_key === r.key && styles.roleOptionTextActive]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </FormField>
        {canViewRates && (
          <FormField label="Pay Type">
            <View style={styles.payTypeToggle}>
              <Pressable 
                style={[styles.payTypeOption, formData.pay_type === 'hourly' && styles.payTypeOptionActive]} 
                onPress={() => setFormData({...formData, pay_type: 'hourly'})}
              >
                <Text style={[styles.payTypeText, formData.pay_type === 'hourly' && styles.payTypeTextActive]}>Hourly</Text>
              </Pressable>
              <Pressable 
                style={[styles.payTypeOption, formData.pay_type === 'salary' && styles.payTypeOptionActive]} 
                onPress={() => setFormData({...formData, pay_type: 'salary'})}
              >
                <Text style={[styles.payTypeText, formData.pay_type === 'salary' && styles.payTypeTextActive]}>Salary</Text>
              </Pressable>
            </View>
          </FormField>
        )}
        {canViewRates && formData.pay_type === 'hourly' && (
          <FormField label="Hourly Rate">
            <View style={styles.rateInputContainer}>
              <Text style={styles.ratePrefix}>$</Text>
              <TextInput 
                style={[styles.input, styles.rateInput]} 
                value={formData.hourly_rate?.toString() || ''} 
                onChangeText={v => setFormData({...formData, hourly_rate: v})} 
                placeholder="0.00" 
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.rateSuffix}>/hr</Text>
            </View>
          </FormField>
        )}
        {canViewRates && formData.pay_type === 'salary' && (
          <FormField label="Annual Salary">
            <View style={styles.rateInputContainer}>
              <Text style={styles.ratePrefix}>$</Text>
              <TextInput 
                style={[styles.input, styles.rateInput]} 
                value={formData.salary_annual?.toString() || ''} 
                onChangeText={v => setFormData({...formData, salary_annual: v})} 
                placeholder="50,000" 
                placeholderTextColor={colors.text.tertiary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.rateSuffix}>/yr</Text>
            </View>
          </FormField>
        )}
        <Pressable style={styles.checkboxRow} onPress={() => setFormData({...formData, can_view_rates: !formData.can_view_rates})}>
          <Ionicons name={formData.can_view_rates ? 'checkbox' : 'square-outline'} size={20} color={formData.can_view_rates ? colors.primary.orange : colors.text.tertiary} />
          <Text style={styles.checkboxLabel}>Can view pay rates</Text>
        </Pressable>
        <View style={styles.modalFooter}>
          <Pressable style={styles.cancelBtn} onPress={closeModal}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{modalMode === 'add' ? 'Add Employee' : 'Save Changes'}</Text>}
          </Pressable>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Employee">
        <View style={styles.confirmContent}>
          <View style={styles.confirmIcon}>
            <Ionicons name="warning" size={32} color={colors.semantic.error} />
          </View>
          <Text style={styles.confirmTitle}>Are you sure?</Text>
          <Text style={styles.confirmText}>
            This will permanently delete <Text style={{ fontWeight: '600' }}>{confirmDelete?.full_name || confirmDelete?.email}</Text>. This action cannot be undone.
          </Text>
        </View>
        <View style={styles.modalFooter}>
          <Pressable style={styles.cancelBtn} onPress={() => setConfirmDelete(null)}><Text style={styles.cancelBtnText}>Cancel</Text></Pressable>
          <Pressable style={styles.deleteConfirmBtn} onPress={handleDelete}>
            <Text style={styles.deleteConfirmBtnText}>Delete Employee</Text>
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

  // Toolbar - matches timecards
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 16, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  // Add button
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary.orange, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  
  // Search - matches timecards
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.neutral.offWhite, borderRadius: 6, paddingHorizontal: 10, height: 34, minWidth: 200, maxWidth: 280, borderWidth: 1, borderColor: 'transparent' },
  searchContainerFocused: { borderColor: colors.primary.orange, backgroundColor: colors.neutral.white },
  searchInput: { flex: 1, fontSize: 13, color: colors.text.primary, outlineStyle: 'none' },

  // Toggle buttons - matches timecards
  viewToggle: { flexDirection: 'row', backgroundColor: colors.neutral.offWhite, borderRadius: 6, padding: 2 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 },
  viewBtnActive: { backgroundColor: colors.neutral.white, ...shadows.sm },
  viewText: { fontSize: 12, fontWeight: '500', color: colors.text.tertiary },
  viewTextActive: { color: colors.text.primary },
  viewBtnCount: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary, minWidth: 16, textAlign: 'center' },
  viewBtnCountActive: { color: colors.primary.orange },

  // Error - matches timecards
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.semantic.errorLight, padding: 12, borderRadius: 8, marginHorizontal: 16, marginTop: 12 },
  errorText: { flex: 1, color: colors.semantic.error, fontSize: 13 },

  // Table - matches timecards
  tableContainer: { flex: 1, marginHorizontal: 16, marginTop: 12, marginBottom: 16, backgroundColor: colors.neutral.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  tableTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  employeeCount: { fontSize: 12, color: colors.text.tertiary },

  columnHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.neutral.offWhite, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  columnLabel: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },

  tableBody: { flex: 1 },
  tableBodyContent: { paddingBottom: 16 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  rowHovered: { backgroundColor: colors.neutral.offWhite },

  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary.orangeSubtle, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarText: { fontSize: 11, fontWeight: '600', color: colors.primary.orange },
  employeeName: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  employeeEmail: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },

  roleText: { fontSize: 12, color: colors.text.secondary, textTransform: 'capitalize' },
  contactText: { fontSize: 12, color: colors.text.secondary },
  rateText: { fontSize: 12, fontWeight: '500', color: colors.text.primary },
  
  // Status text without bubble
  statusText: { fontSize: 12, fontWeight: '500' },
  statusActive: { color: activeColor },
  statusInactive: { color: colors.text.tertiary },

  actionBtn: { padding: 6, borderRadius: 4 },
  actionBtnHovered: { backgroundColor: colors.neutral.offWhite },
  deleteBtn: { },
  deleteBtnHovered: { backgroundColor: colors.semantic.error + '15' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: colors.text.tertiary },

  // Modal form
  modalError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.semantic.error + '15', padding: 12, borderRadius: 8, marginBottom: 16 },
  modalErrorText: { fontSize: 13, color: colors.semantic.error, flex: 1 },
  input: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text.primary, backgroundColor: colors.neutral.white },
  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: colors.neutral.offWhite },
  roleOptionActive: { backgroundColor: colors.primary.orange },
  roleOptionText: { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
  roleOptionTextActive: { color: '#fff' },
  
  // Rate input
  rateInputContainer: { flexDirection: 'row', alignItems: 'center' },
  ratePrefix: { fontSize: 14, color: colors.text.secondary, marginRight: 4, fontWeight: '500' },
  rateInput: { flex: 1 },
  rateSuffix: { fontSize: 13, color: colors.text.tertiary, marginLeft: 8 },
  
  // Pay type toggle
  payTypeToggle: { flexDirection: 'row', gap: 8 },
  payTypeOption: { flex: 1, paddingVertical: 10, borderRadius: 6, backgroundColor: colors.neutral.offWhite, alignItems: 'center' },
  payTypeOptionActive: { backgroundColor: colors.primary.orange },
  payTypeText: { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
  payTypeTextActive: { color: '#fff' },
  
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  checkboxLabel: { fontSize: 14, color: colors.text.primary },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border.light, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border.medium },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, backgroundColor: colors.primary.orange },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  
  // Delete confirmation
  confirmContent: { alignItems: 'center', paddingVertical: 16 },
  confirmIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.semantic.error + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary, marginBottom: 8 },
  confirmText: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 },
  deleteConfirmBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, backgroundColor: colors.semantic.error },
  deleteConfirmBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});