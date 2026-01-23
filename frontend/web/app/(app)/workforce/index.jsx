import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getActiveRoster, getCostCodes, getUserProfile } from '../../../utils/api';
import { colors, shadows } from '../../../constants/theme';

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const StatCard = ({ icon, label, value, subtitle, color = colors.primary.orange, onPress }) => (
  <Pressable style={({ hovered }) => [s.statCard, hovered && s.statCardHovered]} onPress={onPress}>
    <View style={[s.statIcon, { backgroundColor: color + '15' }]}><Ionicons name={icon} size={20} color={color} /></View>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {subtitle && <Text style={s.statSubtitle}>{subtitle}</Text>}
  </Pressable>
);

const QuickAction = ({ icon, label, description, onPress }) => (
  <Pressable style={({ hovered }) => [s.quickAction, hovered && s.quickActionHovered]} onPress={onPress}>
    <View style={s.quickActionIcon}><Ionicons name={icon} size={20} color={colors.text.secondary} /></View>
    <View style={s.quickActionText}><Text style={s.quickActionLabel}>{label}</Text><Text style={s.quickActionDesc}>{description}</Text></View>
    <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
  </Pressable>
);

export default function WorkforceOverview() {
  const { session } = useSession();
  const router = useRouter();
  const token = session?.access_token;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [costCodes, setCostCodes] = useState([]);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const meRes = await getUserProfile(token);
      const cid = meRes?.data?.user?.default_company_id;
      setCompanyId(cid);

      if (cid) {
        const [rosterRes, ccRes] = await Promise.all([
          getActiveRoster(token, cid),
          getCostCodes(token),  // Backend gets company_id from token
        ]);
        const users = (rosterRes?.data?.roster || []).map(r => r.user).filter(Boolean);
        setEmployees(users);
        setCostCodes(ccRes?.data || []);
      }
    } catch (err) {
      console.error('Error loading workforce data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!companyId || !token) return;
    setRefreshing(true);
    try {
      const [rosterRes, ccRes] = await Promise.all([
        getActiveRoster(token, companyId),
        getCostCodes(token),  // Backend gets company_id from token
      ]);
      const users = (rosterRes?.data?.roster || []).map(r => r.user).filter(Boolean);
      setEmployees(users);
      setCostCodes(ccRes?.data || []);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  const activeEmployees = employees.filter(e => e.is_active);
  const inactiveEmployees = employees.filter(e => !e.is_active);
  const activeCostCodes = costCodes.filter(c => c.active);
  const roleBreakdown = activeEmployees.reduce((acc, e) => {
    const role = e.role_key || 'unassigned';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <View style={s.loading}><ActivityIndicator size="large" color={colors.primary.orange} /><Text style={s.loadingText}>Loading workforce data...</Text></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary.orange} />}>
      <View style={s.statsGrid}>
        <StatCard icon="people" label="Active Employees" value={activeEmployees.length} subtitle={inactiveEmployees.length > 0 ? `${inactiveEmployees.length} inactive` : null} color={colors.semantic.success} onPress={() => router.push('/workforce/employees')} />
        <StatCard icon="pricetag" label="Cost Codes" value={activeCostCodes.length} subtitle={`${costCodes.length - activeCostCodes.length} inactive`} color={colors.semantic.info} onPress={() => router.push('/workforce/costCodes')} />
        <StatCard icon="shield-checkmark" label="Admins" value={roleBreakdown.admin || 0} color="#8B5CF6" />
        <StatCard icon="construct" label="Foremen" value={roleBreakdown.foreman || 0} color={colors.primary.orange} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.quickActionsGrid}>
          <QuickAction icon="person-add-outline" label="Manage Employees" description="View and edit employee details" onPress={() => router.push('/workforce/employees')} />
          <QuickAction icon="pricetag-outline" label="Manage Cost Codes" description="Add or edit cost codes" onPress={() => router.push('/workforce/costCodes')} />
        </View>
      </View>

      <View style={s.section}>
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Recent Employees</Text><Pressable onPress={() => router.push('/workforce/employees')}><Text style={s.seeAll}>See all</Text></Pressable></View>
        <View style={s.card}>
          {activeEmployees.slice(0, 5).map((emp, idx) => (
            <View key={emp.id} style={[s.listItem, idx === 0 && { borderTopWidth: 0 }]}>
              <View style={s.avatar}><Text style={s.avatarText}>{getInitials(emp.full_name)}</Text></View>
              <View style={s.listItemInfo}><Text style={s.listItemName}>{emp.full_name || emp.email}</Text><Text style={s.listItemMeta}>{emp.role_key || 'No role'} • {emp.email}</Text></View>
              <View style={[s.statusBadge, emp.is_active && s.statusBadgeActive]}><Text style={[s.statusText, emp.is_active && s.statusTextActive]}>{emp.is_active ? 'Active' : 'Inactive'}</Text></View>
            </View>
          ))}
          {activeEmployees.length === 0 && <View style={s.emptyList}><Text style={s.emptyText}>No employees yet</Text></View>}
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Role Distribution</Text>
        <View style={s.card}>
          {Object.entries(roleBreakdown).map(([role, count], idx) => (
            <View key={role} style={[s.roleRow, idx === 0 && { borderTopWidth: 0 }]}>
              <Text style={s.roleLabel}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
              <View style={s.roleBarContainer}><View style={[s.roleBar, { width: `${(count / activeEmployees.length) * 100}%` }]} /></View>
              <Text style={s.roleCount}>{count}</Text>
            </View>
          ))}
          {Object.keys(roleBreakdown).length === 0 && <View style={s.emptyList}><Text style={s.emptyText}>No role data</Text></View>}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  content: { padding: 20, paddingBottom: 40 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.text.tertiary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: 150, backgroundColor: colors.neutral.white, borderRadius: 10, padding: 16, borderWidth: 1, borderColor: colors.border.light, ...shadows.sm },
  statCardHovered: { borderColor: colors.primary.orange },
  statIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.text.primary, marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },
  statSubtitle: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 12 },
  seeAll: { fontSize: 12, fontWeight: '500', color: colors.primary.orange },
  quickActionsGrid: { gap: 8 },
  quickAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12 },
  quickActionHovered: { borderColor: colors.primary.orange, backgroundColor: colors.primary.orangeSubtle },
  quickActionIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { flex: 1 },
  quickActionLabel: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  quickActionDesc: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  card: { backgroundColor: colors.neutral.white, borderRadius: 10, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.light },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary.orangeSubtle, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '600', color: colors.primary.orange },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  listItemMeta: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: colors.neutral.offWhite },
  statusBadgeActive: { backgroundColor: colors.semantic.successLight },
  statusText: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary },
  statusTextActive: { color: colors.semantic.success },
  roleRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderTopWidth: 1, borderTopColor: colors.border.light },
  roleLabel: { width: 100, fontSize: 12, fontWeight: '500', color: colors.text.primary },
  roleBarContainer: { flex: 1, height: 6, backgroundColor: colors.neutral.offWhite, borderRadius: 3, overflow: 'hidden' },
  roleBar: { height: '100%', backgroundColor: colors.primary.orange, borderRadius: 3 },
  roleCount: { width: 30, fontSize: 12, fontWeight: '600', color: colors.text.primary, textAlign: 'right' },
  emptyList: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 12, color: colors.text.tertiary },
});