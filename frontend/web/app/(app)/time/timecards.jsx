import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, RefreshControl, ActivityIndicator, TextInput, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../../utils/ctx';
import { getTimeEntries, getUserProfile } from '../../../utils/api';
import { colors, spacing, borderRadius, typography, shadows } from '../../../constants/theme';

// Fixed widths for alignment - all columns use exact pixel widths
const CHECKBOX_WIDTH = 32;
const DAY_COLUMN_WIDTH = 52;
const DAYS_CONTAINER_WIDTH = DAY_COLUMN_WIDTH * 7; // 364px for all 7 days
const TOTAL_COLUMN_WIDTH = 70;
const CHEVRON_WIDTH = 24;
const SCROLLBAR_WIDTH = 8;

// Date Picker Dropdown
const DatePickerDropdown = ({ selectedDate, onSelectDate, onClose, view }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  // Update viewDate when selectedDate changes from outside
  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  
  const isInSelectedWeek = (day) => {
    if (!day || view !== 'week') return false;
    const d = new Date(year, month, day);
    const selStart = new Date(selectedDate);
    selStart.setDate(selStart.getDate() - selStart.getDay());
    const selEnd = new Date(selStart);
    selEnd.setDate(selEnd.getDate() + 6);
    return d >= selStart && d <= selEnd;
  };
  
  const isSelected = (day) => {
    if (!day) return false;
    if (view === 'week') return isInSelectedWeek(day);
    return new Date(year, month, day).toDateString() === selectedDate.toDateString();
  };
  
  const isToday = (day) => day && new Date(year, month, day).toDateString() === new Date().toDateString();
  
  const handleDayPress = (day) => {
    if (day) {
      const newDate = new Date(year, month, day);
      onSelectDate(newDate);
      onClose();
    }
  };

  const handleQuickSelect = (type) => {
    let newDate;
    if (type === 'today') {
      newDate = new Date();
    } else if (type === 'thisWeek') { 
      newDate = new Date(); 
      newDate.setDate(newDate.getDate() - newDate.getDay()); 
    } else if (type === 'lastWeek') { 
      newDate = new Date(); 
      newDate.setDate(newDate.getDate() - newDate.getDay() - 7); 
    }
    onSelectDate(newDate);
    onClose();
  };

  return (
    <View style={dpStyles.container}>
      <View style={dpStyles.quickSelect}>
        <Pressable style={dpStyles.quickBtn} onPress={() => handleQuickSelect('today')}><Text style={dpStyles.quickText}>Today</Text></Pressable>
        <Pressable style={dpStyles.quickBtn} onPress={() => handleQuickSelect('thisWeek')}><Text style={dpStyles.quickText}>This Week</Text></Pressable>
        <Pressable style={dpStyles.quickBtn} onPress={() => handleQuickSelect('lastWeek')}><Text style={dpStyles.quickText}>Last Week</Text></Pressable>
      </View>
      <View style={dpStyles.divider} />
      <View style={dpStyles.header}>
        <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} style={dpStyles.navBtn}><Ionicons name="chevron-back" size={16} color={colors.text.secondary} /></Pressable>
        <Text style={dpStyles.monthText}>{months[month]} {year}</Text>
        <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} style={dpStyles.navBtn}><Ionicons name="chevron-forward" size={16} color={colors.text.secondary} /></Pressable>
      </View>
      <View style={dpStyles.weekRow}>{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <Text key={d} style={dpStyles.weekDay}>{d}</Text>)}</View>
      <View style={dpStyles.daysGrid}>
        {days.map((day, idx) => (
          <Pressable 
            key={idx} 
            style={[dpStyles.dayCell, isSelected(day) && dpStyles.dayCellSelected, isToday(day) && !isSelected(day) && dpStyles.dayCellToday]} 
            onPress={() => handleDayPress(day)} 
            disabled={!day}
          >
            <Text style={[dpStyles.dayText, isSelected(day) && dpStyles.dayTextSelected, isToday(day) && !isSelected(day) && dpStyles.dayTextToday]}>{day || ''}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const dpStyles = StyleSheet.create({
  container: { backgroundColor: colors.neutral.white, borderRadius: 10, padding: 12, ...shadows.lg, minWidth: 280, borderWidth: 1, borderColor: colors.border.light },
  quickSelect: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  quickBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.neutral.offWhite, borderRadius: 4 },
  quickText: { fontSize: 11, fontWeight: '500', color: colors.text.secondary },
  divider: { height: 1, backgroundColor: colors.border.light, marginVertical: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: { padding: 4 },
  monthText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '600', color: colors.text.tertiary },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  dayCellSelected: { backgroundColor: colors.primary.orange },
  dayCellToday: { backgroundColor: colors.primary.orangeSubtle },
  dayText: { fontSize: 12, color: colors.text.primary },
  dayTextSelected: { color: colors.neutral.white, fontWeight: '600' },
  dayTextToday: { color: colors.primary.orange, fontWeight: '600' },
});

// Status Badge Component
const StatusBadge = ({ status }) => {
  const config = {
    approved: { bg: colors.semantic.successLight, color: colors.semantic.success, label: 'Approved', icon: 'checkmark-circle' },
    rejected: { bg: colors.semantic.errorLight, color: colors.semantic.error, label: 'Rejected', icon: 'close-circle' },
    pending_changes: { bg: colors.semantic.warningLight, color: colors.semantic.warning, label: 'Changes', icon: 'create' },
    pending: { bg: colors.neutral.offWhite, color: colors.text.tertiary, label: 'Pending', icon: 'time-outline' },
  };
  const c = config[status] || config.pending;
  return (
    <View style={[statusStyles.badge, { backgroundColor: c.bg }]}>
      <Ionicons name={c.icon} size={12} color={c.color} />
      <Text style={[statusStyles.badgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
};

const statusStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600' },
});

// Action Modal Component
const ActionModal = ({ visible, onClose, selectedCount, onApprove, onReject, onRequestChanges, processing }) => {
  const [activeAction, setActiveAction] = useState(null);
  const [note, setNote] = useState('');

  const handleAction = (action) => { setActiveAction(action); if (action === 'approve') onApprove(); };
  const handleSubmitWithNote = () => {
    if (activeAction === 'reject') onReject(note);
    else if (activeAction === 'requestChanges') onRequestChanges(note);
    setNote(''); setActiveAction(null);
  };
  const handleClose = () => { setNote(''); setActiveAction(null); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={modalStyles.overlay} onPress={handleClose}>
        <Pressable style={modalStyles.container} onPress={e => e.stopPropagation()}>
          {!activeAction ? (
            <>
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>Review Timecards</Text>
                <Pressable onPress={handleClose} style={modalStyles.closeBtn}><Ionicons name="close" size={20} color={colors.text.secondary} /></Pressable>
              </View>
              <Text style={modalStyles.subtitle}>{selectedCount} timecard{selectedCount !== 1 ? 's' : ''} selected</Text>
              <View style={modalStyles.actions}>
                <Pressable style={({ hovered }) => [modalStyles.actionBtn, hovered && modalStyles.actionBtnHovered]} onPress={() => handleAction('approve')} disabled={processing}>
                  <View style={[modalStyles.actionIcon, { backgroundColor: colors.semantic.successLight }]}><Ionicons name="checkmark-circle" size={24} color={colors.semantic.success} /></View>
                  <View style={modalStyles.actionContent}><Text style={modalStyles.actionTitle}>Approve</Text><Text style={modalStyles.actionDesc}>Mark as approved and ready for payroll</Text></View>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                </Pressable>
                <Pressable style={({ hovered }) => [modalStyles.actionBtn, hovered && modalStyles.actionBtnHovered]} onPress={() => handleAction('requestChanges')} disabled={processing}>
                  <View style={[modalStyles.actionIcon, { backgroundColor: colors.semantic.warningLight }]}><Ionicons name="create" size={24} color={colors.semantic.warning} /></View>
                  <View style={modalStyles.actionContent}><Text style={modalStyles.actionTitle}>Request Changes</Text><Text style={modalStyles.actionDesc}>Send back to employee for edits</Text></View>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                </Pressable>
                <Pressable style={({ hovered }) => [modalStyles.actionBtn, hovered && modalStyles.actionBtnHovered]} onPress={() => handleAction('reject')} disabled={processing}>
                  <View style={[modalStyles.actionIcon, { backgroundColor: colors.semantic.errorLight }]}><Ionicons name="close-circle" size={24} color={colors.semantic.error} /></View>
                  <View style={modalStyles.actionContent}><Text style={modalStyles.actionTitle}>Reject</Text><Text style={modalStyles.actionDesc}>Reject and notify employee</Text></View>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                </Pressable>
              </View>
            </>
          ) : activeAction === 'approve' ? (
            <View style={modalStyles.processingContainer}>
              {processing ? (<><ActivityIndicator size="large" color={colors.primary.orange} /><Text style={modalStyles.processingText}>Approving timecards...</Text></>) : (
                <><View style={modalStyles.successIcon}><Ionicons name="checkmark-circle" size={48} color={colors.semantic.success} /></View>
                <Text style={modalStyles.successTitle}>Timecards Approved</Text>
                <Text style={modalStyles.successDesc}>{selectedCount} timecard{selectedCount !== 1 ? 's' : ''} approved successfully</Text>
                <Pressable style={modalStyles.doneBtn} onPress={handleClose}><Text style={modalStyles.doneBtnText}>Done</Text></Pressable></>
              )}
            </View>
          ) : (
            <>
              <View style={modalStyles.header}>
                <Pressable onPress={() => setActiveAction(null)} style={modalStyles.backBtn}><Ionicons name="arrow-back" size={20} color={colors.text.secondary} /></Pressable>
                <Text style={modalStyles.title}>{activeAction === 'reject' ? 'Reject Timecards' : 'Request Changes'}</Text>
                <Pressable onPress={handleClose} style={modalStyles.closeBtn}><Ionicons name="close" size={20} color={colors.text.secondary} /></Pressable>
              </View>
              <Text style={modalStyles.noteLabel}>Add a note for the employee{selectedCount > 1 ? 's' : ''} (optional)</Text>
              <TextInput style={modalStyles.noteInput} placeholder={activeAction === 'reject' ? "Reason for rejection..." : "What needs to be changed..."} placeholderTextColor={colors.text.tertiary} value={note} onChangeText={setNote} multiline numberOfLines={4} />
              <View style={modalStyles.noteActions}>
                <Pressable style={modalStyles.cancelBtn} onPress={() => setActiveAction(null)}><Text style={modalStyles.cancelBtnText}>Cancel</Text></Pressable>
                <Pressable style={[modalStyles.submitBtn, activeAction === 'reject' && modalStyles.submitBtnReject]} onPress={handleSubmitWithNote} disabled={processing}>
                  {processing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={modalStyles.submitBtnText}>{activeAction === 'reject' ? 'Reject' : 'Send Request'}</Text>}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { backgroundColor: colors.neutral.white, borderRadius: 12, padding: 20, width: '100%', maxWidth: 440, ...shadows.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text.primary, flex: 1, textAlign: 'center' },
  closeBtn: { padding: 4 }, backBtn: { padding: 4 },
  subtitle: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: 20 },
  actions: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border.light, gap: 12 },
  actionBtnHovered: { backgroundColor: colors.neutral.offWhite, borderColor: colors.border.medium },
  actionIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 2 },
  actionDesc: { fontSize: 13, color: colors.text.tertiary },
  processingContainer: { alignItems: 'center', paddingVertical: 40 },
  processingText: { marginTop: 16, fontSize: 15, color: colors.text.secondary },
  successIcon: { marginBottom: 16 },
  successTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  successDesc: { fontSize: 14, color: colors.text.secondary, marginBottom: 24 },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 10, backgroundColor: colors.primary.orange, borderRadius: 8 },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  noteLabel: { fontSize: 14, color: colors.text.secondary, marginBottom: 10 },
  noteInput: { borderWidth: 1, borderColor: colors.border.light, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text.primary, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  noteActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border.medium, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.semantic.warning, alignItems: 'center' },
  submitBtnReject: { backgroundColor: colors.semantic.error },
  submitBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

// Employee Row Component
const EmployeeRow = ({ employee, weekDays, view, isLargeScreen, isSelected, isExpanded, onToggleSelect, onToggleExpand, getHoursForDay, formatHours, getInitials }) => (
  <View style={styles.employeeRowContainer}>
    <Pressable style={({ hovered }) => [styles.employeeRow, isSelected && styles.employeeRowSelected, hovered && !isSelected && styles.employeeRowHovered]} onPress={onToggleExpand}>
      <View style={styles.checkboxCell}>
        <Pressable onPress={(e) => { e.stopPropagation(); onToggleSelect(); }}>
          <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={20} color={isSelected ? colors.primary.orange : colors.text.tertiary} />
        </Pressable>
      </View>
      <View style={styles.employeeCell}>
        <View style={[styles.avatar, employee.isActive && styles.avatarActive, employee.status === 'approved' && styles.avatarApproved]}>
          <Text style={[styles.avatarText, employee.isActive && styles.avatarTextActive, employee.status === 'approved' && styles.avatarTextApproved]}>{getInitials(employee.name)}</Text>
          {employee.isActive && <View style={styles.avatarActiveDot} />}
        </View>
        <View style={styles.employeeDetails}>
          <View style={styles.employeeNameRow}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            {employee.status && employee.status !== 'pending' && <StatusBadge status={employee.status} />}
          </View>
          <Text style={styles.employeeEmail} numberOfLines={1}>{employee.email || 'No email'}</Text>
        </View>
      </View>
      {view === 'week' && isLargeScreen && (
        <View style={styles.daysContainer}>
          {weekDays.map(day => {
            const hours = getHoursForDay(employee, day.date);
            return (
              <View key={day.dayNum} style={[styles.dayCell, day.isToday && styles.todayCellBg]}>
                <Text style={[styles.dayCellText, hours > 0 && styles.dayCellTextFilled, hours > 8 && styles.dayCellTextOvertime]}>{formatHours(hours)}</Text>
              </View>
            );
          })}
        </View>
      )}
      <View style={styles.totalCell}>
        <Text style={[styles.totalHours, employee.totalHours > 40 && styles.totalHoursOvertime]}>{employee.totalHours.toFixed(1)}h</Text>
      </View>
      <View style={styles.chevronCell}>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.text.tertiary} />
      </View>
    </Pressable>
    {isExpanded && (
      <View style={styles.expandedDetails}>
        {employee.entries.length === 0 ? <Text style={styles.noEntriesText}>No time entries</Text> : employee.entries.map((entry, idx) => {
          const clockIn = new Date(entry.clock_in);
          const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
          const hours = clockOut ? ((clockOut - clockIn) / (1000 * 60 * 60) - (entry.break_minutes || 0) / 60).toFixed(1) : 'Active';
          return (
            <View key={entry.id || idx} style={styles.entryDetail}>
              <View style={styles.entryLeft}><Text style={styles.entryDate}>{clockIn.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text><Text style={styles.entryProject}>{entry.project?.name || 'No project'}</Text></View>
              <View style={styles.entryRight}><Text style={styles.entryTime}>{clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {clockOut ? clockOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Now'}</Text><Text style={[styles.entryHours, !clockOut && styles.entryHoursActive]}>{hours}{clockOut ? 'h' : ''}</Text></View>
            </View>
          );
        })}
      </View>
    )}
  </View>
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
  const [showActionModal, setShowActionModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [employeeStatuses, setEmployeeStatuses] = useState({});
  
  const datePickerRef = useRef(null);
  const token = session?.access_token;

  useEffect(() => { async function fetchUserProfile() { if (!token) return; const response = await getUserProfile(token); if (response.success && response.data?.user?.default_company_id) setCompanyId(response.data.user.default_company_id); } fetchUserProfile(); }, [token]);

  const getWeekRange = useCallback((date) => { const startDate = new Date(date); startDate.setDate(startDate.getDate() - startDate.getDay()); startDate.setHours(0, 0, 0, 0); const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 6); endDate.setHours(23, 59, 59, 999); return { startDate, endDate }; }, []);

  const weekDays = useMemo(() => { const { startDate } = getWeekRange(selectedDate); return Array.from({ length: 7 }, (_, i) => { const day = new Date(startDate); day.setDate(day.getDate() + i); return { date: day, dayName: day.toLocaleDateString('en-US', { weekday: 'short' }), dayNum: day.getDate(), isToday: day.toDateString() === new Date().toDateString() }; }); }, [selectedDate, getWeekRange]);

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

  const getWeekKey = useCallback((date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  }, []);

  const currentWeekKey = useMemo(() => getWeekKey(selectedDate), [selectedDate, getWeekKey]);

  const employeeData = useMemo(() => {
    const grouped = {};
    timeEntries.forEach(entry => {
      const id = entry.user_id;
      if (!grouped[id]) {
        // Status key combines employee ID and week
        const statusKey = `${id}_${currentWeekKey}`;
        grouped[id] = { id, name: entry.user?.full_name || 'Unknown', email: entry.user?.email, entries: [], dailyHours: {}, totalHours: 0, isActive: false, status: employeeStatuses[statusKey] || 'pending' };
      }
      grouped[id].entries.push(entry);
      if (!entry.clock_out) grouped[id].isActive = true;
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
  }, [timeEntries, employeeStatuses, currentWeekKey]);

  const filteredEmployees = useMemo(() => employeeData.filter(emp => !searchQuery || emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.email?.toLowerCase().includes(searchQuery.toLowerCase())), [employeeData, searchQuery]);

  const navigateDate = (dir) => { const d = new Date(selectedDate); d.setDate(d.getDate() + (view === 'day' ? dir : dir * 7)); setSelectedDate(d); };
  const formatDateHeader = () => { if (view === 'day') return selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); const { startDate, endDate } = getWeekRange(selectedDate); return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`; };
  const toggleEmployeeSelection = (id) => setSelectedEmployees(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const selectAllEmployees = () => setSelectedEmployees(selectedEmployees.size === filteredEmployees.length ? new Set() : new Set(filteredEmployees.map(e => e.id)));
  const getHoursForDay = (emp, date) => emp.dailyHours[date.toISOString().split('T')[0]] || 0;
  const formatHours = (h) => h === 0 ? '-' : h.toFixed(1);
  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  const updateStatuses = (status) => {
    const newStatuses = { ...employeeStatuses };
    selectedEmployees.forEach(id => { 
      // Key by employee ID + week
      const statusKey = `${id}_${currentWeekKey}`;
      newStatuses[statusKey] = status; 
    });
    setEmployeeStatuses(newStatuses);
  };

  const handleApprove = async () => { 
    setProcessing(true); 
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    updateStatuses('approved');
    setProcessing(false); 
  };
  
  const handleReject = async (note) => { 
    setProcessing(true); 
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    updateStatuses('rejected');
    setProcessing(false); 
    setShowActionModal(false); 
    setSelectedEmployees(new Set()); 
  };
  
  const handleRequestChanges = async (note) => { 
    setProcessing(true); 
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    updateStatuses('pending_changes');
    setProcessing(false); 
    setShowActionModal(false); 
    setSelectedEmployees(new Set()); 
  };
  
  const handleModalClose = () => { 
    if (!processing) { 
      setShowActionModal(false); 
      setSelectedEmployees(new Set()); 
    } 
  };

  // Click outside handler for date picker - includes the dropdown in the ref
  useEffect(() => { 
    const handleClick = (e) => { 
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false); 
      }
    }; 
    if (showDatePicker && Platform.OS === 'web') { 
      document.addEventListener('mousedown', handleClick); 
      return () => document.removeEventListener('mousedown', handleClick); 
    } 
  }, [showDatePicker]);

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary.orange} /><Text style={styles.loadingText}>Loading timecards...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
            <Ionicons name="search" size={16} color={searchFocused ? colors.primary.orange : colors.text.tertiary} />
            <TextInput style={styles.searchInput} placeholder="Search employees..." placeholderTextColor={colors.text.tertiary} value={searchQuery} onChangeText={setSearchQuery} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
            {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={16} color={colors.text.tertiary} /></Pressable>}
          </View>
          <View style={styles.viewToggle}>
            <Pressable style={[styles.viewBtn, view === 'day' && styles.viewBtnActive]} onPress={() => setView('day')}><Text style={[styles.viewText, view === 'day' && styles.viewTextActive]}>Day</Text></Pressable>
            <Pressable style={[styles.viewBtn, view === 'week' && styles.viewBtnActive]} onPress={() => setView('week')}><Text style={[styles.viewText, view === 'week' && styles.viewTextActive]}>Week</Text></Pressable>
          </View>
          {/* Date picker with dropdown inside the same ref container */}
          <View style={styles.datePickerContainer} ref={datePickerRef}>
            <View style={styles.dateNav}>
              <Pressable style={styles.navArrow} onPress={() => navigateDate(-1)}><Ionicons name="chevron-back" size={16} color={colors.text.secondary} /></Pressable>
              <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(!showDatePicker)}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary.orange} />
                <Text style={styles.dateText}>{formatDateHeader()}</Text>
                <Ionicons name="chevron-down" size={12} color={colors.text.tertiary} />
              </Pressable>
              <Pressable style={styles.navArrow} onPress={() => navigateDate(1)}><Ionicons name="chevron-forward" size={16} color={colors.text.secondary} /></Pressable>
            </View>
            {showDatePicker && (
              <View style={styles.datePickerDropdown}>
                <DatePickerDropdown selectedDate={selectedDate} onSelectDate={setSelectedDate} onClose={() => setShowDatePicker(false)} view={view} />
              </View>
            )}
          </View>
          <Pressable style={styles.todayBtn} onPress={() => setSelectedDate(new Date())}><Text style={styles.todayBtnText}>Today</Text></Pressable>
        </View>
        <View style={styles.toolbarRight}>
          <Pressable style={({ hovered }) => [styles.exportBtn, hovered && styles.exportBtnHovered]}><Ionicons name="download-outline" size={16} color={colors.text.primary} /><Text style={styles.exportBtnText}>Export</Text></Pressable>
          <Pressable style={[styles.approveBtn, selectedEmployees.size === 0 && styles.approveBtnDisabled]} disabled={selectedEmployees.size === 0} onPress={() => setShowActionModal(true)}>
            <Ionicons name="checkmark-circle-outline" size={16} color={selectedEmployees.size > 0 ? '#fff' : colors.text.tertiary} /><Text style={[styles.approveBtnText, selectedEmployees.size === 0 && styles.approveBtnTextDisabled]}>Review{selectedEmployees.size > 0 ? ` (${selectedEmployees.size})` : ''}</Text>
          </Pressable>
        </View>
      </View>

      {error && <View style={styles.errorContainer}><Ionicons name="alert-circle" size={20} color={colors.semantic.error} /><Text style={styles.errorText}>{error}</Text><Pressable style={styles.retryBtn} onPress={fetchTimeEntries}><Text style={styles.retryBtnText}>Retry</Text></Pressable></View>}

      {!error && filteredEmployees.length > 0 && (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Pressable style={styles.selectAllBtn} onPress={selectAllEmployees}><Ionicons name={selectedEmployees.size === filteredEmployees.length ? "checkbox" : "square-outline"} size={18} color={selectedEmployees.size === filteredEmployees.length ? colors.primary.orange : colors.text.tertiary} /><Text style={styles.selectAllText}>Select All</Text></Pressable>
            <Text style={styles.employeeCount}>{filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}</Text>
          </View>
          <ScrollView 
            style={styles.tableBody} 
            contentContainerStyle={styles.tableBodyContent} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.orange} />}
            stickyHeaderIndices={view === 'week' && isLargeScreen ? [0] : []}
          >
            {view === 'week' && isLargeScreen && (
              <View style={styles.columnHeaderRow}>
                <View style={styles.checkboxHeaderCell} />
                <View style={styles.employeeHeaderCell}><Text style={styles.columnLabel}>Employee</Text></View>
                <View style={styles.daysHeaderContainer}>
                  {weekDays.map(day => (
                    <View key={day.dayNum} style={[styles.dayHeaderCell, day.isToday && styles.todayHeaderCell]}>
                      <Text style={[styles.dayLabel, day.isToday && styles.todayLabel]}>{day.dayName}</Text>
                      <Text style={[styles.dayNum, day.isToday && styles.todayLabel]}>{day.dayNum}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.totalHeaderCell}><Text style={styles.columnLabel}>Total</Text></View>
                <View style={styles.chevronHeaderCell} />
              </View>
            )}
            {filteredEmployees.map(emp => <EmployeeRow key={emp.id} employee={emp} weekDays={weekDays} view={view} isLargeScreen={isLargeScreen} isSelected={selectedEmployees.has(emp.id)} isExpanded={expandedEmployee === emp.id} onToggleSelect={() => toggleEmployeeSelection(emp.id)} onToggleExpand={() => setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)} getHoursForDay={getHoursForDay} formatHours={formatHours} getInitials={getInitials} />)}
          </ScrollView>
        </View>
      )}

      {!error && filteredEmployees.length === 0 && <View style={styles.emptyStateContainer}><View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="time-outline" size={32} color={colors.text.tertiary} /></View><Text style={styles.emptyTitle}>No timecards found</Text><Text style={styles.emptySubtitle}>{searchQuery ? 'No employees match your search' : `No time entries for this ${view}`}</Text></View></View>}

      <ActionModal visible={showActionModal} onClose={handleModalClose} selectedCount={selectedEmployees.size} onApprove={handleApprove} onReject={handleReject} onRequestChanges={handleRequestChanges} processing={processing} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: colors.text.tertiary },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 12, flexWrap: 'wrap', gap: 12, backgroundColor: '#FBFBFB', borderBottomWidth: 1, borderBottomColor: colors.border.light, zIndex: 100 },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.neutral.white, borderRadius: 6, borderWidth: 1, borderColor: colors.border.light, paddingHorizontal: 10, paddingVertical: 6, minWidth: 200 },
  searchContainerFocused: { borderColor: colors.primary.orange },
  searchInput: { flex: 1, fontSize: 13, color: colors.text.primary, outlineStyle: 'none' },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.neutral.offWhite, borderRadius: 6, padding: 2 },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 },
  viewBtnActive: { backgroundColor: colors.neutral.white, ...shadows.sm },
  viewText: { fontSize: 12, fontWeight: '500', color: colors.text.tertiary },
  viewTextActive: { color: colors.text.primary },
  
  // Date picker container - holds both button and dropdown
  datePickerContainer: { position: 'relative', zIndex: 1000 },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  navArrow: { padding: 6, borderRadius: 4 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.neutral.offWhite },
  dateText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  datePickerDropdown: { position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 1001 },
  
  todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.primary.orange },
  todayBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.border.default, backgroundColor: colors.neutral.white },
  exportBtnHovered: { borderColor: colors.text.tertiary },
  exportBtnText: { fontSize: 13, fontWeight: '500', color: colors.text.primary },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.primary.orange },
  approveBtnDisabled: { backgroundColor: colors.neutral.offWhite },
  approveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  approveBtnTextDisabled: { color: colors.text.tertiary },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.semantic.errorLight, padding: 12, borderRadius: 8, marginHorizontal: 16, marginTop: 12 },
  errorText: { flex: 1, color: colors.semantic.error, fontSize: 13 },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.semantic.error, borderRadius: 4 },
  retryBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tableContainer: { flex: 1, marginHorizontal: 16, marginTop: 12, marginBottom: 16, backgroundColor: colors.neutral.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border.light, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border.light, backgroundColor: colors.neutral.white },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectAllText: { fontSize: 12, fontWeight: '500', color: colors.text.secondary },
  employeeCount: { fontSize: 12, color: colors.text.tertiary },
  
  // Column headers - inside ScrollView so it aligns with content
  columnHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.neutral.offWhite, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  checkboxHeaderCell: { width: CHECKBOX_WIDTH },
  employeeHeaderCell: { flex: 1 },
  daysHeaderContainer: { width: DAYS_CONTAINER_WIDTH, flexDirection: 'row' },
  dayHeaderCell: { width: DAY_COLUMN_WIDTH, alignItems: 'center', paddingVertical: 2 },
  todayHeaderCell: { backgroundColor: colors.primary.orangeSubtle, borderRadius: 4 },
  totalHeaderCell: { width: TOTAL_COLUMN_WIDTH, alignItems: 'flex-end' },
  chevronHeaderCell: { width: CHEVRON_WIDTH },
  columnLabel: { fontSize: 10, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dayLabel: { fontSize: 10, fontWeight: '500', color: colors.text.tertiary },
  dayNum: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  todayLabel: { color: colors.primary.orange },
  
  // Table body
  tableBody: { flex: 1 },
  tableBodyContent: { paddingBottom: 16 },
  
  // Row cells - must match header cells exactly
  employeeRowContainer: { borderBottomWidth: 1, borderBottomColor: colors.border.light },
  employeeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 12, paddingRight: 12 },
  employeeRowSelected: { backgroundColor: colors.primary.orangeSubtle },
  employeeRowHovered: { backgroundColor: colors.neutral.offWhite },
  checkboxCell: { width: CHECKBOX_WIDTH, alignItems: 'center' },
  employeeCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  daysContainer: { width: DAYS_CONTAINER_WIDTH, flexDirection: 'row' },
  dayCell: { width: DAY_COLUMN_WIDTH, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  todayCellBg: { backgroundColor: colors.primary.orangeSubtle, borderRadius: 4 },
  totalCell: { width: TOTAL_COLUMN_WIDTH, alignItems: 'flex-end' },
  chevronCell: { width: CHEVRON_WIDTH, alignItems: 'center' },
  
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary.orangeSubtle, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarActive: { backgroundColor: colors.semantic.successLight },
  avatarApproved: { backgroundColor: colors.semantic.successLight },
  avatarText: { fontSize: 11, fontWeight: '600', color: colors.primary.orange },
  avatarTextActive: { color: colors.semantic.success },
  avatarTextApproved: { color: colors.semantic.success },
  avatarActiveDot: { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.semantic.success, borderWidth: 2, borderColor: colors.neutral.white },
  employeeDetails: { flex: 1 },
  employeeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  employeeName: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  employeeEmail: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },
  dayCellText: { fontSize: 12, color: colors.text.tertiary },
  dayCellTextFilled: { color: colors.text.primary, fontWeight: '500' },
  dayCellTextOvertime: { color: colors.semantic.warning, fontWeight: '600' },
  totalHours: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  totalHoursOvertime: { color: colors.semantic.error },
  expandedDetails: { padding: 12, paddingLeft: CHECKBOX_WIDTH + 20, backgroundColor: colors.neutral.offWhite, gap: 6 },
  noEntriesText: { fontSize: 12, color: colors.text.tertiary, fontStyle: 'italic' },
  entryDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.neutral.white, padding: 10, borderRadius: 6 },
  entryLeft: { flex: 1 },
  entryDate: { fontSize: 12, fontWeight: '500', color: colors.text.primary },
  entryProject: { fontSize: 11, color: colors.text.tertiary, marginTop: 2 },
  entryRight: { alignItems: 'flex-end' },
  entryTime: { fontSize: 11, color: colors.text.secondary },
  entryHours: { fontSize: 12, fontWeight: '600', color: colors.text.primary, marginTop: 2 },
  entryHoursActive: { color: colors.semantic.success },
  emptyStateContainer: { flex: 1, padding: 16 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border.light },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.neutral.offWhite, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: colors.text.tertiary },
});