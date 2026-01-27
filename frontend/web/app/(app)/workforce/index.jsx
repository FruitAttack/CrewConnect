import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getActiveRoster, getCostCodes, getUserProfile, getTimeEntries } from '../../../utils/api';
import { calculateHoursInRange } from '../../../utils/timeUtils';
import { colors, shadows } from '../../../constants/theme';

const COLORS = {
  active: "#10b981",    // Emerald green
  warning: "#f59e0b",   // Amber
  info: "#3b82f6",      // Blue
  purple: "#8b5cf6",    // Purple
  orange: "#f97316",    // Orange
};

const ROLE_COLORS = {
  admin: '#8b5cf6',
  supervisor: '#3b82f6', 
  foreman: '#f97316',
  laborer: '#10b981',
  office: '#6b7280',
  unassigned: '#d1d5db',
};

const ROLE_LABELS = {
  admin: 'Admins',
  supervisor: 'Supervisors',
  foreman: 'Foremen',
  laborer: 'Laborers',
  office: 'Office',
  unassigned: 'Unassigned',
};

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Pulsing Dot for active/clocked-in status (positioned absolutely on avatars)
const PulsingDot = ({ color = COLORS.active, size = 10 }) => {
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

// Inline Pulsing Dot for status text rows (matches live.jsx style)
const InlinePulsingDot = ({ color = COLORS.active, size = 6 }) => {
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
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.3, transform: [{ scale: pulseAnim }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
};

// Live Status Card - prominent, actionable
const LiveCard = ({ icon, label, value, subtitle, trend, color = COLORS.active, onPress, highlight }) => (
  <Pressable style={({ hovered }) => [styles.liveCard, highlight && styles.liveCardHighlight, hovered && styles.liveCardHovered]} onPress={onPress}>
    <View style={styles.liveCardHeader}>
      <View style={[styles.liveCardIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      {trend && (
        <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? COLORS.active + '15' : COLORS.warning + '15' }]}>
          <Ionicons name={trend > 0 ? 'trending-up' : 'trending-down'} size={12} color={trend > 0 ? COLORS.active : COLORS.warning} />
          <Text style={[styles.trendText, { color: trend > 0 ? COLORS.active : COLORS.warning }]}>{Math.abs(trend)}%</Text>
        </View>
      )}
    </View>
    <Text style={[styles.liveCardValue, highlight && { color }]}>{value}</Text>
    <Text style={styles.liveCardLabel}>{label}</Text>
    {subtitle && <Text style={styles.liveCardSubtitle}>{subtitle}</Text>}
    <View style={styles.liveCardAction}>
      <Text style={[styles.liveCardActionText, { color }]}>View details</Text>
      <Ionicons name="arrow-forward" size={12} color={color} />
    </View>
  </Pressable>
);

// Role Pill for distribution
const RolePill = ({ role, count, total, onPress }) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = ROLE_COLORS[role] || ROLE_COLORS.unassigned;
  return (
    <Pressable style={({ hovered }) => [styles.rolePill, hovered && styles.rolePillHovered]} onPress={onPress}>
      <View style={[styles.rolePillDot, { backgroundColor: color }]} />
      <Text style={styles.rolePillLabel}>{ROLE_LABELS[role] || role}</Text>
      <Text style={styles.rolePillCount}>{count}</Text>
      <Text style={styles.rolePillPercent}>({percentage}%)</Text>
    </Pressable>
  );
};

// Quick Action Card
const QuickAction = ({ icon, label, description, badge, onPress }) => (
  <Pressable style={({ hovered }) => [styles.quickAction, hovered && styles.quickActionHovered]} onPress={onPress}>
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={20} color={colors.text.secondary} />
    </View>
    <View style={styles.quickActionText}>
      <View style={styles.quickActionLabelRow}>
        <Text style={styles.quickActionLabel}>{label}</Text>
        {badge > 0 && (
          <View style={styles.quickActionBadge}>
            <Text style={styles.quickActionBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
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
  const [roster, setRoster] = useState([]);
  const [costCodes, setCostCodes] = useState([]);
  const [weeklyHours, setWeeklyHours] = useState(0);

  // Get start and end of current week (Sunday to Saturday)
  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Format as YYYY-MM-DD for the API
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    return { 
      startOfWeek: formatDate(startOfWeek), 
      endOfWeek: formatDate(endOfWeek),
      startDate: startOfWeek,
      endDate: endOfWeek,
    };
  };

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const meRes = await getUserProfile(token);
      const cid = meRes?.data?.user?.default_company_id;
      setCompanyId(cid);

      if (cid) {
        const { startOfWeek, endOfWeek, startDate, endDate } = getWeekRange();
        
        const [rosterRes, ccRes, timeRes] = await Promise.all([
          getActiveRoster(token, cid),
          getCostCodes(token),
          getTimeEntries(token, cid, { 
            start_date: startOfWeek,
            end_date: endOfWeek,
            all_users: 'true',
          }).catch((err) => { console.error('Time entries error:', err); return { data: [] }; }),
        ]);
        
        const rosterData = rosterRes?.data?.roster || [];
        setRoster(rosterData);
        const users = rosterData.map(r => ({ 
          ...r.user, 
          is_clocked_in: r.is_clocked_in,
          open_entry: r.open_entry,
        })).filter(Boolean);
        setEmployees(users);
        setCostCodes(ccRes?.data || []);
        
        // Calculate weekly hours using the utility that handles midnight splits
        const entries = timeRes?.data || [];
        const hours = calculateHoursInRange(Array.isArray(entries) ? entries : [], startDate, endDate);
        setWeeklyHours(hours);
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
      const { startOfWeek, endOfWeek, startDate, endDate } = getWeekRange();
      
      const [rosterRes, ccRes, timeRes] = await Promise.all([
        getActiveRoster(token, companyId),
        getCostCodes(token),
        getTimeEntries(token, companyId, { 
          start_date: startOfWeek,
          end_date: endOfWeek,
          all_users: 'true',
        }).catch((err) => { console.error('Time entries error:', err); return { data: [] }; }),
      ]);
      
      const rosterData = rosterRes?.data?.roster || [];
      setRoster(rosterData);
      const users = rosterData.map(r => ({ 
        ...r.user, 
        is_clocked_in: r.is_clocked_in,
        open_entry: r.open_entry,
      })).filter(Boolean);
      setEmployees(users);
      setCostCodes(ccRes?.data || []);
      
      const entries = timeRes?.data || [];
      const hours = calculateHoursInRange(Array.isArray(entries) ? entries : [], startDate, endDate);
      setWeeklyHours(hours);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  // Computed stats
  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.is_active);
    const clockedIn = roster.filter(r => r.is_clocked_in);
    const onBreak = roster.filter(r => r.is_clocked_in && r.open_entry?.is_on_break);
    const activeCostCodes = costCodes.filter(c => c.active);
    
    const roleBreakdown = activeEmployees.reduce((acc, e) => {
      const role = e.role_key || 'unassigned';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    // Sort roles by count
    const sortedRoles = Object.entries(roleBreakdown)
      .sort((a, b) => b[1] - a[1]);

    return {
      total: employees.length,
      active: activeEmployees.length,
      inactive: employees.length - activeEmployees.length,
      clockedIn: clockedIn.length,
      onBreak: onBreak.length,
      costCodes: activeCostCodes.length,
      inactiveCostCodes: costCodes.length - activeCostCodes.length,
      roleBreakdown,
      sortedRoles,
    };
  }, [employees, roster, costCodes]);

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary.orange} />}
    >
      {/* Live Status Cards */}
      <View style={styles.liveCardsGrid}>
        <LiveCard 
          icon="radio" 
          label="Clocked In Now" 
          value={stats.clockedIn}
          subtitle={stats.onBreak > 0 ? `${stats.onBreak} on break` : 'Real-time status'}
          color={COLORS.active}
          highlight={stats.clockedIn > 0}
          onPress={() => router.push('/time/live?filter=clocked_in')}
        />
        <LiveCard 
          icon="people" 
          label="Active Employees" 
          value={stats.active}
          subtitle={`${stats.inactive} inactive`}
          color={COLORS.info}
          onPress={() => router.push('/workforce/employees?status=active')}
        />
        <LiveCard 
          icon="pricetag" 
          label="Cost Codes" 
          value={stats.costCodes}
          subtitle={stats.inactiveCostCodes > 0 ? `${stats.inactiveCostCodes} inactive` : 'All active'}
          color={COLORS.purple}
          onPress={() => router.push('/workforce/costCodes?status=active')}
        />
        <LiveCard 
          icon="calendar" 
          label="Hours This Week" 
          value={weeklyHours > 0 ? `${weeklyHours.toFixed(1)}h` : '0h'}
          subtitle="Total team hours"
          color={COLORS.orange}
          onPress={() => router.push('/time/timecards')}
        />
      </View>

      {/* Role Distribution */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Team Composition</Text>
          <Pressable onPress={() => router.push('/workforce/employees')}>
            <Text style={styles.seeAll}>Manage team</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          {/* Visual bar */}
          <View style={styles.roleBar}>
            {stats.sortedRoles.map(([role, count]) => {
              const width = stats.active > 0 ? (count / stats.active) * 100 : 0;
              return (
                <View 
                  key={role} 
                  style={[styles.roleBarSegment, { 
                    width: `${width}%`, 
                    backgroundColor: ROLE_COLORS[role] || ROLE_COLORS.unassigned 
                  }]} 
                />
              );
            })}
          </View>
          {/* Role pills */}
          <View style={styles.rolePillsGrid}>
            {stats.sortedRoles.map(([role, count]) => (
              <RolePill 
                key={role} 
                role={role} 
                count={count} 
                total={stats.active}
                onPress={() => router.push('/workforce/employees')}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Two Column Layout */}
      <View style={styles.twoColumn}>
        {/* Quick Actions */}
        <View style={[styles.section, styles.columnLeft]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            <QuickAction 
              icon="person-add-outline" 
              label="Add Employee" 
              description="Invite a new team member"
              onPress={() => router.push('/workforce/employees')} 
            />
            <QuickAction 
              icon="pricetag-outline" 
              label="Add Cost Code" 
              description="Create new tracking code"
              onPress={() => router.push('/workforce/costCodes')} 
            />
            <QuickAction 
              icon="play-outline" 
              label="Clock In Employee" 
              description="Start tracking time"
              onPress={() => router.push('/time/live')} 
            />
            <QuickAction 
              icon="document-text-outline" 
              label="Review Timecards" 
              description="Approve pending entries"
              onPress={() => router.push('/time/timecards')} 
            />
          </View>
        </View>

        {/* Currently Working */}
        <View style={[styles.section, styles.columnRight]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Currently Working</Text>
            <Pressable onPress={() => router.push('/time/live')}>
              <Text style={styles.seeAll}>View all</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {roster.filter(r => r.is_clocked_in).length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="moon-outline" size={24} color={colors.text.tertiary} />
                </View>
                <Text style={styles.emptyTitle}>No one clocked in</Text>
                <Text style={styles.emptySubtitle}>Employees will appear here when working</Text>
              </View>
            ) : (
              roster.filter(r => r.is_clocked_in).slice(0, 5).map((r, idx) => {
                const isOnBreak = r.open_entry?.is_on_break;
                return (
                  <View key={r.user?.id || idx} style={[styles.workingItem, idx === 0 && { borderTopWidth: 0 }]}>
                    <View style={styles.workingAvatar}>
                      <Text style={styles.workingAvatarText}>{getInitials(r.user?.full_name)}</Text>
                    </View>
                    <View style={styles.workingInfo}>
                      <Text style={styles.workingName}>{r.user?.full_name || 'Unknown'}</Text>
                      <Text style={styles.workingTask}>
                        {r.open_entry?.project?.name || 'No project'}
                        {r.open_entry?.cost_code?.code && ` • ${r.open_entry.cost_code.code}`}
                      </Text>
                    </View>
                    <View style={styles.workingStatusRow}>
                      {isOnBreak ? (
                        <>
                          <View style={styles.breakIndicator}>
                            <Ionicons name="pause" size={8} color={COLORS.warning} />
                          </View>
                          <Text style={styles.breakStatusText}>On Break</Text>
                        </>
                      ) : (
                        <>
                          <InlinePulsingDot color={COLORS.active} size={6} />
                          <Text style={styles.clockedInText}>Clocked In</Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  content: { padding: 24, gap: 24 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: colors.text.tertiary },

  // Live Cards Grid
  liveCardsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16,
  },
  liveCard: { 
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.neutral.white, 
    borderRadius: 12, 
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  liveCardHighlight: {
    borderColor: COLORS.active + '40',
    backgroundColor: COLORS.active + '05',
  },
  liveCardHovered: { 
    ...shadows.md,
    transform: [{ translateY: -2 }],
  },
  liveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveCardIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: { fontSize: 11, fontWeight: '600' },
  liveCardValue: { fontSize: 32, fontWeight: '700', color: colors.text.primary, marginBottom: 2 },
  liveCardLabel: { fontSize: 14, fontWeight: '500', color: colors.text.secondary, marginBottom: 2 },
  liveCardSubtitle: { fontSize: 12, color: colors.text.tertiary },
  liveCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  liveCardActionText: { fontSize: 12, fontWeight: '500' },

  // Sections
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  seeAll: { fontSize: 13, fontWeight: '500', color: colors.primary.orange },

  // Card
  card: { 
    backgroundColor: colors.neutral.white, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.border.light,
    overflow: 'hidden',
  },

  // Role Distribution
  roleBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.neutral.offWhite,
  },
  roleBarSegment: {
    height: '100%',
  },
  rolePillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.neutral.offWhite,
  },
  rolePillHovered: {
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  rolePillDot: { width: 8, height: 8, borderRadius: 4 },
  rolePillLabel: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },
  rolePillCount: { fontSize: 12, fontWeight: '600', color: colors.text.primary },
  rolePillPercent: { fontSize: 11, color: colors.text.tertiary },

  // Two Column
  twoColumn: {
    flexDirection: 'row',
    gap: 24,
  },
  columnLeft: { flex: 1, minWidth: 280 },
  columnRight: { flex: 1, minWidth: 280 },

  // Quick Actions
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  quickActionHovered: { backgroundColor: colors.neutral.offWhite },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.neutral.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: { flex: 1 },
  quickActionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickActionLabel: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  quickActionBadge: {
    backgroundColor: colors.primary.orange,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  quickActionBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  quickActionDesc: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },

  // Currently Working
  workingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  workingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.orange + '15',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  workingAvatarText: { fontSize: 11, fontWeight: '600', color: colors.primary.orange },
  workingInfo: { flex: 1 },
  workingName: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  workingTask: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },
  workingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clockedInText: { fontSize: 12, fontWeight: '500', color: COLORS.active },
  breakIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakStatusText: { fontSize: 12, fontWeight: '500', color: COLORS.warning },

  // Empty State
  emptyState: { padding: 32, alignItems: 'center', gap: 8 },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  emptySubtitle: { fontSize: 12, color: colors.text.tertiary, textAlign: 'center' },
});