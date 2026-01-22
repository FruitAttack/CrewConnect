import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../utils/ctx';
import { getUsers, getUserProfile } from '../../utils/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';

export default function Workforce() {
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const isLargeScreen = width >= 1024;
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [filter, setFilter] = useState('all');

  const token = session?.access_token;

  // Fetch user profile to get companyId
  useEffect(() => {
    async function fetchUserProfile() {
      if (!token) return;
      const response = await getUserProfile(token);
      if (response.success && response.data?.user?.default_company_id) {
        setCompanyId(response.data.user.default_company_id);
      }
    }
    fetchUserProfile();
  }, [token]);

  const fetchEmployees = useCallback(async () => {
    if (!token || !companyId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await getUsers(token, companyId);
      
      if (response.success && response.data?.users) {
        setEmployees(response.data.users);
      } else {
        setError(response.message || 'Failed to load employees');
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    if (companyId) {
      fetchEmployees();
    }
  }, [companyId, fetchEmployees]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  }, [fetchEmployees]);

  // Filter employees by role
  const filteredEmployees = filter === 'all' 
    ? employees 
    : employees.filter(emp => emp.role_key === filter);

  // Stats
  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    admins: employees.filter(e => e.role_key === 'admin').length,
    supervisors: employees.filter(e => e.role_key === 'supervisor').length,
    foremen: employees.filter(e => e.role_key === 'foreman').length,
    laborers: employees.filter(e => e.role_key === 'laborer').length,
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin': return { bg: colors.semantic.errorLight, text: colors.semantic.error };
      case 'supervisor': return { bg: colors.semantic.infoLight, text: colors.semantic.info };
      case 'foreman': return { bg: colors.semantic.warningLight, text: colors.semantic.warning };
      default: return { bg: colors.neutral.offWhite, text: colors.text.secondary };
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'supervisor': return 'Supervisor';
      case 'foreman': return 'Foreman';
      case 'laborer': return 'Laborer';
      default: return role || 'Employee';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.orange} />
        <Text style={styles.loadingText}>Loading workforce...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Workforce</Text>
          <Text style={styles.subtitle}>{stats.total} employees · {stats.active} active</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={[styles.statsRow, isLargeScreen && styles.statsRowLarge]}>
        <StatCard 
          icon="people" 
          iconColor={colors.primary.orange}
          iconBg={colors.primary.orangeSubtle}
          value={stats.total} 
          label="Total Employees" 
        />
        <StatCard 
          icon="shield-checkmark" 
          iconColor={colors.semantic.error}
          iconBg={colors.semantic.errorLight}
          value={stats.admins} 
          label="Admins" 
        />
        <StatCard 
          icon="eye" 
          iconColor={colors.semantic.info}
          iconBg={colors.semantic.infoLight}
          value={stats.supervisors} 
          label="Supervisors" 
        />
        <StatCard 
          icon="person" 
          iconColor={colors.semantic.warning}
          iconBg={colors.semantic.warningLight}
          value={stats.foremen} 
          label="Foremen" 
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <FilterTab label="All" value="all" current={filter} onPress={setFilter} count={stats.total} />
        <FilterTab label="Admins" value="admin" current={filter} onPress={setFilter} count={stats.admins} />
        <FilterTab label="Supervisors" value="supervisor" current={filter} onPress={setFilter} count={stats.supervisors} />
        <FilterTab label="Foremen" value="foreman" current={filter} onPress={setFilter} count={stats.foremen} />
        <FilterTab label="Laborers" value="laborer" current={filter} onPress={setFilter} count={stats.laborers} />
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchEmployees}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Empty State */}
      {!error && filteredEmployees.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>No employees found</Text>
          <Text style={styles.emptySubtitle}>
            {filter !== 'all' ? 'Try changing the filter' : 'Add employees to get started'}
          </Text>
        </View>
      )}

      {/* Employee List */}
      <View style={[styles.employeeGrid, isLargeScreen && styles.employeeGridLarge]}>
        {filteredEmployees.map((employee) => (
          <EmployeeCard 
            key={employee.id} 
            employee={employee} 
            getRoleBadgeStyle={getRoleBadgeStyle}
            getRoleLabel={getRoleLabel}
            getInitials={getInitials}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// Stat Card Component
function StatCard({ icon, iconColor, iconBg, value, label }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

// Filter Tab Component
function FilterTab({ label, value, current, onPress, count }) {
  const isActive = current === value;
  return (
    <Pressable 
      style={[styles.filterTab, isActive && styles.filterTabActive]}
      onPress={() => onPress(value)}
    >
      <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
        {label}
      </Text>
      <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
        <Text style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

// Employee Card Component
function EmployeeCard({ employee, getRoleBadgeStyle, getRoleLabel, getInitials }) {
  const roleStyle = getRoleBadgeStyle(employee.role_key);
  
  return (
    <Pressable
      style={({ hovered }) => [
        styles.employeeCard,
        hovered && styles.employeeCardHovered,
      ]}
    >
      <View style={styles.employeeHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(employee.full_name)}</Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.full_name || 'Unknown'}</Text>
          <Text style={styles.employeeEmail}>{employee.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
          <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>
            {getRoleLabel(employee.role_key)}
          </Text>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        {employee.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color={colors.text.tertiary} />
            <Text style={styles.detailText}>{employee.phone}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons 
            name={employee.is_active ? "checkmark-circle" : "close-circle"} 
            size={14} 
            color={employee.is_active ? colors.semantic.success : colors.semantic.error} 
          />
          <Text style={[
            styles.detailText, 
            { color: employee.is_active ? colors.semantic.success : colors.semantic.error }
          ]}>
            {employee.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.employeeFooter}>
        <Text style={styles.footerText}>
          Added {new Date(employee.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Profile</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary.orange} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },

  loadingContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: spacing.xxxxl,
  },
  loadingText: { 
    marginTop: spacing.md, 
    fontSize: typography.fontSize.md, 
    color: colors.text.secondary 
  },

  header: { marginBottom: spacing.xl },
  pageTitle: { 
    fontSize: 28, 
    fontWeight: typography.fontWeight.bold, 
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: spacing.xxs,
  },
  subtitle: { fontSize: typography.fontSize.md, color: colors.text.secondary },

  statsRow: { 
    flexDirection: 'row', 
    gap: spacing.md, 
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  statsRowLarge: { flexWrap: 'nowrap' },
  statCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },

  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.lg,
    padding: spacing.xxs,
    marginBottom: spacing.xl,
    gap: spacing.xxs,
    flexWrap: 'wrap',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  filterTabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  filterTabTextActive: {
    color: colors.text.primary,
  },
  filterBadge: {
    backgroundColor: colors.neutral.offWhite,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: colors.primary.orangeSubtle,
  },
  filterBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
  },
  filterBadgeTextActive: {
    color: colors.primary.orange,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.semantic.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  errorText: { flex: 1, color: colors.semantic.error, fontSize: typography.fontSize.sm },
  retryButton: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.xs,
    backgroundColor: colors.semantic.error,
    borderRadius: borderRadius.md,
  },
  retryText: { color: colors.neutral.white, fontWeight: typography.fontWeight.medium },

  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: spacing.xxxxl,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.neutral.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { 
    fontSize: typography.fontSize.lg, 
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: { fontSize: typography.fontSize.md, color: colors.text.tertiary },

  employeeGrid: { gap: spacing.md },
  employeeGridLarge: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
  },

  employeeCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
    flex: 1,
    minWidth: 300,
  },
  employeeCardHovered: {
    borderColor: colors.primary.orange,
    transform: [{ translateY: -2 }],
    ...shadows.md,
  },

  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary.orange,
  },
  employeeInfo: { flex: 1 },
  employeeName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  employeeDetails: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },

  employeeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.neutral.offWhite,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  viewButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary.orange,
  },
});
