import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, useWindowDimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../utils/ctx';
import { reportsApi, projectsApi, usersApi } from '../../services/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';

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
  const isMediumScreen = width >= 768;

  const userName = session?.user?.user_metadata?.full_name || 
                   session?.user?.user_metadata?.name || 
                   session?.user?.email?.split('@')[0] || 
                   'there';

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

  const statCards = [
    { 
      title: 'Active Projects', 
      value: stats.activeProjects, 
      subtitle: `${stats.completedProjects} completed`,
      icon: 'folder-open-outline',
      color: colors.primary.orange,
      bgColor: 'rgba(246, 112, 17, 0.1)',
    },
    { 
      title: 'Team Members', 
      value: stats.activeEmployees, 
      subtitle: `${stats.totalEmployees} total`,
      icon: 'people-outline',
      color: colors.semantic.info,
      bgColor: colors.semantic.infoLight,
    },
    { 
      title: 'Hours This Week', 
      value: formatHours(stats.hoursThisWeek), 
      subtitle: 'Current week',
      icon: 'time-outline',
      color: colors.semantic.success,
      bgColor: colors.semantic.successLight,
    },
    { 
      title: 'Clocked In', 
      value: stats.clockedInCount, 
      subtitle: 'Working now',
      icon: 'pulse-outline',
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
    },
  ];

  const quickActions = [
    { icon: 'add-circle-outline', label: 'New Project', color: colors.primary.orange },
    { icon: 'person-add-outline', label: 'Add Employee', color: colors.semantic.info },
    { icon: 'document-text-outline', label: 'View Reports', color: colors.semantic.success },
    { icon: 'calendar-outline', label: 'Timecards', color: '#8B5CF6' },
  ];

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
          <Text style={styles.greeting}>Welcome back, {userName} 👋</Text>
          <Text style={styles.pageTitle}>Dashboard</Text>
        </View>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={[styles.statsGrid, isLargeScreen && styles.statsGridLarge]}>
        {statCards.map((card, index) => (
          <Pressable 
            key={index} 
            style={({ hovered }) => [
              styles.statCard, 
              hovered && styles.statCardHovered,
              isLargeScreen && styles.statCardLarge
            ]}
          >
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconWrap, { backgroundColor: card.bgColor }]}>
                <Ionicons name={card.icon} size={20} color={card.color} />
              </View>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.text.tertiary} />
            </View>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statTitle}>{card.title}</Text>
            <Text style={styles.statSubtitle}>{card.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      {/* Content Grid */}
      <View style={[styles.contentGrid, isLargeScreen && styles.contentGridLarge]}>
        {/* Active Projects Card */}
        <View style={[styles.card, isLargeScreen && styles.cardWide]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Active Projects</Text>
              <Text style={styles.cardSubtitle}>Currently in progress</Text>
            </View>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{stats.activeProjects}</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            {projectSummary.length > 0 ? (
              <View style={styles.projectList}>
                {projectSummary.map((project) => (
                  <Pressable 
                    key={project.id} 
                    style={({ hovered }) => [styles.projectItem, hovered && styles.projectItemHovered]}
                  >
                    <View style={styles.projectInfo}>
                      <View style={styles.projectDot} />
                      <View style={styles.projectText}>
                        <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
                        {project.customers?.name && (
                          <Text style={styles.projectCustomer} numberOfLines={1}>{project.customers.name}</Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="folder-outline" size={32} color={colors.text.tertiary} />
                </View>
                <Text style={styles.emptyText}>No active projects</Text>
                <Text style={styles.emptySubtext}>Create a project to get started</Text>
              </View>
            )}
          </View>
        </View>

        {/* Labor Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Labor Overview</Text>
              <Text style={styles.cardSubtitle}>This month's activity</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.laborStats}>
              <View style={styles.laborStatItem}>
                <Text style={styles.laborStatValue}>{formatHours(stats.hoursThisMonth)}</Text>
                <Text style={styles.laborStatLabel}>Total Hours</Text>
              </View>
              <View style={styles.laborStatDivider} />
              <View style={styles.laborStatItem}>
                <Text style={styles.laborStatValue}>{stats.clockedInCount}</Text>
                <Text style={styles.laborStatLabel}>Clocked In</Text>
              </View>
            </View>
            <View style={styles.chartContainer}>
              <View style={styles.barChart}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <View key={i} style={styles.barColumn}>
                    <View 
                      style={[
                        styles.bar, 
                        { 
                          height: `${Math.random() * 60 + 20}%`, 
                          backgroundColor: i < 5 ? colors.primary.orange : colors.neutral.lightGray,
                          opacity: i < 5 ? 1 : 0.5,
                        }
                      ]} 
                    />
                    <Text style={styles.barLabel}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <Text style={styles.cardSubtitle}>Common tasks</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.actionsGrid}>
              {quickActions.map((action, index) => (
                <Pressable 
                  key={index} 
                  style={({ hovered }) => [styles.actionItem, hovered && styles.actionItemHovered]}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Team Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Team Status</Text>
              <Text style={styles.cardSubtitle}>Workforce overview</Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.teamStats}>
              <View style={styles.teamStatRow}>
                <View style={styles.teamStatInfo}>
                  <View style={[styles.teamStatusDot, { backgroundColor: colors.semantic.success }]} />
                  <Text style={styles.teamStatLabel}>Active</Text>
                </View>
                <Text style={styles.teamStatValue}>{stats.activeEmployees}</Text>
              </View>
              <View style={styles.teamStatRow}>
                <View style={styles.teamStatInfo}>
                  <View style={[styles.teamStatusDot, { backgroundColor: colors.neutral.lightGray }]} />
                  <Text style={styles.teamStatLabel}>Inactive</Text>
                </View>
                <Text style={styles.teamStatValue}>{stats.totalEmployees - stats.activeEmployees}</Text>
              </View>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: stats.totalEmployees > 0 ? `${(stats.activeEmployees / stats.totalEmployees) * 100}%` : '0%' }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {stats.totalEmployees > 0 
                  ? `${Math.round((stats.activeEmployees / stats.totalEmployees) * 100)}% workforce active` 
                  : 'No team members yet'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.xl 
  },
  greeting: { 
    fontSize: typography.fontSize.md, 
    color: colors.text.secondary, 
    marginBottom: spacing.xxs 
  },
  pageTitle: { 
    fontSize: 28, 
    fontWeight: typography.fontWeight.bold, 
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  dateBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.xs, 
    backgroundColor: colors.neutral.white, 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.xs, 
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dateText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },

  // Stats Grid
  statsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: spacing.md, 
    marginBottom: spacing.xl 
  },
  statsGridLarge: { flexWrap: 'nowrap' },
  statCard: { 
    flex: 1, 
    minWidth: 200,
    backgroundColor: colors.neutral.white, 
    borderRadius: borderRadius.xl, 
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    transitionDuration: '200ms',
  },
  statCardHovered: {
    borderColor: colors.primary.orange,
    transform: [{ translateY: -2 }],
    ...shadows.md,
  },
  statCardLarge: { minWidth: 0 },
  statCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.md 
  },
  statIconWrap: { 
    width: 40, 
    height: 40, 
    borderRadius: borderRadius.md, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  statValue: { 
    fontSize: 32, 
    fontWeight: typography.fontWeight.bold, 
    color: colors.text.primary,
    letterSpacing: -1,
    marginBottom: spacing.xxs,
  },
  statTitle: { 
    fontSize: typography.fontSize.sm, 
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: 2,
  },
  statSubtitle: { 
    fontSize: typography.fontSize.xs, 
    color: colors.text.tertiary 
  },

  // Content Grid
  contentGrid: { gap: spacing.lg },
  contentGridLarge: { flexDirection: 'row', flexWrap: 'wrap' },
  
  // Cards
  card: { 
    flex: 1, 
    minWidth: 300,
    backgroundColor: colors.neutral.white, 
    borderRadius: borderRadius.xl, 
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  cardWide: { minWidth: 400 },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  cardTitle: { 
    fontSize: typography.fontSize.md, 
    fontWeight: typography.fontWeight.semibold, 
    color: colors.text.primary,
    marginBottom: 2,
  },
  cardSubtitle: { 
    fontSize: typography.fontSize.sm, 
    color: colors.text.tertiary 
  },
  cardBadge: { 
    backgroundColor: colors.primary.orange, 
    paddingHorizontal: spacing.sm, 
    paddingVertical: spacing.xxs, 
    borderRadius: borderRadius.full 
  },
  cardBadgeText: { 
    color: colors.neutral.white, 
    fontSize: typography.fontSize.sm, 
    fontWeight: typography.fontWeight.semibold 
  },
  cardContent: { padding: spacing.lg },

  // Project List
  projectList: { gap: spacing.xs },
  projectItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginHorizontal: -spacing.sm,
    transitionDuration: '150ms',
  },
  projectItemHovered: { backgroundColor: colors.neutral.offWhite },
  projectInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  projectDot: { 
    width: 8, 
    height: 8, 
    borderRadius: borderRadius.full, 
    backgroundColor: colors.semantic.success,
    marginRight: spacing.sm 
  },
  projectText: { flex: 1 },
  projectName: { 
    fontSize: typography.fontSize.sm, 
    fontWeight: typography.fontWeight.medium, 
    color: colors.text.primary 
  },
  projectCustomer: { 
    fontSize: typography.fontSize.xs, 
    color: colors.text.tertiary 
  },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.neutral.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: { 
    fontSize: typography.fontSize.md, 
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xxs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },

  // Labor Stats
  laborStats: { 
    flexDirection: 'row', 
    marginBottom: spacing.lg 
  },
  laborStatItem: { flex: 1 },
  laborStatValue: { 
    fontSize: typography.fontSize.xxl, 
    fontWeight: typography.fontWeight.bold, 
    color: colors.text.primary,
    marginBottom: 2,
  },
  laborStatLabel: { 
    fontSize: typography.fontSize.sm, 
    color: colors.text.tertiary 
  },
  laborStatDivider: {
    width: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.lg,
  },

  // Chart
  chartContainer: { 
    height: 120, 
    backgroundColor: colors.neutral.offWhite, 
    borderRadius: borderRadius.md, 
    padding: spacing.md 
  },
  barChart: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  barColumn: { 
    flex: 1, 
    alignItems: 'center', 
    height: '100%', 
    justifyContent: 'flex-end' 
  },
  bar: { 
    width: '70%', 
    borderRadius: borderRadius.xs, 
    marginBottom: spacing.xs 
  },
  barLabel: { 
    fontSize: 10, 
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },

  // Actions Grid
  actionsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: spacing.sm 
  },
  actionItem: { 
    alignItems: 'center', 
    width: '23%', 
    minWidth: 70,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    transitionDuration: '150ms',
  },
  actionItemHovered: { backgroundColor: colors.neutral.offWhite },
  actionIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: borderRadius.md, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: spacing.xs 
  },
  actionLabel: { 
    fontSize: typography.fontSize.xs, 
    color: colors.text.secondary, 
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },

  // Team Stats
  teamStats: { marginBottom: spacing.lg },
  teamStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  teamStatInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamStatusDot: { width: 10, height: 10, borderRadius: borderRadius.full },
  teamStatLabel: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  teamStatValue: { 
    fontSize: typography.fontSize.md, 
    fontWeight: typography.fontWeight.semibold, 
    color: colors.text.primary 
  },

  // Progress
  progressContainer: { gap: spacing.xs },
  progressBar: { 
    height: 8, 
    backgroundColor: colors.neutral.offWhite, 
    borderRadius: borderRadius.full, 
    overflow: 'hidden' 
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: colors.semantic.success, 
    borderRadius: borderRadius.full 
  },
  progressText: { 
    fontSize: typography.fontSize.sm, 
    color: colors.text.tertiary 
  },
});