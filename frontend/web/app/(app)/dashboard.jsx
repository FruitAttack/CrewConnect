import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../utils/ctx';
import { reportsApi, projectsApi, usersApi } from '../../services/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';

export default function Dashboard() {
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedProjects: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    clockedInCount: 0,
  });
  const [projectSummary, setProjectSummary] = useState([]);

  const token = session?.access_token;
  const companyId = session?.user?.user_metadata?.default_company_id;
  const isLargeScreen = width >= 1024;

  const fetchDashboardData = useCallback(async () => {
    if (!token || !companyId) {
      setLoading(false);
      return;
    }

    try {
      const [projectsRes, usersRes, dashboardRes] = await Promise.allSettled([
        projectsApi.getAll(token, companyId),
        usersApi.getAll(token, companyId),
        reportsApi.getDashboard(token, companyId),
      ]);

      if (projectsRes.status === 'fulfilled' && projectsRes.value?.projects) {
        const projects = projectsRes.value.projects;
        setStats(prev => ({
          ...prev,
          activeProjects: projects.filter(p => p.active).length,
          completedProjects: projects.filter(p => !p.active).length,
        }));
        setProjectSummary(projects.filter(p => p.active).slice(0, 5));
      }

      if (usersRes.status === 'fulfilled' && usersRes.value?.users) {
        const users = usersRes.value.users;
        setStats(prev => ({
          ...prev,
          totalEmployees: users.length,
          activeEmployees: users.filter(u => u.is_active).length,
        }));
      }

      if (dashboardRes.status === 'fulfilled' && dashboardRes.value?.dashboard) {
        const dash = dashboardRes.value.dashboard;
        setStats(prev => ({
          ...prev,
          hoursThisWeek: dash.hours_this_week || 0,
          hoursThisMonth: dash.hours_this_month || 0,
          clockedInCount: dash.clocked_in_count || 0,
        }));
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  const formatHours = (hours) => {
    if (typeof hours !== 'number') return '0h';
    return Math.round(hours * 10) / 10 + 'h';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.pageTitle}>Company Overview</Text>
        </View>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      <View style={[styles.statsGrid, isLargeScreen && styles.statsGridLarge]}>
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          subtitle={stats.completedProjects + ' completed'}
          icon="folder-open-outline"
          iconColor={colors.primary.orange}
          iconBgColor={colors.semantic.warningLight}
          loading={loading}
          style={styles.statCard}
        />
        <StatCard
          title="Active Employees"
          value={stats.activeEmployees}
          subtitle={stats.totalEmployees + ' total'}
          icon="people-outline"
          iconColor={colors.semantic.info}
          iconBgColor={colors.semantic.infoLight}
          loading={loading}
          style={styles.statCard}
        />
        <StatCard
          title="Hours This Week"
          value={formatHours(stats.hoursThisWeek)}
          icon="time-outline"
          iconColor={colors.semantic.success}
          iconBgColor={colors.semantic.successLight}
          loading={loading}
          style={styles.statCard}
        />
        <StatCard
          title="Hours This Month"
          value={formatHours(stats.hoursThisMonth)}
          icon="calendar-outline"
          iconColor="#8B5CF6"
          iconBgColor="#F3E8FF"
          loading={loading}
          style={styles.statCard}
        />
      </View>

      <View style={[styles.contentGrid, isLargeScreen && styles.contentGridLarge]}>
        <Card
          title="Active Projects"
          subtitle="Currently in progress"
          variant="elevated"
          style={[styles.card, isLargeScreen && styles.cardWide]}
          rightHeader={<View style={styles.badge}><Text style={styles.badgeText}>{stats.activeProjects}</Text></View>}
        >
          {projectSummary.length > 0 ? (
            <View style={styles.projectList}>
              {projectSummary.map((project) => (
                <View key={project.id} style={styles.projectItem}>
                  <View style={styles.projectInfo}>
                    <View style={[styles.projectDot, { backgroundColor: colors.semantic.success }]} />
                    <View style={styles.projectText}>
                      <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
                      {project.customers?.name && (
                        <Text style={styles.projectCustomer} numberOfLines={1}>{project.customers.name}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={40} color={colors.neutral.silver} />
              <Text style={styles.emptyText}>No active projects</Text>
            </View>
          )}
        </Card>

        <Card title="Labor Analytics" subtitle="This month's overview" variant="elevated" style={styles.card}>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>{formatHours(stats.hoursThisMonth)}</Text>
              <Text style={styles.analyticLabel}>Total Hours</Text>
            </View>
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>{stats.clockedInCount || 0}</Text>
              <Text style={styles.analyticLabel}>Currently Clocked In</Text>
            </View>
          </View>
          <View style={styles.chartPlaceholder}>
            <View style={styles.barChart}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                <View key={i} style={styles.barColumn}>
                  <View style={[styles.bar, { height: (Math.random() * 60 + 20) + '%', backgroundColor: i < 5 ? colors.primary.orange : colors.neutral.silver }]} />
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <Card title="Workforce" subtitle="Employee status" variant="elevated" style={styles.card}>
          <View style={styles.workforceGrid}>
            <View style={styles.workforceItem}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.semantic.success }]} />
              <View>
                <Text style={styles.workforceValue}>{stats.activeEmployees}</Text>
                <Text style={styles.workforceLabel}>Active</Text>
              </View>
            </View>
            <View style={styles.workforceItem}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.neutral.silver }]} />
              <View>
                <Text style={styles.workforceValue}>{stats.totalEmployees - stats.activeEmployees}</Text>
                <Text style={styles.workforceLabel}>Inactive</Text>
              </View>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: stats.totalEmployees > 0 ? ((stats.activeEmployees / stats.totalEmployees) * 100) + '%' : '0%' }]} />
            </View>
            <Text style={styles.progressText}>
              {stats.totalEmployees > 0 ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100) + '% active' : 'No employees'}
            </Text>
          </View>
        </Card>

        <Card title="Quick Actions" variant="elevated" style={styles.card}>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'add-circle-outline', label: 'New Project', color: colors.primary.orange },
              { icon: 'person-add-outline', label: 'Add Employee', color: colors.semantic.info },
              { icon: 'document-text-outline', label: 'View Reports', color: colors.semantic.success },
              { icon: 'settings-outline', label: 'Settings', color: colors.neutral.gray },
            ].map((action, index) => (
              <View key={index} style={styles.actionItem}>
                <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </View>
            ))}
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl },
  greeting: { fontSize: typography.fontSize.md, color: colors.text.secondary, marginBottom: spacing.xxs },
  pageTitle: { fontSize: typography.fontSize.xxxl, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface.card, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, ...shadows.xs },
  dateText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  statsGridLarge: { flexWrap: 'nowrap' },
  statCard: { flex: 1, minWidth: 200 },
  contentGrid: { gap: spacing.lg },
  contentGridLarge: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { flex: 1, minWidth: 300 },
  cardWide: { minWidth: 400 },
  badge: { backgroundColor: colors.primary.orange, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: borderRadius.full },
  badgeText: { color: colors.neutral.white, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  projectList: { gap: spacing.sm },
  projectItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  projectInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  projectDot: { width: 8, height: 8, borderRadius: borderRadius.full, marginRight: spacing.sm },
  projectText: { flex: 1 },
  projectName: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.medium, color: colors.text.primary },
  projectCustomer: { fontSize: typography.fontSize.sm, color: colors.text.tertiary },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText: { marginTop: spacing.sm, fontSize: typography.fontSize.md, color: colors.text.tertiary },
  analyticsGrid: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.lg },
  analyticItem: { flex: 1 },
  analyticValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  analyticLabel: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  chartPlaceholder: { height: 120, backgroundColor: colors.surface.background, borderRadius: borderRadius.md, padding: spacing.md },
  barChart: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barColumn: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '60%', borderRadius: borderRadius.xs, marginBottom: spacing.xs },
  barLabel: { fontSize: typography.fontSize.xs, color: colors.text.tertiary },
  workforceGrid: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.lg },
  workforceItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusIndicator: { width: 12, height: 12, borderRadius: borderRadius.full },
  workforceValue: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  workforceLabel: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  progressContainer: { gap: spacing.xs },
  progressBar: { height: 8, backgroundColor: colors.neutral.silver, borderRadius: borderRadius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.semantic.success, borderRadius: borderRadius.full },
  progressText: { fontSize: typography.fontSize.sm, color: colors.text.tertiary },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionItem: { alignItems: 'center', width: '22%', minWidth: 70 },
  actionIcon: { width: 48, height: 48, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  actionLabel: { fontSize: typography.fontSize.xs, color: colors.text.secondary, textAlign: 'center' },
});
