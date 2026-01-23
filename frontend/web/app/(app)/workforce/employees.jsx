import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getActiveRoster, updateUser, getUserProfile } from '../../../utils/api';
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

// Form Field
const FormField = ({ label, required, children }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 }}>
      {label} {required && <Text style={{ color: colors.semantic.error }}>*</Text>}
    </Text>
    {children}
  </View>
);

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', phone: '', role_key: 'employee', is_active: true, can_view_rates: false });

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const meRes = await getUserProfile(token);
      const cid = meRes?.data?.user?.default_company_id;
      setCompanyId(cid);
      if (cid) {
        const res = await getActiveRoster(token, cid);
        // getActiveRoster returns roster with user objects
        const users = (res?.data?.roster || []).map(r => r.user).filter(Boolean);
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
      const res = await getActiveRoster(token, companyId);
      const users = (res?.data?.roster || []).map(r => r.user).filter(Boolean);
      setEmployees(users);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = !search || emp.full_name?.toLowerCase().includes(search.toLowerCase()) || emp.email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && emp.is_active) || (statusFilter === 'inactive' && !emp.is_active);
      const matchesRole = roleFilter === 'all' || emp.role_key === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, search, statusFilter, roleFilter]);

  const openEditModal = (emp) => {
    setFormData({ full_name: emp.full_name || '', phone: emp.phone || '', role_key: emp.role_key || 'employee', is_active: emp.is_active, can_view_rates: emp.can_view_rates || false });
    setSelectedEmployee(emp);
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setSelectedEmployee(null); setError(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateUser(token, selectedEmployee.id, formData);
      if (!res.success) { setError(res.message || 'Failed to update'); setSaving(false); return; }
      closeModal();
      refresh();
    } catch (err) { setError('An error occurred'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (emp) => {
    try { await updateUser(token, emp.id, { is_active: !emp.is_active }); refresh(); }
    catch (err) { setError('Failed to update status'); }
  };

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={colors.primary.orange} /><Text style={s.loadingText}>Loading employees...</Text></View>;

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <View style={s.searchBox}><Ionicons name="search" size={16} color={colors.text.tertiary} /><TextInput style={s.searchInput} placeholder="Search..." placeholderTextColor={colors.text.tertiary} value={search} onChangeText={setSearch} /></View>
        <View style={s.filters}>
          <View style={s.filterGroup}><Text style={s.filterLabel}>Status:</Text>{['all','active','inactive'].map(st=><Pressable key={st} style={[s.filterBtn,statusFilter===st&&s.filterBtnActive]} onPress={()=>setStatusFilter(st)}><Text style={[s.filterBtnText,statusFilter===st&&s.filterBtnTextActive]}>{st.charAt(0).toUpperCase()+st.slice(1)}</Text></Pressable>)}</View>
          <View style={s.filterGroup}><Text style={s.filterLabel}>Role:</Text><Pressable style={[s.filterBtn,roleFilter==='all'&&s.filterBtnActive]} onPress={()=>setRoleFilter('all')}><Text style={[s.filterBtnText,roleFilter==='all'&&s.filterBtnTextActive]}>All</Text></Pressable>{ROLES.map(r=><Pressable key={r.key} style={[s.filterBtn,roleFilter===r.key&&s.filterBtnActive]} onPress={()=>setRoleFilter(r.key)}><Text style={[s.filterBtnText,roleFilter===r.key&&s.filterBtnTextActive]}>{r.label}</Text></Pressable>)}</View>
        </View>
      </View>
      {error&&<View style={s.errorBanner}><Ionicons name="alert-circle" size={16} color={colors.semantic.error}/><Text style={s.errorText}>{error}</Text><Pressable onPress={()=>setError(null)}><Ionicons name="close" size={16} color={colors.semantic.error}/></Pressable></View>}
      <View style={s.tableWrap}>
        <View style={s.tableHeader}><Text style={s.tableTitle}>Employees</Text><Text style={s.tableCount}>{filtered.length}</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{flexGrow:1}}>
          <View style={{minWidth:700,flex:1}}>
            <View style={s.colHeaders}><View style={{flex:2,minWidth:200}}><Text style={s.colLabel}>Employee</Text></View><View style={{flex:1,minWidth:100}}><Text style={s.colLabel}>Role</Text></View><View style={{flex:1,minWidth:120}}><Text style={s.colLabel}>Contact</Text></View><View style={{flex:1,minWidth:100}}><Text style={s.colLabel}>Status</Text></View><View style={{width:80}}><Text style={s.colLabel}>Actions</Text></View></View>
            <ScrollView style={{flex:1}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary.orange}/>}>
              {filtered.length===0?<View style={s.empty}><Ionicons name="people-outline" size={32} color={colors.text.tertiary}/><Text style={s.emptyTitle}>No employees found</Text></View>:filtered.map(emp=>(
                <View key={emp.id} style={s.row}>
                  <View style={{flex:2,minWidth:200,flexDirection:'row',alignItems:'center',gap:10}}>
                    <View style={[s.avatar,!emp.is_active&&{backgroundColor:colors.neutral.offWhite}]}><Text style={[s.avatarText,!emp.is_active&&{color:colors.text.tertiary}]}>{getInitials(emp.full_name)}</Text></View>
                    <View style={{flex:1}}><Text style={s.empName} numberOfLines={1}>{emp.full_name||'No name'}</Text><Text style={s.empEmail} numberOfLines={1}>{emp.email}</Text></View>
                  </View>
                  <View style={{flex:1,minWidth:100}}><View style={s.roleBadge}><Text style={s.roleBadgeText}>{emp.role_key||'None'}</Text></View></View>
                  <View style={{flex:1,minWidth:120}}><Text style={s.contactText}>{emp.phone||'—'}</Text></View>
                  <View style={{flex:1,minWidth:100}}><View style={[s.statusBadge,emp.is_active?s.statusActive:s.statusInactive]}><View style={[s.statusDot,emp.is_active?s.statusDotActive:s.statusDotInactive]}/><Text style={[s.statusText,emp.is_active?s.statusTextActive:s.statusTextInactive]}>{emp.is_active?'Active':'Inactive'}</Text></View></View>
                  <View style={{width:80,flexDirection:'row',gap:4}}><Pressable style={s.actionBtn} onPress={()=>openEditModal(emp)}><Ionicons name="pencil" size={14} color={colors.text.secondary}/></Pressable><Pressable style={s.actionBtn} onPress={()=>handleToggleActive(emp)}><Ionicons name={emp.is_active?'eye-off':'eye'} size={14} color={colors.text.secondary}/></Pressable></View>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
      <Modal visible={modalVisible} onClose={closeModal} title="Edit Employee">
        <FormField label="Full Name" required><TextInput style={s.input} value={formData.full_name} onChangeText={v=>setFormData({...formData,full_name:v})} placeholder="John Smith" placeholderTextColor={colors.text.tertiary}/></FormField>
        <FormField label="Phone"><TextInput style={s.input} value={formData.phone} onChangeText={v=>setFormData({...formData,phone:v})} placeholder="555-1234" placeholderTextColor={colors.text.tertiary}/></FormField>
        <FormField label="Role" required><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{ROLES.map(r=><Pressable key={r.key} style={[s.roleOpt,formData.role_key===r.key&&s.roleOptActive]} onPress={()=>setFormData({...formData,role_key:r.key})}><Text style={[s.roleOptText,formData.role_key===r.key&&s.roleOptTextActive]}>{r.label}</Text></Pressable>)}</View></FormField>
        <Pressable style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:16}} onPress={()=>setFormData({...formData,can_view_rates:!formData.can_view_rates})}><Ionicons name={formData.can_view_rates?'checkbox':'square-outline'} size={20} color={formData.can_view_rates?colors.primary.orange:colors.text.tertiary}/><Text style={{fontSize:13,color:colors.text.primary}}>Can view pay rates</Text></Pressable>
        <View style={{flexDirection:'row',justifyContent:'flex-end',gap:10,paddingTop:16,borderTopWidth:1,borderTopColor:colors.border.light}}>
          <Pressable style={s.cancelBtn} onPress={closeModal}><Text style={s.cancelBtnText}>Cancel</Text></Pressable>
          <Pressable style={[s.saveBtn,saving&&{opacity:0.5}]} onPress={handleSave} disabled={saving}>{saving?<ActivityIndicator size="small" color="#fff"/>:<Text style={s.saveBtnText}>Save</Text>}</Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:colors.surface.background},
  loading:{flex:1,justifyContent:'center',alignItems:'center',gap:12},
  loadingText:{fontSize:13,color:colors.text.tertiary},
  toolbar:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12,padding:16,backgroundColor:colors.neutral.white,borderBottomWidth:1,borderBottomColor:colors.border.light},
  searchBox:{flexDirection:'row',alignItems:'center',flex:1,minWidth:200,maxWidth:300,backgroundColor:colors.neutral.offWhite,borderRadius:6,paddingHorizontal:10,height:36,gap:8},
  searchInput:{flex:1,fontSize:13,color:colors.text.primary,outlineStyle:'none'},
  filters:{flexDirection:'row',flexWrap:'wrap',gap:16},
  filterGroup:{flexDirection:'row',alignItems:'center',gap:6},
  filterLabel:{fontSize:11,fontWeight:'500',color:colors.text.tertiary},
  filterBtn:{paddingHorizontal:10,paddingVertical:4,borderRadius:4,backgroundColor:colors.neutral.offWhite},
  filterBtnActive:{backgroundColor:colors.primary.orange},
  filterBtnText:{fontSize:11,fontWeight:'500',color:colors.text.secondary},
  filterBtnTextActive:{color:'#fff'},
  errorBanner:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:colors.semantic.errorLight,padding:12,margin:16,marginBottom:0,borderRadius:8},
  errorText:{flex:1,fontSize:12,color:colors.semantic.error},
  tableWrap:{flex:1,margin:16,backgroundColor:colors.neutral.white,borderRadius:10,borderWidth:1,borderColor:colors.border.light,overflow:'hidden'},
  tableHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:12,borderBottomWidth:1,borderBottomColor:colors.border.light},
  tableTitle:{fontSize:14,fontWeight:'700',color:colors.text.primary},
  tableCount:{fontSize:12,color:colors.text.tertiary},
  colHeaders:{flexDirection:'row',alignItems:'center',paddingVertical:8,paddingHorizontal:12,backgroundColor:colors.neutral.offWhite,borderBottomWidth:1,borderBottomColor:colors.border.light},
  colLabel:{fontSize:10,fontWeight:'600',color:colors.text.tertiary,textTransform:'uppercase',letterSpacing:0.5},
  row:{flexDirection:'row',alignItems:'center',paddingVertical:10,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:colors.border.light},
  avatar:{width:36,height:36,borderRadius:18,backgroundColor:colors.primary.orangeSubtle,alignItems:'center',justifyContent:'center'},
  avatarText:{fontSize:12,fontWeight:'600',color:colors.primary.orange},
  empName:{fontSize:13,fontWeight:'600',color:colors.text.primary},
  empEmail:{fontSize:11,color:colors.text.tertiary,marginTop:1},
  roleBadge:{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:3,borderRadius:4,backgroundColor:colors.neutral.offWhite},
  roleBadgeText:{fontSize:11,fontWeight:'500',color:colors.text.secondary,textTransform:'capitalize'},
  contactText:{fontSize:12,color:colors.text.secondary},
  statusBadge:{flexDirection:'row',alignItems:'center',alignSelf:'flex-start',gap:6,paddingHorizontal:8,paddingVertical:4,borderRadius:4},
  statusActive:{backgroundColor:colors.semantic.successLight},
  statusInactive:{backgroundColor:colors.neutral.offWhite},
  statusDot:{width:6,height:6,borderRadius:3},
  statusDotActive:{backgroundColor:colors.semantic.success},
  statusDotInactive:{backgroundColor:colors.text.tertiary},
  statusText:{fontSize:11,fontWeight:'500'},
  statusTextActive:{color:colors.semantic.success},
  statusTextInactive:{color:colors.text.tertiary},
  actionBtn:{padding:8,borderRadius:6,backgroundColor:colors.neutral.offWhite},
  empty:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:60,gap:8},
  emptyTitle:{fontSize:15,fontWeight:'600',color:colors.text.primary},
  input:{borderWidth:1,borderColor:colors.border.light,borderRadius:6,paddingHorizontal:12,paddingVertical:10,fontSize:13,color:colors.text.primary,backgroundColor:colors.neutral.white},
  roleOpt:{paddingHorizontal:14,paddingVertical:8,borderRadius:6,borderWidth:1,borderColor:colors.border.light,backgroundColor:colors.neutral.white},
  roleOptActive:{borderColor:colors.primary.orange,backgroundColor:colors.primary.orangeSubtle},
  roleOptText:{fontSize:12,fontWeight:'500',color:colors.text.secondary},
  roleOptTextActive:{color:colors.primary.orange},
  cancelBtn:{paddingHorizontal:16,paddingVertical:10,borderRadius:6,borderWidth:1,borderColor:colors.border.medium},
  cancelBtnText:{fontSize:13,fontWeight:'500',color:colors.text.primary},
  saveBtn:{paddingHorizontal:16,paddingVertical:10,borderRadius:6,backgroundColor:colors.primary.orange},
  saveBtnText:{fontSize:13,fontWeight:'600',color:'#fff'},
});