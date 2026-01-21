import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, RefreshControl, ActivityIndicator, TextInput, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../../utils/ctx';
import { getTimeEntries, getUserProfile } from '../../../utils/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';

// Date Picker Dropdown Component
const DatePickerDropdown = ({ selectedDate, onSelectDate }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isSelected = (day) => day && new Date(year, month, day).toDateString() === selectedDate.toDateString();
  const isToday = (day) => day && new Date(year, month, day).toDateString() === new Date().toDateString();

  return (
    <View style={dpStyles.container}>
      <View style={dpStyles.header}>
        <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} style={dpStyles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.text.secondary} />
        </Pressable>
        <Text style={dpStyles.monthText}>{monthName}</Text>
        <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} style={dpStyles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </Pressable>
      </View>
      <View style={dpStyles.weekRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <Text key={d} style={dpStyles.weekDay}>{d}</Text>)}
      </View>
      <View style={dpStyles.daysGrid}>
        {days.map((day, idx) => (
          <Pressable key={idx} style={[dpStyles.dayCell, isSelected(day) && dpStyles.dayCellSelected, isToday(day) && !isSelected(day) && dpStyles.dayCellToday]} onPress={() => day && onSelectDate(new Date(year, month, day))} disabled={!day}>
            <Text style={[dpStyles.dayText, isSelected(day) && dpStyles.dayTextSelected, isToday(day) && !isSelected(day) && dpStyles.dayTextToday]}>{day || ''}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const dpStyles = StyleSheet.create({
  container: { position: 'absolute', top: '100%', left: 0, marginTop: spacing.xs, backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.md, ...shadows.lg, zIndex: 100, minWidth: 280, borderWidth: 1, borderColor: colors.border.light },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: { padding: spacing.xs },
  monthText: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDay: { flex: 1, textAlign: 'center', fontSize: typography.fontSize.xs, color: colors.text.tertiary, fontWeight: typography.fontWeight.medium },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md },
  dayCellSelected: { backgroundColor: colors.primary.orange },
  dayCellToday: { backgroundColor: colors.primary.orangeSubtle },
  dayText: { fontSize: typography.fontSize.sm, color: colors.text.primary },
  dayTextSelected: { color: colors.neutral.white, fontWeight: typography.fontWeight.semibold },
  dayTextToday: { color: colors.primary.orange, fontWeight: typography.fontWeight.semibold },
});

// Employee Row Component
const EmployeeRow = ({ employee, weekDays, view, isLargeScreen, isSelected, isExpanded, onToggleSelect, onToggleExpand, getHoursForDay, formatHours, getInitials }) => (
  <View style={styles.employeeRowContainer}>
    <Pressable style={[styles.employeeRow, isSelected && styles.employeeRowSelected]} onPress={onToggleExpand}>
      <Pressable style={styles.checkbox} onPress={(e) => { e.stopPropagation(); onToggleSelect(); }}>
        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={22} color={isSelected ? colors.primary.orange : colors.text.tertiary} />
      </Pressable>
      <View style={styles.employeeInfo}>
        <View style={[styles.avatar, employee.isActive && styles.avatarActive]}>
          <Text style={[styles.avatarText, employee.isActive && styles.avatarTextActive]}>{getInitials(employee.name)}</Text>
          {employee.isActive && <View style={styles.avatarActiveDot} />}
        </View>
        <View style={styles.employeeDetails}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeEmail}>{employee.email || 'No email'}</Text>
        </View>
      </View>
      {view === 'week' && isLargeScreen && weekDays.map(day => {
        const hours = getHoursForDay(employee, day.date);
        return (
          <View key={day.dayNum} style={[styles.dayCell, day.isToday && styles.todayCellBg]}>
            <Text style={[styles.dayCellText, hours > 0 && styles.dayCellTextFilled, hours > 8 && styles.dayCellTextOvertime]}>{formatHours(hours)}</Text>
          </View>
        );
      })}
      <View style={styles.totalCell}><Text style={styles.totalHours}>{employee.totalHours.toFixed(1)}h</Text></View>
      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.text.tertiary} style={{ marginLeft: spacing.xs }} />
    </Pressable>
    {isExpanded && (
      <View style={styles.expandedDetails}>
        <Text style={styles.expandedTitle}>Time Entries</Text>
        {employee.entries.map((entry, idx) => {
          const clockIn = new Date(entry.clock_in);
          const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
          const hours = clockOut ? ((clockOut - clockIn) / (1000 * 60 * 60) - (entry.break_minutes || 0) / 60).toFixed(1) : 'Active';
          return (
            <View key={entry.id || idx} style={styles.entryDetail}>
              <View style={styles.entryDetailLeft}>
                <Text style={styles.entryDate}>{clockIn.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                <Text style={styles.entryProject}>{entry.project?.name || 'No project'}</Text>
              </View>
              <View style={styles.entryDetailRight}>
                <Text style={styles.entryTime}>{clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {clockOut ? clockOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Now'}</Text>
                <Text style={[styles.entryHours, !clockOut && styles.entryHoursActive]}>{hours}{clockOut ? 'h' : ''}</Text>
              </View>
            </View>
          );
        })}
      </View>
    )}
  </View>
);

// Stat Card Component
const StatCard = ({ icon, iconColor, iconBg, value, label, onPress }) => (
  <Pressable style={({ hovered }) => [styles.statCard, hovered && styles.statCardHovered]} onPress={onPress}>
    <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}><Ionicons name={icon} size={20} color={iconColor} /></View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} style={styles.statArrow} />
  </Pressable>
);

// Main Component
export default function Timecards() {
  const { width } = useWindowDimensions();
  const { session } = useSession();
  const isLargeScreen = width >= 1024;
  
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const datePickerRef = useRef(null);
  const token = session?.access_token;

  useEffect(() => {
    async function fetchUserProfile() {
      if (!token) return;
      const response = await getUserProfile(token);
      if (response.success && response.data?.user?.default_company_id) setCompanyId(response.data.user.default_company_id);
    }
    fetchUserProfile();
  }, [token]);

  const getWeekRange = useCallback((date) => {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }, []);

  const weekDays = useMemo(() => {
    const { startDate } = getWeekRange(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      return { date: day, dayName: day.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: day.getDate(), isToday: day.toDateString() === new Date().toDateString() };
    });
  }, [selectedDate, getWeekRange]);

  const fetchTimeEntries = useCallback(async () => {
    if (!token || !companyId) { setLoading(false); return; }
    try {
      setError(null);
      const { startDate, endDate } = view === 'week' ? getWeekRange(selectedDate) : { startDate: selectedDate, endDate: selectedDate };
      const response = await getTimeEntries(token, companyId, { start_date: startDate.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0], all_users: 'true' });
      if (response.success && response.data?.time_entries !== undefined) setTimeEntries(response.data.time_entries);
      else setError(response.message || 'Failed to load time entries');
    } catch (err) { setError('Failed to load time entries'); }
    finally { setLoading(false); }
  }, [token, companyId, getWeekRange, selectedDate, view]);

  useEffect(() => { if (companyId) { setLoading(true); fetchTimeEntries(); } }, [companyId]);
  useEffect(() => { if (companyId && !loading) fetchTimeEntries(); }, [selectedDate, view]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchTimeEntries(); setRefreshing(false); }, [fetchTimeEntries]);

  const employeeData = useMemo(() => {
    const grouped = {};
    timeEntries.forEach(entry => {
      const id = entry.user_id;
      if (!grouped[id]) grouped[id] = { id, name: entry.user?.full_name || 'Unknown', email: entry.user?.email, entries: [], dailyHours: {}, totalHours: 0, isActive: false, activeEntry: null };
      grouped[id].entries.push(entry);
      if (!entry.clock_out) { grouped[id].isActive = true; grouped[id].activeEntry = entry; }
      if (entry.clock_in) {
        const clockIn = new Date(entry.clock_in);
        const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
        const hours = Math.max(0, (clockOut - clockIn) / (1000 * 60 * 60) - (entry.break_minutes || 0) / 60);
        const dayKey = clockIn.toISOString().split('T')[0];
        grouped[id].dailyHours[dayKey] = (grouped[id].dailyHours[dayKey] || 0) + hours;
        grouped[id].totalHours += hours;
      }
    });
    return Object.values(grouped).sort((a, b) => a.isActive === b.isActive ? a.name.localeCompare(b.name) : a.isActive ? -1 : 1);
  }, [timeEntries]);

  const filteredEmployees = useMemo(() => employeeData.filter(emp => !searchQuery || emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.email?.toLowerCase().includes(searchQuery.toLowerCase())), [employeeData, searchQuery]);

  const stats = useMemo(() => ({
    totalHours: filteredEmployees.reduce((sum, emp) => sum + emp.totalHours, 0),
    totalWorkers: filteredEmployees.length,
    totalProjects: new Set(timeEntries.map(e => e.project_id)).size,
    clockedIn: filteredEmployees.filter(e => e.isActive).length,
  }), [filteredEmployees, timeEntries]);

  const navigateDate = (dir) => { const d = new Date(selectedDate); d.setDate(d.getDate() + (view === 'day' ? dir : dir * 7)); setSelectedDate(d); };
  const formatDateHeader = () => { if (view === 'day') return selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); const { startDate, endDate } = getWeekRange(selectedDate); return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; };
  const toggleEmployeeSelection = (id) => setSelectedEmployees(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const selectAllEmployees = () => setSelectedEmployees(selectedEmployees.size === filteredEmployees.length ? new Set() : new Set(filteredEmployees.map(e => e.id)));
  const getHoursForDay = (emp, date) => emp.dailyHours[date.toISOString().split('T')[0]] || 0;
  const formatHours = (h) => h === 0 ? '-' : h.toFixed(1);
  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  useEffect(() => {
    const handleClick = (e) => { if (datePickerRef.current && !datePickerRef.current.contains(e.target)) setShowDatePicker(false); };
    if (showDatePicker && Platform.OS === 'web') { document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick); }
  }, [showDatePicker]);

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary.orange} /><Text style={styles.loadingText}>Loading timecards...</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />}>
      {/* Header */}
      <View style={styles.header}>
        <View><Text style={styles.pageTitle}>Timecards</Text><Text style={styles.subtitle}>Review and approve employee time entries</Text></View>
        <View style={styles.headerActions}>
          <Pressable style={({ hovered }) => [styles.exportButton, hovered && styles.exportButtonHovered]}><Ionicons name="download-outline" size={18} color={colors.text.primary} /><Text style={styles.exportButtonText}>Export</Text></Pressable>
          <Pressable style={[styles.approveButton, selectedEmployees.size === 0 && styles.approveButtonDisabled]} disabled={selectedEmployees.size === 0}>
            <Ionicons name="checkmark-circle-outline" size={18} color={selectedEmployees.size > 0 ? colors.neutral.white : colors.text.tertiary} />
            <Text style={[styles.approveButtonText, selectedEmployees.size === 0 && styles.approveButtonTextDisabled]}>Approve {selectedEmployees.size > 0 ? `(${selectedEmployees.size})` : ''}</Text>
          </Pressable>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
          <Ionicons name="search" size={18} color={searchFocused ? colors.primary.orange : colors.text.tertiary} style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Search employees..." placeholderTextColor={colors.text.tertiary} value={searchQuery} onChangeText={setSearchQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
          {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.text.tertiary} /></Pressable>}
        </View>
        <View style={styles.viewToggle}>
          <Pressable style={[styles.viewToggleBtn, view === 'day' && styles.viewToggleBtnActive]} onPress={() => setView('day')}><Text style={[styles.viewToggleText, view === 'day' && styles.viewToggleTextActive]}>Day</Text></Pressable>
          <Pressable style={[styles.viewToggleBtn, view === 'week' && styles.viewToggleBtnActive]} onPress={() => setView('week')}><Text style={[styles.viewToggleText, view === 'week' && styles.viewToggleTextActive]}>Week</Text></Pressable>
        </View>
      </View>

      {/* Date Nav */}
      <View style={styles.dateNav}>
        <View style={styles.dateSelector}>
          <Pressable style={styles.dateArrow} onPress={() => navigateDate(-1)}><Ionicons name="chevron-back" size={20} color={colors.text.secondary} /></Pressable>
          <View style={styles.datePickerWrapper} ref={datePickerRef}>
            <Pressable style={styles.dateTextButton} onPress={() => setShowDatePicker(!showDatePicker)}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary.orange} style={{ marginRight: spacing.xs }} />
              <Text style={styles.dateText}>{formatDateHeader()}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.text.tertiary} style={{ marginLeft: spacing.xs }} />
            </Pressable>
            {showDatePicker && <DatePickerDropdown selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setShowDatePicker(false); }} />}
          </View>
          <Pressable style={styles.dateArrow} onPress={() => navigateDate(1)}><Ionicons name="chevron-forward" size={20} color={colors.text.secondary} /></Pressable>
        </View>
        <Pressable style={styles.todayBtn} onPress={() => setSelectedDate(new Date())}><Text style={styles.todayBtnText}>Today</Text></Pressable>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, isLargeScreen && styles.statsRowLarge]}>
        <StatCard icon="time" iconColor={colors.primary.orange} iconBg={colors.primary.orangeSubtle} value={`${stats.totalHours.toFixed(1)}h`} label="Total Hours" />
        <StatCard icon="people" iconColor={colors.semantic.info} iconBg={colors.semantic.infoLight} value={stats.totalWorkers} label="Workers" />
        <StatCard icon="folder" iconColor={colors.semantic.success} iconBg={colors.semantic.successLight} value={stats.totalProjects} label="Projects" />
        <StatCard icon="pulse" iconColor={colors.semantic.warning} iconBg={colors.semantic.warningLight} value={stats.clockedIn} label="Clocked In" />
      </View>

      {error && <View style={styles.errorContainer}><Ionicons name="alert-circle" size={24} color={colors.semantic.error} /><Text style={styles.errorText}>{error}</Text><Pressable style={styles.retryButton} onPress={fetchTimeEntries}><Text style={styles.retryText}>Retry</Text></Pressable></View>}

      {/* Table */}
      {!error && filteredEmployees.length > 0 && (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}><Text style={styles.tableTitle}>Weekly Summary</Text><Pressable style={styles.selectAllButton} onPress={selectAllEmployees}><Ionicons name={selectedEmployees.size === filteredEmployees.length ? "checkbox" : "square-outline"} size={20} color={selectedEmployees.size === filteredEmployees.length ? colors.primary.orange : colors.text.tertiary} /><Text style={styles.selectAllText}>Select All</Text></Pressable></View>
          {view === 'week' && isLargeScreen && (
            <View style={styles.tableHeaderRow}>
              <View style={styles.employeeColumn}><Text style={styles.columnHeader}>Employee</Text></View>
              {weekDays.map(day => <View key={day.dayNum} style={[styles.dayColumn, day.isToday && styles.todayColumn]}><Text style={[styles.dayHeader, day.isToday && styles.todayText]}>{day.dayName}</Text><Text style={[styles.dayNumber, day.isToday && styles.todayText]}>{day.dayNum}</Text></View>)}
              <View style={styles.totalColumn}><Text style={styles.columnHeader}>Total</Text></View>
            </View>
          )}
          {filteredEmployees.map(emp => <EmployeeRow key={emp.id} employee={emp} weekDays={weekDays} view={view} isLargeScreen={isLargeScreen} isSelected={selectedEmployees.has(emp.id)} isExpanded={expandedEmployee === emp.id} onToggleSelect={() => toggleEmployeeSelection(emp.id)} onToggleExpand={() => setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)} getHoursForDay={getHoursForDay} formatHours={formatHours} getInitials={getInitials} />)}
        </View>
      )}

      {!error && filteredEmployees.length === 0 && <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="time-outline" size={40} color={colors.text.tertiary} /></View><Text style={styles.emptyTitle}>No timecards found</Text><Text style={styles.emptySubtitle}>{searchQuery ? 'No employees match your search' : `No time entries for this ${view}`}</Text></View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: typography.fontSize.md, color: colors.text.tertiary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.md },
  pageTitle: { fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing.xxs },
  subtitle: { fontSize: typography.fontSize.md, color: colors.text.tertiary },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.medium, backgroundColor: colors.neutral.white },
  exportButtonHovered: { borderColor: colors.text.secondary },
  exportButtonText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary },
  approveButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.primary.orange },
  approveButtonDisabled: { backgroundColor: colors.neutral.offWhite },
  approveButtonText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.neutral.white },
  approveButtonTextDisabled: { color: colors.text.tertiary },
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },
  searchContainer: { flex: 1, minWidth: 200, maxWidth: 400, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border.light, paddingHorizontal: spacing.sm },
  searchContainerFocused: { borderColor: colors.primary.orange, ...shadows.sm },
  searchIcon: { marginRight: spacing.xs },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: typography.fontSize.sm, color: colors.text.primary, outlineStyle: 'none' },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.neutral.offWhite, borderRadius: borderRadius.lg, padding: 4 },
  viewToggleBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  viewToggleBtnActive: { backgroundColor: colors.neutral.white, ...shadows.sm },
  viewToggleText: { fontSize: typography.fontSize.sm, color: colors.text.tertiary, fontWeight: typography.fontWeight.medium },
  viewToggleTextActive: { color: colors.text.primary },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.border.light },
  datePickerWrapper: { position: 'relative', zIndex: 100 },
  dateTextButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.border.light },
  dateText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary },
  todayBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.primary.orange },
  todayBtnText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.neutral.white },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  statsRowLarge: { flexWrap: 'nowrap' },
  statCard: { flex: 1, minWidth: 140, backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border.light },
  statCardHovered: { borderColor: colors.primary.orange, transform: [{ translateY: -2 }], ...shadows.md },
  statIconWrap: { width: 40, height: 40, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: 2 },
  statLabel: { fontSize: typography.fontSize.sm, color: colors.text.tertiary },
  statArrow: { position: 'absolute', top: spacing.md, right: spacing.md },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.semantic.errorLight, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  errorText: { flex: 1, color: colors.semantic.error, fontSize: typography.fontSize.sm },
  retryButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.semantic.error, borderRadius: borderRadius.md },
  retryText: { color: colors.neutral.white, fontWeight: typography.fontWeight.medium },
  tableContainer: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  tableTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  selectAllButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  selectAllText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.neutral.offWhite, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  employeeColumn: { flex: 2, paddingLeft: 34 },
  columnHeader: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayColumn: { width: 50, alignItems: 'center' },
  todayColumn: { backgroundColor: colors.primary.orangeSubtle, borderRadius: borderRadius.sm, paddingVertical: spacing.xxs },
  dayHeader: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium, color: colors.text.tertiary },
  dayNumber: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary },
  todayText: { color: colors.primary.orange },
  totalColumn: { width: 60, alignItems: 'flex-end', paddingRight: 28 },
  employeeRowContainer: { borderBottomWidth: 1, borderBottomColor: colors.border.light },
  employeeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  employeeRowSelected: { backgroundColor: colors.primary.orangeSubtle },
  checkbox: { marginRight: spacing.sm },
  employeeInfo: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary.orangeSubtle, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarActive: { backgroundColor: colors.semantic.successLight },
  avatarText: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.primary.orange },
  avatarTextActive: { color: colors.semantic.success },
  avatarActiveDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.semantic.success, borderWidth: 2, borderColor: colors.neutral.white },
  employeeDetails: { flex: 1 },
  employeeName: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  employeeEmail: { fontSize: typography.fontSize.xs, color: colors.text.tertiary },
  dayCell: { width: 50, alignItems: 'center', paddingVertical: spacing.xs },
  todayCellBg: { backgroundColor: colors.primary.orangeSubtle, borderRadius: borderRadius.sm },
  dayCellText: { fontSize: typography.fontSize.sm, color: colors.text.tertiary },
  dayCellTextFilled: { color: colors.text.primary, fontWeight: typography.fontWeight.medium },
  dayCellTextOvertime: { color: colors.semantic.warning, fontWeight: typography.fontWeight.semibold },
  totalCell: { width: 60, alignItems: 'flex-end' },
  totalHours: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  expandedDetails: { padding: spacing.md, backgroundColor: colors.neutral.offWhite },
  expandedTitle: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing.sm },
  entryDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: colors.neutral.white, padding: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.xs },
  entryDetailLeft: { flex: 1 },
  entryDate: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.primary },
  entryProject: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 2 },
  entryDetailRight: { alignItems: 'flex-end' },
  entryTime: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  entryHours: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginTop: 2 },
  entryHoursActive: { color: colors.semantic.success },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxxl, backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border.light },
  emptyIcon: { width: 80, height: 80, borderRadius: borderRadius.xl, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs },
  emptySubtitle: { fontSize: typography.fontSize.md, color: colors.text.tertiary },
});
