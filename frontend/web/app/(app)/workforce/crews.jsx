import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../../utils/ctx';
import { getUserProfile, getAllUsers, getCrews, createCrew, updateCrew, deleteCrew } from '../../../utils/api';
import { colors, shadows } from '../../../constants/theme';

const activeColor = "#10b981";

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Modal ──────────────────────────────────────────────────────
const Modal = ({ visible, onClose, title, children, wide }) => {
  if (!visible) return null;
  return (
    <View style={modalStyles.overlay}>
      <Pressable style={modalStyles.backdrop} onPress={onClose} />
      <View style={[modalStyles.container, wide && { maxWidth: 600 }]}>
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
  container: { width: '90%', maxWidth: 440, maxHeight: '85%', backgroundColor: colors.neutral.white, borderRadius: 12, ...shadows.xl, zIndex: 10000 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  closeBtn: { padding: 4 },
  body: { maxHeight: 500 },
  bodyContent: { padding: 16 },
});

// ─── Form Field ─────────────────────────────────────────────────
const FormField = ({ label, required, children }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.secondary, marginBottom: 8 }}>
      {label} {required && <Text style={{ color: colors.semantic.error }}>*</Text>}
    </Text>
    {children}
  </View>
);

// ─── Search Dropdown (single select) ────────────────────────────
const SearchDropdown = ({ options, selectedId, onSelect, placeholder, emptyText }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const selected = options.find(o => o.id === selectedId);
  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.full_name?.toLowerCase().includes(q) || o.email?.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (id) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <View>
      <Pressable
        style={({ hovered }) => [
          dropdownStyles.trigger,
          hovered && { borderColor: colors.border.medium },
          open && { borderColor: colors.primary.orange },
        ]}
        onPress={() => setOpen(!open)}
      >
        {selected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={styles.miniAvatar}>
              <Text style={styles.miniAvatarText}>{getInitials(selected.full_name)}</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.text.primary, flex: 1 }} numberOfLines={1}>{selected.full_name}</Text>
            <Pressable onPress={(e) => { e.stopPropagation(); onSelect(''); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
            </Pressable>
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: colors.text.tertiary, flex: 1 }}>{placeholder || 'Select...'}</Text>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.text.tertiary} />
      </Pressable>
      {open && (
        <View style={dropdownStyles.listContainer}>
          <View style={[dropdownStyles.searchRow, focused && { borderColor: colors.primary.orange }]}>
            <Ionicons name="search" size={14} color={focused ? colors.primary.orange : colors.text.tertiary} />
            <TextInput
              style={dropdownStyles.searchInput}
              placeholder="Search..."
              placeholderTextColor={colors.text.tertiary}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
            />
          </View>
          <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{emptyText || 'No results'}</Text>
              </View>
            ) : (
              filtered.map(emp => (
                <Pressable
                  key={emp.id}
                  style={({ hovered }) => [
                    dropdownStyles.option,
                    hovered && { backgroundColor: colors.neutral.offWhite },
                    emp.id === selectedId && { backgroundColor: colors.primary.orangeSubtle },
                  ]}
                  onPress={() => handleSelect(emp.id)}
                >
                  <View style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarText}>{getInitials(emp.full_name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary }} numberOfLines={1}>{emp.full_name}</Text>
                    <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{emp.role_key || '—'}</Text>
                  </View>
                  {emp.id === selectedId && <Ionicons name="checkmark" size={16} color={colors.primary.orange} />}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const dropdownStyles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.neutral.white },
  listContainer: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, marginTop: 4, backgroundColor: colors.neutral.white, overflow: 'hidden', ...shadows.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 36, borderBottomWidth: 1, borderBottomColor: colors.border.light, borderWidth: 1, borderColor: 'transparent', margin: 6, borderRadius: 6, backgroundColor: colors.neutral.offWhite },
  searchInput: { flex: 1, fontSize: 12, color: colors.text.primary, outlineStyle: 'none' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
});

// ─── Member Picker (multi-select with chips) ────────────────────
const MemberPicker = ({ employees, selectedIds, onToggle, foremanId }) => {
  const [open, setOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [focused, setFocused] = useState(false);

  const available = useMemo(() => {
    return employees
      .filter(e => e.is_active && e.id !== foremanId)
      .filter(e => !memberSearch || e.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) || e.email?.toLowerCase().includes(memberSearch.toLowerCase()));
  }, [employees, memberSearch, foremanId]);

  const selectedEmployees = employees.filter(e => selectedIds.includes(e.id));

  return (
    <View>
      {/* Trigger */}
      <Pressable
        style={({ hovered }) => [
          dropdownStyles.trigger,
          hovered && { borderColor: colors.border.medium },
          open && { borderColor: colors.primary.orange },
          { minHeight: 42 },
        ]}
        onPress={() => setOpen(!open)}
      >
        {selectedIds.length === 0 ? (
          <Text style={{ fontSize: 13, color: colors.text.tertiary, flex: 1 }}>Select members...</Text>
        ) : (
          <Text style={{ fontSize: 13, color: colors.text.primary, flex: 1 }}>{selectedIds.length} member{selectedIds.length !== 1 ? 's' : ''} selected</Text>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.text.tertiary} />
      </Pressable>

      {/* Selected chips */}
      {selectedEmployees.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {selectedEmployees.map(emp => (
            <View key={emp.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary.orangeSubtle, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary.orange }}>{emp.full_name}</Text>
              <Pressable onPress={() => onToggle(emp.id)} hitSlop={4}>
                <Ionicons name="close" size={12} color={colors.primary.orange} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Dropdown list */}
      {open && (
        <View style={[dropdownStyles.listContainer, { marginTop: 4 }]}>
          <View style={[dropdownStyles.searchRow, focused && { borderColor: colors.primary.orange }]}>
            <Ionicons name="search" size={14} color={focused ? colors.primary.orange : colors.text.tertiary} />
            <TextInput
              style={dropdownStyles.searchInput}
              placeholder="Search employees..."
              placeholderTextColor={colors.text.tertiary}
              value={memberSearch}
              onChangeText={setMemberSearch}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
            />
            {memberSearch.length > 0 && (
              <Pressable onPress={() => setMemberSearch('')}>
                <Ionicons name="close-circle" size={14} color={colors.text.tertiary} />
              </Pressable>
            )}
          </View>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {available.length === 0 ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: colors.text.tertiary }}>No employees found</Text>
              </View>
            ) : (
              available.map(emp => {
                const selected = selectedIds.includes(emp.id);
                return (
                  <Pressable
                    key={emp.id}
                    style={({ hovered }) => [
                      dropdownStyles.option,
                      hovered && { backgroundColor: colors.neutral.offWhite },
                      selected && { backgroundColor: colors.primary.orangeSubtle },
                    ]}
                    onPress={() => onToggle(emp.id)}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={selected ? colors.primary.orange : colors.text.tertiary}
                    />
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarText}>{getInitials(emp.full_name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text.primary }} numberOfLines={1}>{emp.full_name || 'No name'}</Text>
                      <Text style={{ fontSize: 11, color: colors.text.tertiary }}>{emp.role_key || '—'}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─── Main Page ──────────────────────────────────────────────────
export default function CrewsPage() {
  const { session } = useSession();
  const token = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [crews, setCrews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedCrew, setSelectedCrew] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedCrew, setExpandedCrew] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    foreman_id: '',
    description: '',
    member_ids: [],
  });

  // Sort
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // ─── Load ───────────────────────────────────────────────────
  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const meRes = await getUserProfile(token);
      const user = meRes?.data?.user;
      const cid = user?.default_company_id;
      setCompanyId(cid);
      if (cid) {
        const [crewsRes, usersRes] = await Promise.all([
          getCrews(token, cid),
          getAllUsers(token, { company_id: cid }),
        ]);
        setCrews(crewsRes?.data?.crews || []);
        const allUsers = usersRes?.data?.users || usersRes?.data || [];
        setEmployees(allUsers);
      }
    } catch (err) {
      console.error('Error loading crews:', err);
      setError('Failed to load crews');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!companyId || !token) return;
    setRefreshing(true);
    try {
      const [crewsRes, usersRes] = await Promise.all([
        getCrews(token, companyId),
        getAllUsers(token, { company_id: companyId }),
      ]);
      setCrews(crewsRes?.data?.crews || []);
      const allUsers = usersRes?.data?.users || usersRes?.data || [];
      setEmployees(allUsers);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  // ─── Filters & Sort ─────────────────────────────────────────
  const statusCounts = useMemo(() => ({
    all: crews.length,
    active: crews.filter(c => c.active).length,
    inactive: crews.filter(c => !c.active).length,
  }), [crews]);

  const filtered = useMemo(() => {
    let result = crews.filter(c => {
      const matchesSearch = !search
        || c.name?.toLowerCase().includes(search.toLowerCase())
        || c.foreman?.full_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && c.active)
        || (statusFilter === 'inactive' && !c.active);
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'foreman':
          aVal = (a.foreman?.full_name || '').toLowerCase();
          bVal = (b.foreman?.full_name || '').toLowerCase();
          break;
        case 'members':
          aVal = a.crew_members?.length || 0;
          bVal = b.crew_members?.length || 0;
          break;
        case 'active':
          aVal = a.active ? 1 : 0;
          bVal = b.active ? 1 : 0;
          break;
        default:
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [crews, search, statusFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ─── Foreman options ────────────────────────────────────────
  const foremanOptions = useMemo(() => {
    return employees.filter(e =>
      e.is_active && ['foreman', 'supervisor', 'admin'].includes(e.role_key)
    );
  }, [employees]);

  // ─── Modal handlers ─────────────────────────────────────────
  const openAddModal = () => {
    setFormData({ name: '', foreman_id: '', description: '', member_ids: [] });
    setSelectedCrew(null);
    setModalMode('add');
    setModalVisible(true);
    setError(null);
  };

  const openEditModal = (crew) => {
    setFormData({
      name: crew.name || '',
      foreman_id: crew.foreman_id || '',
      description: crew.description || '',
      member_ids: (crew.crew_members || []).map(m => m.user?.id || m.user_id).filter(Boolean),
    });
    setSelectedCrew(crew);
    setModalMode('edit');
    setModalVisible(true);
    setError(null);
  };

  const closeModal = () => { setModalVisible(false); setSelectedCrew(null); setError(null); };

  const toggleMember = (userId) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId],
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { setError('Crew name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        const res = await createCrew(token, {
          company_id: companyId,
          name: formData.name.trim(),
          foreman_id: formData.foreman_id || null,
          description: formData.description.trim() || null,
          member_ids: formData.member_ids,
        });
        if (!res.success) { setError(res.message || 'Failed to create crew'); setSaving(false); return; }
      } else {
        const res = await updateCrew(token, selectedCrew.id, {
          name: formData.name.trim(),
          foreman_id: formData.foreman_id || null,
          description: formData.description.trim() || null,
          member_ids: formData.member_ids,
        });
        if (!res.success) { setError(res.message || 'Failed to update crew'); setSaving(false); return; }
      }
      closeModal();
      refresh();
    } catch (err) { setError('An error occurred'); }
    finally { setSaving(false); }
  };

  const handleArchive = async (crew) => {
    try {
      await updateCrew(token, crew.id, { active: !crew.active });
      refresh();
    } catch (err) { setError('Failed to update status'); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await deleteCrew(token, confirmDelete.id);
      if (!res.success) { setError(res.message || 'Failed to delete crew'); setConfirmDelete(null); return; }
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      setError('Failed to delete crew');
      setConfirmDelete(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading crews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <Ionicons name="search" size={16} color={searchFocused ? colors.primary.orange : colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search crews..."
              placeholderTextColor={colors.text.tertiary}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
              </Pressable>
            )}
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
        </View>

        <View style={styles.toolbarRight}>
          <Pressable style={styles.addBtn} onPress={openAddModal}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Crew</Text>
          </Pressable>
        </View>
      </View>

      {/* Error Banner */}
      {error && !modalVisible && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}><Ionicons name="close" size={16} color={colors.semantic.error} /></Pressable>
        </View>
      )}

      {/* Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Crews</Text>
          <Text style={styles.crewCount}>{filtered.length} crew{filtered.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Column Headers */}
        <View style={styles.columnHeaderRow}>
          <Pressable style={{ flex: 2, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('name')}>
            <Text style={styles.columnLabel}>Crew</Text>
            {sortField === 'name' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <Pressable style={{ flex: 1.5, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('foreman')}>
            <Text style={styles.columnLabel}>Foreman</Text>
            {sortField === 'foreman' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
          </Pressable>
          <Pressable style={{ flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleSort('members')}>
            <Text style={styles.columnLabel}>Members</Text>
            {sortField === 'members' && <Ionicons name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />}
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
              <View style={styles.emptyIcon}><Ionicons name="people-circle-outline" size={32} color={colors.text.tertiary} /></View>
              <Text style={styles.emptyTitle}>No crews found</Text>
              <Text style={styles.emptySubtitle}>{search ? 'Try a different search' : 'Create your first crew to get started'}</Text>
            </View>
          ) : (
            filtered.map(crew => {
              const members = crew.crew_members || [];
              const isExpanded = expandedCrew === crew.id;
              return (
                <View key={crew.id}>
                  <Pressable
                    style={({ hovered }) => [styles.row, hovered && styles.rowHovered]}
                    onPress={() => setExpandedCrew(isExpanded ? null : crew.id)}
                  >
                    {/* Crew name + description */}
                    <View style={{ flex: 2, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={styles.crewIcon}>
                        <Ionicons name="people" size={16} color={colors.primary.orange} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.crewName} numberOfLines={1}>{crew.name}</Text>
                        {crew.description ? (
                          <Text style={styles.crewDescription} numberOfLines={1}>{crew.description}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Foreman */}
                    <View style={{ flex: 1.5, minWidth: 160, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {crew.foreman ? (
                        <>
                          <View style={styles.miniAvatar}>
                            <Text style={styles.miniAvatarText}>{getInitials(crew.foreman.full_name)}</Text>
                          </View>
                          <Text style={styles.foremanName} numberOfLines={1}>{crew.foreman.full_name}</Text>
                        </>
                      ) : (
                        <Text style={styles.unassignedText}>Unassigned</Text>
                      )}
                    </View>

                    {/* Member count + stacked avatars */}
                    <View style={{ flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.avatarStack}>
                        {members.slice(0, 3).map((m, i) => (
                          <View key={m.id} style={[styles.stackedAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}>
                            <Text style={styles.stackedAvatarText}>{getInitials(m.user?.full_name)}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.memberCount}>{members.length}</Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.text.tertiary} />
                    </View>

                    {/* Status */}
                    <View style={{ flex: 1, minWidth: 80 }}>
                      <Text style={[styles.statusText, crew.active ? styles.statusActive : styles.statusInactive]}>
                        {crew.active ? 'Active' : 'Archived'}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={{ width: 120, flexDirection: 'row', gap: 4 }}>
                      <Pressable style={({ hovered }) => [styles.actionBtn, hovered && styles.actionBtnHovered]} onPress={(e) => { e.stopPropagation(); openEditModal(crew); }}>
                        <Ionicons name="pencil" size={14} color={colors.text.secondary} />
                      </Pressable>
                      <Pressable style={({ hovered }) => [styles.actionBtn, hovered && styles.actionBtnHovered]} onPress={(e) => { e.stopPropagation(); handleArchive(crew); }}>
                        <Ionicons name={crew.active ? 'archive-outline' : 'refresh-outline'} size={14} color={crew.active ? colors.text.secondary : colors.semantic.success} />
                      </Pressable>
                      {!crew.active && (
                        <Pressable style={({ hovered }) => [styles.actionBtn, styles.deleteBtn, hovered && styles.deleteBtnHovered]} onPress={(e) => { e.stopPropagation(); setConfirmDelete(crew); }}>
                          <Ionicons name="trash-outline" size={14} color={colors.semantic.error} />
                        </Pressable>
                      )}
                    </View>
                  </Pressable>

                  {/* Expanded member list */}
                  {isExpanded && (
                    <View style={styles.expandedContainer}>
                      {members.length === 0 ? (
                        <Text style={styles.expandedEmpty}>No members assigned</Text>
                      ) : (
                        members.map(m => (
                          <View key={m.id} style={styles.memberRow}>
                            <View style={styles.miniAvatar}>
                              <Text style={styles.miniAvatarText}>{getInitials(m.user?.full_name)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.memberName}>{m.user?.full_name || 'Unknown'}</Text>
                              <Text style={styles.memberRole}>{m.user?.role_key || '—'}</Text>
                            </View>
                            <Text style={styles.memberContact}>{m.user?.phone || m.user?.email || '—'}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} onClose={closeModal} title={modalMode === 'add' ? 'Add Crew' : 'Edit Crew'} wide>
        {error && (
          <View style={styles.modalError}>
            <Ionicons name="alert-circle" size={16} color={colors.semantic.error} />
            <Text style={styles.modalErrorText}>{error}</Text>
          </View>
        )}
        <FormField label="Crew Name" required>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={v => setFormData({ ...formData, name: v })}
            placeholder="e.g. Concrete Crew A"
            placeholderTextColor={colors.text.tertiary}
          />
        </FormField>
        <FormField label="Description">
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={formData.description}
            onChangeText={v => setFormData({ ...formData, description: v })}
            placeholder="Optional description..."
            placeholderTextColor={colors.text.tertiary}
            multiline
          />
        </FormField>
        <FormField label="Foreman / Supervisor">
          <SearchDropdown
            options={foremanOptions}
            selectedId={formData.foreman_id}
            onSelect={(id) => setFormData({ ...formData, foreman_id: id })}
            placeholder="Select a foreman..."
            emptyText="No foremen found"
          />
        </FormField>
        <FormField label="Members">
          <MemberPicker
            employees={employees}
            selectedIds={formData.member_ids}
            onToggle={toggleMember}
            foremanId={formData.foreman_id}
          />
        </FormField>
        <View style={styles.modalFooter}>
          <Pressable style={styles.cancelBtn} onPress={closeModal}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={styles.saveBtnText}>{modalMode === 'add' ? 'Create Crew' : 'Save Changes'}</Text>
            )}
          </Pressable>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Crew">
        <View style={styles.confirmContent}>
          <View style={styles.confirmIcon}>
            <Ionicons name="warning" size={32} color={colors.semantic.error} />
          </View>
          <Text style={styles.confirmTitle}>Are you sure?</Text>
          <Text style={styles.confirmText}>
            This will permanently delete <Text style={{ fontWeight: '600' }}>{confirmDelete?.name}</Text> and remove all member assignments. This action cannot be undone.
          </Text>
        </View>
        <View style={styles.modalFooter}>
          <Pressable style={styles.cancelBtn} onPress={() => setConfirmDelete(null)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.deleteConfirmBtn} onPress={handleDelete}>
            <Text style={styles.deleteConfirmBtnText}>Delete Crew</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.text.tertiary },

  // Toolbar
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 16, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary.orange, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

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

  // Table
  tableContainer: { flex: 1, marginHorizontal: 16, marginTop: 12, marginBottom: 16, backgroundColor: colors.neutral.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  tableTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  crewCount: { fontSize: 12, color: colors.text.tertiary },

  columnHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.neutral.offWhite, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  columnLabel: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },

  tableBody: { flex: 1 },
  tableBodyContent: { paddingBottom: 16 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light, cursor: 'pointer' },
  rowHovered: { backgroundColor: colors.neutral.offWhite },

  // Crew identity
  crewIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary.orangeSubtle, alignItems: 'center', justifyContent: 'center' },
  crewName: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  crewDescription: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },

  // Foreman
  miniAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary.orangeSubtle, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { fontSize: 9, fontWeight: '600', color: colors.primary.orange },
  foremanName: { fontSize: 12, color: colors.text.secondary },
  unassignedText: { fontSize: 12, color: colors.text.tertiary, fontStyle: 'italic' },

  // Stacked avatars
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackedAvatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.neutral.offWhite, borderWidth: 2, borderColor: colors.neutral.white, alignItems: 'center', justifyContent: 'center' },
  stackedAvatarText: { fontSize: 8, fontWeight: '600', color: colors.text.tertiary },
  memberCount: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },

  // Status
  statusText: { fontSize: 12, fontWeight: '500' },
  statusActive: { color: activeColor },
  statusInactive: { color: colors.text.tertiary },

  // Actions
  actionBtn: { padding: 6, borderRadius: 4 },
  actionBtnHovered: { backgroundColor: colors.neutral.offWhite },
  deleteBtn: {},
  deleteBtnHovered: { backgroundColor: colors.semantic.error + '15' },

  // Expanded member list
  expandedContainer: { backgroundColor: colors.neutral.offWhite, borderBottomWidth: 1, borderBottomColor: colors.border.light, paddingVertical: 4, paddingHorizontal: 16, paddingLeft: 58 },
  expandedEmpty: { fontSize: 12, color: colors.text.tertiary, paddingVertical: 12, fontStyle: 'italic' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  memberName: { fontSize: 12, fontWeight: '500', color: colors.text.primary },
  memberRole: { fontSize: 11, color: colors.text.tertiary, textTransform: 'capitalize' },
  memberContact: { fontSize: 11, color: colors.text.tertiary },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: colors.text.tertiary },

  // Modal form
  modalError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.semantic.error + '15', padding: 12, borderRadius: 8, marginBottom: 16 },
  modalErrorText: { fontSize: 13, color: colors.semantic.error, flex: 1 },
  input: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text.primary, backgroundColor: colors.neutral.white },
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