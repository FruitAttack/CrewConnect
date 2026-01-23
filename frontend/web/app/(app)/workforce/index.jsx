import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getAllUsers, getAllCostCodes, getUserProfile } from '../../../utils/api';
import { colors, shadows } from '../../../constants/theme';

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Stat Card Component
const StatCard = ({ icon, label, value, subtitle, color = colors.primary.orange, onPress }) => (
  <Pressable style={({ hovered }) => [styles.statCard, hovered && styles.statCardHovered]} onPress={onPress}>
    <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </Pressable>
);

// Quick Action Card
const QuickAction = ({ icon, label, description, onPress }) => (
  <Pressable style={({ hovered }) => [styles.quickAction, hovered && styles.quickActionHovered]} onPress={onPress}>
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={20} color={colors.text.secondary} />
    </View>
    <View style={styles.quickActionText}>
      <Text style={styles.quickActionLabel}>{label}</Text>
      <Text style={styles.quickActionDesc}>{description}</Text>
    </View>
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

  const fetchData = useCallback(async () => {
    if (!token || !companyId) return;
    
    try {
      const [usersRes, costCodesRes] = await Promise.all([
        getAllUsers(token, { company_id: companyId }),
        getAllCostCodes(token),
      ]);

      if (usersRes.success) {
        setEmployees(usersRes.data?.users || []);
      }
      if (costCodesRes.success) {
        setCostCodes(Array.isArray(costCodesRes.data) ? costCodesRes.data : []);
      }
    } catch (err) {
      console.error('Error fetching workforce data:', err);
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
    if (companyId) fetchData();
  }, [companyId, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculate stats
  const activeEmployees = employees.filter(e => e.is_active);
  const inactiveEmployees = employees.filter(e => !e.is_active);
  const activeCostCodes = costCodes.filter(c => c.active);
  const roleBreakdown = activeEmployees.reduce((acc, e) => {
    const role = e.role_key || 'unassigned';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading workforce data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />}
    >
      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="people"
          label="Active Employees"
          value={activeEmployees.length}
          subtitle={inactiveEmployees.length > 0 ? `${inactiveEmployees.length} inactive` : null}
          color={colors.semantic.success}
          onPress={() => router.push('/workforce/employees')}
        />
        <StatCard
          icon="pricetag"
          label="Cost Codes"
          value={activeCostCodes.length}
          subtitle={`${costCodes.length - activeCostCodes.length} inactive`}
          color={colors.semantic.info}
          onPress={() => router.push('/workforce/costCodes')}
        />
        <StatCard
          icon="shield-checkmark"
          label="Admins"
          value={roleBreakdown.admin || 0}
          color="#8B5CF6"
        />
        <StatCard
          icon="construct"
          label="Foremen"
          value={roleBreakdown.foreman || 0}
          color={colors.primary.orange}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="person-add-outline"
            label="Add Employee"
            description="Create a new employee account"
            onPress={() => router.push('/workforce/employees?action=add')}
          />
          <QuickAction
            icon="pricetag-outline"
            label="Add Cost Code"
            description="Create a new cost code"
            onPress={() => router.push('/workforce/costCodes?action=add')}
          />
        </View>
      </View>

      {/* Recent Employees */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Employees</Text>
          <Pressable onPress={() => router.push('/workforce/employees')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          {activeEmployees.slice(0, 5).map((emp, idx) => (
            <View key={emp.id} style={[styles.listItem, idx === 0 && { borderTopWidth: 0 }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(emp.full_name)}</Text>
              </View>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemName}>{emp.full_name || emp.email}</Text>
                <Text style={styles.listItemMeta}>{emp.role_key || 'No role'} • {emp.email}</Text>
              </View>
              <View style={[styles.statusBadge, emp.is_active && styles.statusBadgeActive]}>
                <Text style={[styles.statusText, emp.is_active && styles.statusTextActive]}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          ))}
          {activeEmployees.length === 0 && (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No employees yet</Text>
            </View>
          )}
        </View>
      </View>

      {/* Role Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Role Distribution</Text>
        <View style={styles.card}>
          {Object.entries(roleBreakdown).map(([role, count], idx) => (
            <View key={role} style={[styles.roleRow, idx === 0 && { borderTopWidth: 0 }]}>
              <Text style={styles.roleLabel}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
              <View style={styles.roleBarContainer}>
                <View 
                  style={[
                    styles.roleBar, 
                    { width: `${(count / activeEmployees.length) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.roleCount}>{count}</Text>
            </View>
          ))}
          {Object.keys(roleBreakdown).length === 0 && (
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No role data</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.text.tertiary },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { 
    flex: 1, 
    minWidth: 150, 
    backgroundColor: colors.neutral.white, 
    borderRadius: 10, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: colors.border.light,
    ...shadows.sm,
  },
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
  quickAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.neutral.white, 
    borderRadius: 8, 
    padding: 12, 
    borderWidth: 1, 
    borderColor: colors.border.light,
    gap: 12,
  },
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
