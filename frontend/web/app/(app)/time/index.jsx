import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '../../../utils/ctx';
import { getTimeEntries, getUserProfile } from '../../../utils/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';

const OT_THRESHOLD = 40;
const OT_WARNING = 35;

// Calendar Dropdown
const CalendarDropdown = ({ selectedDate, onSelect, onClose, view }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  
  const isSelected = (day) => {
    if (!day) return false;
    const d = new Date(year, month, day);
    if (view === 'week') {
      const selStart = new Date(selectedDate);
      selStart.setDate(selStart.getDate() - selStart.getDay());
      const selEnd = new Date(selStart);
      selEnd.setDate(selEnd.getDate() + 6);
      return d >= selStart && d <= selEnd;
    }
    if (view === 'month') {
      return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    }
    return d.toDateString() === selectedDate.toDateString();
  };
  
  const isToday = (day) => day && new Date(year, month, day).toDateString() === new Date().toDateString();
  
  const selectDay = (day) => { if (day) { onSelect(new Date(year, month, day)); onClose(); } };
  const quickSelect = (type) => {
    const now = new Date();
    if (type === 'today') onSelect(now);
    else if (type === 'thisWeek') { const d = new Date(); d.setDate(d.getDate() - d.getDay()); onSelect(d); }
    else if (type === 'lastWeek') { const d = new Date(); d.setDate(d.getDate() - d.getDay() - 7); onSelect(d); }
    else if (type === 'thisMonth') onSelect(new Date(now.getFullYear(), now.getMonth(), 1));
    else if (type === 'lastMonth') onSelect(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    onClose();
  };

  return (
    <View style={cs.container}>
      <View style={cs.quickSelect}>
        <Pressable style={cs.quickBtn} onPress={() => quickSelect('today')}><Text style={cs.quickText}>Today</Text></Pressable>
        <Pressable style={cs.quickBtn} onPress={() => quickSelect('thisWeek')}><Text style={cs.quickText}>This Week</Text></Pressable>
        <Pressable style={cs.quickBtn} onPress={() => quickSelect('lastWeek')}><Text style={cs.quickText}>Last Week</Text></Pressable>
        <Pressable style={cs.quickBtn} onPress={() => quickSelect('thisMonth')}><Text style={cs.quickText}>This Month</Text></Pressable>
        <Pressable style={cs.quickBtn} onPress={() => quickSelect('lastMonth')}><Text style={cs.quickText}>Last Month</Text></Pressable>
      </View>
      <View style={cs.divider} />
      <View style={cs.header}>
        <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} style={cs.navBtn}><Ionicons name="chevron-back" size={16} color={colors.text.secondary} /></Pressable>
        <Text style={cs.monthYear}>{months[month]} {year}</Text>
        <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} style={cs.navBtn}><Ionicons name="chevron-forward" size={16} color={colors.text.secondary} /></Pressable>
      </View>
      <View style={cs.weekDays}>{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <Text key={d} style={cs.weekDay}>{d}</Text>)}</View>
      <View style={cs.days}>
        {days.map((day, i) => (
          <Pressable key={i} style={[cs.day, isSelected(day) && cs.daySelected, isToday(day) && !isSelected(day) && cs.dayToday]} onPress={() => selectDay(day)} disabled={!day}>
            <Text style={[cs.dayText, isSelected(day) && cs.dayTextSelected, isToday(day) && !isSelected(day) && cs.dayTextToday]}>{day || ''}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const cs = StyleSheet.create({
  container: { position: 'absolute', top: '100%', left: 0, marginTop: 4, backgroundColor: colors.neutral.white, borderRadius: 10, padding: 12, ...shadows.lg, zIndex: 1000, minWidth: 280, borderWidth: 1, borderColor: colors.border.light },
  quickSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  quickBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.neutral.offWhite, borderRadius: 4 },
  quickText: { fontSize: 11, fontWeight: '500', color: colors.text.secondary },
  divider: { height: 1, backgroundColor: colors.border.light, marginVertical: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  navBtn: { padding: 4 },
  monthYear: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  weekDays: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '600', color: colors.text.tertiary },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  day: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  daySelected: { backgroundColor: colors.primary.orange },
  dayToday: { backgroundColor: colors.primary.orangeSubtle },
  dayText: { fontSize: 12, color: colors.text.primary },
  dayTextSelected: { color: '#fff', fontWeight: '600' },
  dayTextToday: { color: colors.primary.orange, fontWeight: '600' },
});

export default function TimeOverview() {
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const router = useRouter();
  const isLarge = width >= 1200;
  const calendarRef = useRef(null);
  
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [showCalendar, setShowCalendar] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);
  
  const token = session?.access_token;

  useEffect(() => {
    if (Platform.OS === 'web' && showCalendar) {
      const handleClick = (e) => { if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false); };
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showCalendar]);

  useEffect(() => {
    async function init() {
      if (!token) return;
      const res = await getUserProfile(token);
      if (res.success && res.data?.user?.default_company_id) setCompanyId(res.data.user.default_company_id);
    }
    init();
  }, [token]);

  const getDateRange = useCallback((date, v) => {
    const start = new Date(date);
    const end = new Date(date);
    if (v === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (v === 'week') {
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (v === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, []);

  // Generate all days in the period
  const periodDays = useMemo(() => {
    const { start, end } = getDateRange(selectedDate, view);
    const days = [];
    const d = new Date(start);
    while (d <= end) {
      days.push({ 
        date: new Date(d), 
        key: d.toISOString().split('T')[0], 
        day: d.toLocaleDateString('en-US', { weekday: 'short' }), 
        num: d.getDate(), 
        month: d.getMonth(),
        isToday: d.toDateString() === new Date().toDateString() 
      });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [selectedDate, view, getDateRange]);

  // Generate weeks for month view
  const weeksInMonth = useMemo(() => {
    if (view !== 'month') return [];
    const { start, end } = getDateRange(selectedDate, 'month');
    const weeks = [];
    
    // Start from the Sunday of the week containing the 1st
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    while (weekStart <= end) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Only include weeks that have days in this month
      const effectiveStart = new Date(Math.max(weekStart.getTime(), start.getTime()));
      const effectiveEnd = new Date(Math.min(weekEnd.getTime(), end.getTime()));
      
      weeks.push({
        start: new Date(weekStart),
        end: new Date(weekEnd),
        effectiveStart,
        effectiveEnd,
        label: `${effectiveStart.getMonth() + 1}/${effectiveStart.getDate()}-${effectiveEnd.getMonth() + 1}/${effectiveEnd.getDate()}`,
        keys: []
      });
      
      // Generate keys for all days in this week that fall within the month
      const d = new Date(effectiveStart);
      while (d <= effectiveEnd) {
        weeks[weeks.length - 1].keys.push(d.toISOString().split('T')[0]);
        d.setDate(d.getDate() + 1);
      }
      
      weekStart.setDate(weekStart.getDate() + 7);
    }
    return weeks;
  }, [selectedDate, view, getDateRange]);

  const fetchData = useCallback(async () => {
    if (!token || !companyId) { setLoading(false); return; }
    try {
      const { start, end } = getDateRange(selectedDate, view);
      const res = await getTimeEntries(token, companyId, { start_date: start.toISOString().split('T')[0], end_date: end.toISOString().split('T')[0], all_users: 'true' });
      if (res.success) setTimeEntries(res.data?.time_entries || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, companyId, getDateRange, selectedDate, view]);

  useEffect(() => { if (companyId) { setLoading(true); fetchData(); } }, [companyId, fetchData]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchData(); setRefreshing(false); }, [fetchData]);

  // Process data
  const { employees, projects, chartData, stats } = useMemo(() => {
    const empMap = {}, projMap = {}, dailyHours = {};
    
    // Initialize daily hours for all days in period
    periodDays.forEach(d => dailyHours[d.key] = 0);
    
    timeEntries.forEach(e => {
      const uid = e.user_id;
      if (!empMap[uid]) empMap[uid] = { id: uid, name: e.user?.full_name || 'Unknown', email: e.user?.email, hours: 0, dailyHours: {}, isActive: false, activeProject: null, clockIn: null };
      
      const clockIn = new Date(e.clock_in);
      const clockOut = e.clock_out ? new Date(e.clock_out) : new Date();
      const hrs = Math.max(0, (clockOut - clockIn) / 3600000 - (e.break_minutes || 0) / 60);
      const dayKey = clockIn.toISOString().split('T')[0];
      
      empMap[uid].hours += hrs;
      empMap[uid].dailyHours[dayKey] = (empMap[uid].dailyHours[dayKey] || 0) + hrs;
      if (!e.clock_out) { empMap[uid].isActive = true; empMap[uid].activeProject = e.project?.name; empMap[uid].clockIn = clockIn; }
      
      // Add to daily totals
      if (dailyHours[dayKey] !== undefined) dailyHours[dayKey] += hrs;
      
      const pname = e.project?.name || 'Unassigned';
      if (!projMap[pname]) projMap[pname] = { name: pname, hours: 0, entries: 0 };
      projMap[pname].hours += hrs;
      projMap[pname].entries++;
    });

    const empList = Object.values(empMap).sort((a, b) => b.hours - a.hours);
    const projList = Object.values(projMap).sort((a, b) => b.hours - a.hours);
    
    // Build chart data based on view
    let chart = [];
    if (view === 'month') {
      // Aggregate by week
      chart = weeksInMonth.map(week => {
        const weekHours = week.keys.reduce((sum, key) => sum + (dailyHours[key] || 0), 0);
        return {
          label: week.label,
          hours: weekHours,
          isToday: week.keys.some(k => k === new Date().toISOString().split('T')[0])
        };
      });
    } else {
      // Daily data
      chart = periodDays.map(d => ({
        label: d.day,
        hours: dailyHours[d.key] || 0,
        isToday: d.isToday
      }));
    }

    const totalHrs = empList.reduce((s, e) => s + e.hours, 0);
    const otHrs = empList.reduce((s, e) => s + Math.max(0, e.hours - OT_THRESHOLD), 0);
    const activeCount = empList.filter(e => e.isActive).length;
    const inOT = empList.filter(e => e.hours >= OT_THRESHOLD).length;
    const nearOT = empList.filter(e => e.hours >= OT_WARNING && e.hours < OT_THRESHOLD).length;

    return {
      employees: empList,
      projects: projList,
      chartData: chart,
      stats: { totalHrs, otHrs, workers: empList.length, active: activeCount, inOT, nearOT, projects: projList.length }
    };
  }, [timeEntries, periodDays, weeksInMonth, view]);

  const maxChartValue = Math.max(...chartData.map(d => d.hours), 1);
  const maxProj = Math.max(...projects.slice(0, 8).map(p => p.hours), 1);

  const navPeriod = (dir) => {
    const d = new Date(selectedDate);
    if (view === 'day') d.setDate(d.getDate() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else if (view === 'month') d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };

  const formatRange = () => {
    const { start, end } = getDateRange(selectedDate, view);
    if (view === 'day') return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (view === 'month') return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getInitials = (n) => n?.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase() || '??';

  if (loading) return <View style={s.loading}><ActivityIndicator color={colors.primary.orange} /><Text style={s.loadingText}>Loading...</Text></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.viewToggle}>
            {['day', 'week', 'month'].map(v => (
              <Pressable key={v} style={[s.viewBtn, view === v && s.viewBtnActive]} onPress={() => setView(v)}>
                <Text style={[s.viewText, view === v && s.viewTextActive]}>{v.charAt(0).toUpperCase() + v.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          
          <View style={s.datePickerWrap} ref={calendarRef}>
            <View style={s.dateNav}>
              <Pressable onPress={() => navPeriod(-1)} style={s.navBtn}><Ionicons name="chevron-back" size={16} color={colors.text.secondary} /></Pressable>
              <Pressable onPress={() => setShowCalendar(!showCalendar)} style={s.dateBtn}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary.orange} />
                <Text style={s.dateRange}>{formatRange()}</Text>
                <Ionicons name="chevron-down" size={12} color={colors.text.tertiary} />
              </Pressable>
              <Pressable onPress={() => navPeriod(1)} style={s.navBtn}><Ionicons name="chevron-forward" size={16} color={colors.text.secondary} /></Pressable>
            </View>
            {showCalendar && <CalendarDropdown selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setShowCalendar(false)} view={view} />}
          </View>
        </View>
        
        <View style={s.headerRight}>
          <Pressable style={s.actionBtn} onPress={() => router.push('/time/timecards')}><Text style={s.actionText}>Review Timecards</Text></Pressable>
          <Pressable style={s.actionBtnPrimary} onPress={() => router.push('/time/reports')}><Ionicons name="document-text-outline" size={14} color="#fff" /><Text style={s.actionTextPrimary}>Reports</Text></Pressable>
        </View>
      </View>

      {/* OT Alert */}
      {(stats.inOT > 0 || stats.nearOT > 0) && (
        <Pressable style={[s.alert, stats.inOT > 0 ? s.alertError : s.alertWarn]}>
          <Ionicons name={stats.inOT > 0 ? "alert-circle" : "warning"} size={16} color={stats.inOT > 0 ? colors.semantic.error : colors.semantic.warning} />
          <Text style={s.alertText}>
            {stats.inOT > 0 && <Text style={s.alertBold}>{stats.inOT} in overtime</Text>}
            {stats.inOT > 0 && stats.nearOT > 0 && ' · '}
            {stats.nearOT > 0 && <Text>{stats.nearOT} approaching 40h</Text>}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.text.tertiary} />
        </Pressable>
      )}

      {/* Stats Row */}
      <View style={s.statsRow}>
        <View style={s.stat}><Text style={s.statValue}>{stats.totalHrs.toFixed(1)}</Text><Text style={s.statLabel}>Total Hours</Text></View>
        <View style={s.statDivider} />
        <View style={s.stat}><Text style={[s.statValue, stats.otHrs > 0 && s.statValueOT]}>{stats.otHrs.toFixed(1)}</Text><Text style={s.statLabel}>Overtime</Text></View>
        <View style={s.statDivider} />
        <View style={s.stat}><Text style={s.statValue}>{stats.workers}</Text><Text style={s.statLabel}>Workers</Text></View>
        <View style={s.statDivider} />
        <View style={s.stat}><View style={s.activeIndicator}><View style={s.activeDot} /><Text style={s.statValue}>{stats.active}</Text></View><Text style={s.statLabel}>Clocked In</Text></View>
        <View style={s.statDivider} />
        <View style={s.stat}><Text style={s.statValue}>{stats.projects}</Text><Text style={s.statLabel}>Projects</Text></View>
      </View>

      {/* Main Grid */}
      <View style={[s.grid, isLarge && s.gridLarge]}>
        {/* Left Column */}
        <View style={[s.col, isLarge && s.colMain]}>
          {/* Hours Chart */}
          <View style={s.card}>
            <View style={s.cardHeader}><Text style={s.cardTitle}>Hours by {view === 'day' ? 'Hour' : view === 'month' ? 'Week' : 'Day'}</Text></View>
            <View style={s.chartRow}>
              {chartData.map((d, i) => (
                <Pressable key={i} style={s.barCol} onHoverIn={() => setHoveredBar(i)} onHoverOut={() => setHoveredBar(null)}>
                  {hoveredBar === i && d.hours > 0 && <View style={s.tooltip}><Text style={s.tooltipText}>{d.hours.toFixed(1)}h</Text></View>}
                  <View style={s.barWrap}>
                    <View style={[s.bar, { height: `${(d.hours / maxChartValue) * 100}%`, backgroundColor: d.isToday ? colors.primary.orange : d.hours > 0 ? colors.semantic.info : colors.border.light }]} />
                  </View>
                  <Text style={[s.barLabel, d.isToday && s.barLabelToday, view === 'month' && s.barLabelMonth]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Projects Table */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Hours by Project</Text>
              <Text style={s.cardMeta}>{projects.length} projects</Text>
            </View>
            {projects.length > 0 ? (
              <View style={s.table}>
                {projects.slice(0, 8).map((p, i) => (
                  <View key={p.name} style={s.tableRow}>
                    <Text style={s.tableCell} numberOfLines={1}>{p.name}</Text>
                    <View style={s.progressCell}>
                      <View style={s.progressTrack}><View style={[s.progressFill, { width: `${(p.hours / maxProj) * 100}%`, backgroundColor: ['#E07A40', '#5B8DEF', '#4AA87C', '#D4A84B', '#9078D4', '#C76B8F', '#4CA8B7', '#7BAD5A'][i % 8] }]} /></View>
                    </View>
                    <Text style={s.tableCellRight}>{p.hours.toFixed(1)}h</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={s.emptyText}>No project data</Text>}
          </View>
        </View>

        {/* Right Column */}
        <View style={[s.col, isLarge && s.colSide]}>
          {/* Currently Working */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardTitleRow}><View style={s.liveDot} /><Text style={s.cardTitle}>Currently Working</Text></View>
              <Text style={s.cardMeta}>{stats.active}</Text>
            </View>
            {employees.filter(e => e.isActive).length > 0 ? (
              <View style={s.list}>
                {employees.filter(e => e.isActive).slice(0, 6).map(e => {
                  const elapsed = e.clockIn ? ((new Date() - e.clockIn) / 3600000).toFixed(1) : '0';
                  const isOT = parseFloat(elapsed) >= 8;
                  return (
                    <View key={e.id} style={s.listItem}>
                      <View style={[s.avatar, isOT && s.avatarOT]}><Text style={[s.avatarText, isOT && s.avatarTextOT]}>{getInitials(e.name)}</Text></View>
                      <View style={s.listInfo}>
                        <Text style={s.listName}>{e.name}</Text>
                        <Text style={s.listMeta}>{e.activeProject || 'No project'}</Text>
                      </View>
                      <Text style={[s.listValue, isOT && s.listValueOT]}>{elapsed}h</Text>
                    </View>
                  );
                })}
              </View>
            ) : <Text style={s.emptyText}>No one clocked in</Text>}
          </View>

          {/* OT Watch */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>OT Watch</Text>
              <Text style={[s.cardMeta, stats.inOT > 0 && s.cardMetaError]}>{stats.inOT + stats.nearOT} at risk</Text>
            </View>
            {employees.filter(e => e.hours >= OT_WARNING).length > 0 ? (
              <View style={s.list}>
                {employees.filter(e => e.hours >= OT_WARNING).slice(0, 6).map(e => {
                  const isOT = e.hours >= OT_THRESHOLD;
                  const pct = Math.min((e.hours / OT_THRESHOLD) * 100, 100);
                  return (
                    <View key={e.id} style={s.listItem}>
                      <View style={[s.avatar, isOT && s.avatarOT]}><Text style={[s.avatarText, isOT && s.avatarTextOT]}>{getInitials(e.name)}</Text></View>
                      <View style={s.listInfo}>
                        <View style={s.listNameRow}>
                          <Text style={s.listName}>{e.name}</Text>
                          {isOT && <View style={s.otBadge}><Text style={s.otBadgeText}>OT</Text></View>}
                        </View>
                        <View style={s.otProgress}><View style={[s.otProgressFill, { width: `${pct}%`, backgroundColor: isOT ? colors.semantic.error : colors.semantic.warning }]} /></View>
                      </View>
                      <Text style={[s.listValue, isOT && s.listValueOT]}>{e.hours.toFixed(1)}h</Text>
                    </View>
                  );
                })}
              </View>
            ) : <Text style={s.emptyText}>No overtime concerns</Text>}
          </View>

          {/* Top Workers */}
          <View style={s.card}>
            <View style={s.cardHeader}><Text style={s.cardTitle}>Top Workers</Text></View>
            {employees.length > 0 ? (
              <View style={s.list}>
                {employees.slice(0, 6).map((e, i) => (
                  <View key={e.id} style={s.listItem}>
                    <Text style={s.rank}>{i + 1}</Text>
                    <View style={s.listInfo}><Text style={s.listName}>{e.name}</Text></View>
                    <Text style={s.listValue}>{e.hours.toFixed(1)}h</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={s.emptyText}>No workers this period</Text>}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.background },
  content: { padding: 20, paddingBottom: 40 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: colors.text.tertiary },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12, zIndex: 1001 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  viewToggle: { flexDirection: 'row', backgroundColor: colors.neutral.offWhite, borderRadius: 8, padding: 4 },
  viewBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  viewBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  viewText: { fontSize: 13, fontWeight: '500', color: colors.text.tertiary },
  viewTextActive: { color: colors.text.primary },
  
  datePickerWrap: { position: 'relative', zIndex: 1001 },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  navBtn: { padding: 6, borderRadius: 4 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.neutral.offWhite },
  dateRange: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.border.default },
  actionText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  actionBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.primary.orange },
  actionTextPrimary: { fontSize: 13, fontWeight: '500', color: '#fff' },

  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginBottom: 16 },
  alertWarn: { backgroundColor: colors.semantic.warningLight },
  alertError: { backgroundColor: colors.semantic.errorLight },
  alertText: { flex: 1, fontSize: 12, color: colors.text.secondary },
  alertBold: { fontWeight: '600', color: colors.text.primary },

  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, borderRadius: 8, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border.light },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },
  statValueOT: { color: colors.semantic.error },
  statLabel: { fontSize: 10, color: colors.text.tertiary, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border.light },
  activeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.semantic.success },

  grid: { flexDirection: 'column', gap: 16 },
  gridLarge: { flexDirection: 'row' },
  col: { flex: 1, gap: 16 },
  colMain: { flex: 2 },
  colSide: { flex: 1, maxWidth: 340 },

  card: { backgroundColor: colors.neutral.white, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: colors.border.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 12, fontWeight: '600', color: colors.text.primary },
  cardMeta: { fontSize: 11, color: colors.text.tertiary },
  cardMetaError: { color: colors.semantic.error },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.semantic.success },

  chartRow: { flexDirection: 'row', height: 100, gap: 2 },
  barCol: { flex: 1, alignItems: 'center', position: 'relative' },
  barWrap: { flex: 1, width: '80%', justifyContent: 'flex-end', marginBottom: 3 },
  bar: { width: '100%', borderRadius: 2, minHeight: 2 },
  barLabel: { fontSize: 9, color: colors.text.tertiary },
  barLabelToday: { color: colors.primary.orange, fontWeight: '600' },
  barLabelMonth: { fontSize: 8 },
  tooltip: { position: 'absolute', top: -2, backgroundColor: colors.neutral.darkGray, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, zIndex: 10 },
  tooltipText: { fontSize: 9, color: '#fff', fontWeight: '600' },

  table: { gap: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableCell: { width: 90, fontSize: 11, color: colors.text.secondary },
  progressCell: { flex: 1 },
  progressTrack: { height: 5, backgroundColor: colors.neutral.offWhite, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  tableCellRight: { width: 45, fontSize: 11, fontWeight: '600', color: colors.text.primary, textAlign: 'right' },

  list: { gap: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center' },
  avatarOT: { backgroundColor: colors.semantic.errorLight },
  avatarText: { fontSize: 10, fontWeight: '600', color: colors.text.secondary },
  avatarTextOT: { color: colors.semantic.error },
  listInfo: { flex: 1 },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  listName: { fontSize: 12, fontWeight: '500', color: colors.text.primary },
  listMeta: { fontSize: 10, color: colors.text.tertiary },
  listValue: { fontSize: 12, fontWeight: '600', color: colors.text.primary },
  listValueOT: { color: colors.semantic.error },
  rank: { width: 16, fontSize: 11, fontWeight: '600', color: colors.text.tertiary },
  emptyText: { fontSize: 11, color: colors.text.tertiary, textAlign: 'center', paddingVertical: 12 },

  otBadge: { backgroundColor: colors.semantic.error, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 },
  otBadgeText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  otProgress: { height: 3, backgroundColor: colors.neutral.offWhite, borderRadius: 1, marginTop: 3, overflow: 'hidden' },
  otProgressFill: { height: '100%', borderRadius: 1 },
});