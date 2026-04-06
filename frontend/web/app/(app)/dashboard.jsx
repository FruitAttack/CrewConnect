import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, useWindowDimensions, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSession } from '../../utils/ctx';
import { useRouter } from 'expo-router';
import { getProjects, getDashboard, getAllUsers, getUserProfile, getTimeEntries, getActiveRoster } from '../../utils/api';
import { calculateHoursInRange } from '../../utils/timeUtils';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';

export default function Dashboard() {
  const { session } = useSession();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const [weekdayHours, setWeekdayHours] = useState([0, 0, 0, 0, 0, 0, 0]);
  const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  function formatYYYYMMDDLocal(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();

    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return {
      startDate: start,
      endDate: end,
      startStr: formatYYYYMMDDLocal(start),
      endStr: formatYYYYMMDDLocal(end),
    };
  }

  function getMonthRange() {
    const now = new Date();

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    return {
      startDate: start,
      endDate: end,
      startStr: formatYYYYMMDDLocal(start),
      endStr: formatYYYYMMDDLocal(end),
    };
  }

  function extractList(resValue) {
    const data = resValue?.data;
    if (Array.isArray(data)) return data;
    return data?.time_entries || data?.entries || data?.timeEntries || [];
  }

  function computeHoursByWeekday(entries, rangeStart, rangeEnd) {
    const totals = [0, 0, 0, 0, 0, 0, 0];

    const cursor = new Date(rangeStart);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(rangeEnd);
    end.setHours(23, 59, 59, 999);

    while (cursor <= end) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);

      const dayHours = calculateHoursInRange(entries, dayStart, dayEnd);

      // getDay(): 0=Sun..6=Sat
      // we want Mon..Sun index: Mon=0..Sun=6
      const jsDay = dayStart.getDay();
      const monFirstIndex = (jsDay + 6) % 7;

      totals[monFirstIndex] += dayHours;

      cursor.setDate(cursor.getDate() + 1);
    }

    return totals;
  }
  
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
  const sessionCompanyId = session?.user?.user_metadata?.default_company_id;

  const [companyId, setCompanyId] = useState(sessionCompanyId || null);

  useEffect(() => {
    let mounted = true;

    async function resolveCompany() {
      if (!token || companyId) return;

      const res = await getUserProfile(token);
      const cid = res?.data?.user?.default_company_id;

      if (mounted && res?.success && cid) {
        setCompanyId(cid);
      }
    }

    resolveCompany();
    return () => { mounted = false; };
  }, [token, companyId]);

  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;

  const userName = session?.user?.user_metadata?.full_name || 
                   session?.user?.user_metadata?.name || 
                   session?.user?.email?.split('@')[0] || 
                   'there';

  const fetchDashboardData = useCallback(async ({ showLoading = false } = {}) => {
    if (!token || !companyId) return;

    if (showLoading) setLoading(true);

    try {
      const week = getWeekRange();
      const month = getMonthRange();

      const [
        projectsRes,
        usersRes,
        rosterRes,
        weekEntriesRes,
        monthEntriesRes,
      ] = await Promise.allSettled([
        getProjects(token, companyId),
        getAllUsers(token, { company_id: companyId }),
        getActiveRoster(token, companyId),
        getTimeEntries(token, companyId, {
          start_date: week.startStr,
          end_date: week.endStr,
          all_users: 'true',
        }),
        getTimeEntries(token, companyId, {
          start_date: month.startStr,
          end_date: month.endStr,
          all_users: 'true',
        }),
      ]);

      if (projectsRes.status === 'fulfilled' && projectsRes.value?.success) {
        const projects = projectsRes.value?.data?.projects || [];
        const active = projects.filter(p => p.active);
        const inactive = projects.filter(p => !p.active);

        setStats(prev => ({
          ...prev,
          activeProjects: active.length,
          completedProjects: inactive.length,
        }));

        setProjectSummary(active);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value?.success) {
        const users = usersRes.value?.data?.users || usersRes.value?.data || [];
        setStats(prev => ({
          ...prev,
          totalEmployees: users.length,
          activeEmployees: users.filter(u => u.is_active).length,
        }));
      }

      if (rosterRes.status === 'fulfilled' && rosterRes.value?.success) {
        const roster = rosterRes.value?.data?.roster || [];
        const clockedInCount = roster.filter(r => r.is_clocked_in).length;

        setStats(prev => ({
          ...prev,
          clockedInCount,
        }));
      }

      const weekEntries =
        weekEntriesRes.status === 'fulfilled' ? extractList(weekEntriesRes.value) : [];
      const monthEntries =
        monthEntriesRes.status === 'fulfilled' ? extractList(monthEntriesRes.value) : [];

      const hoursThisWeek = calculateHoursInRange(weekEntries, week.startDate, week.endDate);
      const hoursThisMonth = calculateHoursInRange(monthEntries, month.startDate, month.endDate);

      setStats(prev => ({
        ...prev,
        hoursThisWeek,
        hoursThisMonth,
      }));

      const byWeekday = computeHoursByWeekday(monthEntries, month.startDate, month.endDate);
      setWeekdayHours(byWeekday);

    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    if (companyId) {
      fetchDashboardData({ showLoading: true });
    }
  }, [companyId, fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData({ showLoading: false }); 
    setRefreshing(false);
  }, [fetchDashboardData]);

  const formatHours = (hours) => {
    if (typeof hours !== 'number') return '0h';
    return Math.round(hours * 10) / 10 + 'h';
  };

  const handleProjectPress = useCallback((project) => {
    router.push(`/(app)/project/projectsOverview?projectId=${encodeURIComponent(project.id)}`);
  }, [router]);

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

  const maxWeekday = Math.max(...weekdayHours, 0);

  // loading animation until we have dashboard data
  if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary.orange} />
      <Text style={styles.loadingText}>Loading dashboard...</Text>
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
                <ScrollView
                  style={styles.projectListScroll}
                  contentContainerStyle={styles.projectList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  {projectSummary.map((project) => (
                    <Pressable
                      key={project.id}
                      onPress={() => handleProjectPress(project)}
                      style={({ hovered }) => [
                        styles.projectItem,
                        hovered && styles.projectItemHovered,
                      ]}
                    >
                      <View style={styles.projectInfo}>
                        <View style={styles.projectDot} />
                        <View style={styles.projectText}>
                          <Text style={styles.projectName} numberOfLines={1}>
                            {project.name}
                          </Text>
                          {project.customers?.name && (
                            <Text style={styles.projectCustomer} numberOfLines={1}>
                              {project.customers.name}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={{ marginRight: 8 }}>
                      <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                    </View>
                    </Pressable>
                  ))}
                </ScrollView>
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
              <Text style={styles.cardSubtitle}>This month&apos;s activity</Text>
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
              <ResponsiveContainer width="100%" height={110}>
                <BarChart
                  data={WEEKDAY_LABELS.map((day, i) => ({ day, hours: parseFloat((weekdayHours[i] || 0).toFixed(1)), weekend: i >= 5 }))}
                  margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                  barCategoryGap="25%"
                >
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: colors.text.tertiary }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: colors.text.tertiary }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
                  <Tooltip formatter={v => [`${v}h`, 'Hours']} contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${colors.border.light}` }} cursor={{ fill: colors.neutral.offWhite }} />
                  <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
                    {WEEKDAY_LABELS.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? colors.primary.orange : colors.neutral.lightGray} opacity={i < 5 ? 1 : 0.5} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
                  onPress={() => {
                    if (action.label === 'New Project') {
                      router.push('/(app)/projects?create=true');
                    }
                    else if (action.label === 'Add Employee') {
                      router.push('/(app)/workforce/employees?addNew=true');
                    }
                    else if (action.label === 'View Reports') {
                      router.push('/(app)/reports');
                    }
                    else if (action.label === 'Timecards') {
                      router.push('/(app)/time/timecards')
                    }
                  }}
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
  projectListScroll: {
  maxHeight: 280,
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
    backgroundColor: colors.neutral.offWhite,
    borderRadius: borderRadius.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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

  // Load animation
  loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#F8FAFC',
},
loadingText: {
  marginTop: spacing.md,
  fontSize: typography.fontSize.md,
  color: colors.text.secondary,
},
});