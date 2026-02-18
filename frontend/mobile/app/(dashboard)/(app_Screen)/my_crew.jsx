import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../utils/ctx';
import { apiCall } from '../../../utils/api';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Return Monday of the ISO week containing `date`. */
const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDateString = (d) => d.toISOString().split('T')[0];

const getInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  '#50c878', '#f39c12', '#4a90e2', '#9b59b6',
  '#e74c3c', '#1abc9c', '#e67e22', '#3498db',
];

const getAvatarColor = (id = '') =>
  AVATAR_COLORS[
    Math.abs(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) %
      AVATAR_COLORS.length
  ];

/** Build a per-day hours array from raw time_entries for a given week. */
const buildWeeklyHours = (entries = [], weekStart) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return {
      date: toDateString(d),
      day_name: d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
      hours: 0,
    };
  });

  for (const entry of entries) {
    if (!entry.clock_in || !entry.clock_out) continue;
    const clockIn = new Date(entry.clock_in);
    const clockOut = new Date(entry.clock_out);
    const breakMs = (entry.break_minutes || 0) * 60_000;
    const workedHours = Math.max(0, (clockOut - clockIn - breakMs) / 3_600_000);
    const dateStr = toDateString(clockIn);
    const day = days.find((d) => d.date === dateStr);
    if (day) day.hours = Math.round((day.hours + workedHours) * 10) / 10;
  }

  return days;
};

const calcRegularAndOT = (totalHours) => ({
  regular_hours: Math.min(totalHours, 40),
  overtime_hours: Math.max(0, totalHours - 40),
});

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const MyCrew = () => {
  const { session } = useSession();
  const token = session?.access_token ?? null;

  const [userProfile, setUserProfile] = useState(null);
  const [crewMembers, setCrewMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('timecards');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [timeOffModalVisible, setTimeOffModalVisible] = useState(false);
  const [selectedCrewMember, setSelectedCrewMember] = useState(null);
  const [selectedTimeOffRequest, setSelectedTimeOffRequest] = useState(null);

  // ── 1. Fetch current user profile (for id + company_id) ──────────────────
  useEffect(() => {
    if (!token) return;
    apiCall(token, 'users/me').then((res) => {
      if (res.success) setUserProfile(res.data.user);
    });
  }, [token]);

  // ── 2. Fetch crew + per-member enrichment ─────────────────────────────────
  const fetchCrewMembers = useCallback(async () => {
    if (!token || !userProfile) return;

    try {
      // Crew list
      const crewRes = await apiCall(token, `employee-assignments/foreman/${userProfile.id}`);
      if (!crewRes.success) throw new Error(crewRes.message);

      const crew = crewRes.data.crew ?? [];
      if (crew.length === 0) {
        setCrewMembers([]);
        return;
      }

      const weekStart = getWeekStart();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekStartStr = toDateString(weekStart);
      const weekEndStr = toDateString(weekEnd);
      const companyId = userProfile.default_company_id;

      // Enrich each member in parallel
      const enriched = await Promise.all(
        crew.map(async (member) => {
          const color = getAvatarColor(member.id);
          const initials = getInitials(member.full_name);

          // --- Time entries ---
          const entriesRes = await apiCall(
            token,
            `time-entries?user_id=${member.id}&start_date=${weekStartStr}&end_date=${weekEndStr}`
          );
          const rawEntries = entriesRes.success
            ? (Array.isArray(entriesRes.data) ? entriesRes.data : entriesRes.data?.entries ?? [])
            : [];

          const daily_hours = buildWeeklyHours(rawEntries, weekStart);
          const totalHours = daily_hours.reduce((s, d) => s + d.hours, 0);
          const { regular_hours, overtime_hours } = calcRegularAndOT(totalHours);

          // --- Timecard approval ---
          const approvalRes = await apiCall(
            token,
            `timecard-approvals?company_id=${companyId}&week_start=${weekStartStr}&user_id=${member.id}`
          );
          let timecardStatus = 'ready';
          let employeeSigned = false;
          let supervisorSigned = false;
          if (approvalRes.success) {
            const approvals = Array.isArray(approvalRes.data)
              ? approvalRes.data
              : approvalRes.data?.approvals ?? [];
            const approval = approvals[0] ?? null;
            if (approval?.status === 'approved') {
              timecardStatus = 'signed';
              employeeSigned = true;
              supervisorSigned = true;
            } else if (approval?.status === 'pending') {
              timecardStatus = 'pending';
              employeeSigned = true;
            }
          }

          // --- Time-off requests ---
          const torRes = await apiCall(token, `time-off/all?user_id=${member.id}`);
          const rawTOR = torRes.success
            ? (torRes.data?.data ?? torRes.data ?? [])
            : [];
          const time_off_requests = Array.isArray(rawTOR)
            ? rawTOR.map((r) => ({
                id: r.id,
                start_date: r.start_date,
                end_date: r.end_date,
                type: r.type ?? r.leave_type ?? 'Leave',
                status: r.status,
                days: r.total_days ?? r.days ?? 1,
                reason: r.notes ?? r.reason ?? '',
                submitted_date: (r.created_at ?? r.submitted_date ?? '').split('T')[0],
                reviewed_date: r.reviewed_at ? r.reviewed_at.split('T')[0] : null,
                denial_reason: r.denial_reason ?? r.reviewer_notes ?? null,
              }))
            : [];

          return {
            id: member.id,
            name: member.full_name,
            initials,
            color,
            current_period: {
              start_date: weekStartStr,
              end_date: weekEndStr,
              total_hours: Math.round(totalHours * 10) / 10,
            },
            timecard: {
              start_date: weekStartStr,
              end_date: weekEndStr,
              status: timecardStatus,
              regular_hours,
              overtime_hours,
              employee_signed: employeeSigned,
              supervisor_signed: supervisorSigned,
              daily_hours,
            },
            time_off_requests,
          };
        })
      );

      setCrewMembers(enriched);
    } catch (err) {
      console.error('fetchCrewMembers:', err);
      Alert.alert('Error', 'Failed to load crew. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, userProfile]);

  useEffect(() => {
    if (userProfile) fetchCrewMembers();
  }, [userProfile, fetchCrewMembers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCrewMembers();
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleApprove = async (member) => {
    setActionLoading(true);
    const res = await apiCall(token, 'timecard-approvals', 'POST', {
      company_id: userProfile.default_company_id,
      user_id: member.id,
      week_start: member.timecard.start_date,
      week_end: member.timecard.end_date,
      status: 'approved',
    });
    setActionLoading(false);

    if (!res.success) {
      Alert.alert('Error', res.message || 'Failed to approve timecard.');
      return;
    }

    setCrewMembers((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? { ...m, timecard: { ...m.timecard, status: 'signed', employee_signed: true, supervisor_signed: true } }
          : m
      )
    );
    setDetailsModalVisible(false);
    Alert.alert('Approved', `${member.name}'s timecard has been approved.`);
  };

  const handleApproveTimeOff = async (request) => {
    setActionLoading(true);
    const res = await apiCall(token, `time-off/${request.id}/approve`, 'PATCH');
    setActionLoading(false);

    if (!res.success) {
      Alert.alert('Error', res.message || 'Failed to approve request.');
      return;
    }
    _updateTimeOffStatus(request.id, 'approved');
    setTimeOffModalVisible(false);
    Alert.alert('Approved', 'Time off request has been approved.');
  };

  const handleDenyTimeOff = (request) => {
    if (Alert.prompt) {
      // iOS native text prompt
      Alert.prompt(
        'Deny Request',
        'Enter a reason for denial (optional):',
        async (reason) => _submitDeny(request, reason),
        'plain-text',
        ''
      );
    } else {
      // Android fallback — confirm then deny without typed reason
      Alert.alert('Deny Request', 'Are you sure you want to deny this request?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deny', style: 'destructive', onPress: () => _submitDeny(request, '') },
      ]);
    }
  };

  const _submitDeny = async (request, reason) => {
    setActionLoading(true);
    const res = await apiCall(token, `time-off/${request.id}/deny`, 'PATCH', {
      notes: reason || '',
    });
    setActionLoading(false);

    if (!res.success) {
      Alert.alert('Error', res.message || 'Failed to deny request.');
      return;
    }
    _updateTimeOffStatus(request.id, 'denied', reason);
    setTimeOffModalVisible(false);
    Alert.alert('Denied', 'Time off request has been denied.');
  };

  const _updateTimeOffStatus = (requestId, newStatus, denial_reason = null) => {
    setCrewMembers((prev) =>
      prev.map((m) => ({
        ...m,
        time_off_requests: m.time_off_requests.map((r) =>
          r.id === requestId
            ? { ...r, status: newStatus, reviewed_date: toDateString(new Date()), ...(denial_reason ? { denial_reason } : {}) }
            : r
        ),
      }))
    );
  };

  // ── Display helpers ───────────────────────────────────────────────────────

  const formatDate = (str) => {
    if (!str) return '';
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start, end) => {
    if (!start || !end) return '';
    const fmt = (s) =>
      new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const getTotalHours = (tc) => (tc.regular_hours || 0) + (tc.overtime_hours || 0);

  const getStatusColor = (s) => ({ signed: '#50c878', pending: '#f39c12', ready: '#4a90e2' }[s] ?? '#999');
  const getStatusLabel = (s) => ({ signed: 'Signed', pending: 'Pending', ready: 'Ready to Sign' }[s] ?? 'Draft');
  const getTimeOffStatusColor = (s) => ({ approved: '#50c878', denied: '#e74c3c', pending: '#f39c12' }[s] ?? '#999');

  const getTimeOffTypeColor = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('vacation')) return '#4a90e2';
    if (t.includes('sick'))     return '#e74c3c';
    if (t.includes('personal')) return '#9b59b6';
    return '#999';
  };

  const getPendingCount = () =>
    crewMembers.filter((m) => m.timecard.status === 'ready' || m.timecard.status === 'pending').length;

  const getPendingTimeOffCount = () =>
    crewMembers.reduce((n, m) => n + m.time_off_requests.filter((r) => r.status === 'pending').length, 0);

  const filteredCrew = crewMembers.filter(
    (m) => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const readyToSign = filteredCrew.filter(
    (m) => m.timecard.status === 'ready' || m.timecard.status === 'pending'
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Crew</Text>
        <Text style={styles.headerSubtitle}>
          {getPendingCount()} pending {getPendingCount() === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'timecards', label: 'Timecards', icon: 'time-outline',     count: crewMembers.filter((m) => m.timecard.status === 'ready').length },
          { key: 'timeoff',   label: 'Time Off',  icon: 'calendar-outline', count: getPendingTimeOffCount() },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={20} color={selectedTab === tab.key ? '#ff7a00' : '#999'} />
            <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{tab.count}</Text></View>
          </Pressable>
        ))}
      </View>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a00" />
          <Text style={styles.loadingText}>Loading crew members…</Text>
        </View>
      ) : filteredCrew.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No crew members found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try adjusting your search' : 'No employees are assigned to you yet'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff7a00" colors={['#ff7a00']} />
          }
        >

          {/* ── TIMECARDS TAB ─────────────────────────────────────────────── */}
          {selectedTab === 'timecards' && (
            <>
              {readyToSign.length > 0 && (
                <View style={styles.readyToSignSection}>
                  <View style={styles.readyToSignHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#ff7a00" />
                    <Text style={styles.readyToSignTitle}>Ready to Sign</Text>
                    <Text style={styles.readyToSignSubtitle}>Current Week</Text>
                  </View>
                  {readyToSign.map((member) => (
                    <Pressable
                      key={`ready-${member.id}`}
                      style={styles.readyToSignCard}
                      onPress={() => { setSelectedCrewMember(member); setDetailsModalVisible(true); }}
                    >
                      <View style={styles.readyToSignCardContent}>
                        <View style={[styles.readyToSignAvatar, { backgroundColor: member.color }]}>
                          <Text style={styles.readyToSignAvatarText}>{member.initials}</Text>
                        </View>
                        <View style={styles.readyToSignInfo}>
                          <Text style={styles.readyToSignName}>{member.name}</Text>
                          <View style={[styles.readyToSignStatusBadge, { backgroundColor: `${getStatusColor(member.timecard.status)}20` }]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.timecard.status) }]} />
                            <Text style={[styles.readyToSignStatusText, { color: getStatusColor(member.timecard.status) }]}>
                              {getStatusLabel(member.timecard.status)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.readyToSignHours}>
                          <Text style={styles.readyToSignHoursValue}>{getTotalHours(member.timecard).toFixed(0)}h</Text>
                          <Ionicons name="chevron-forward" size={20} color="#999" />
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {filteredCrew.map((member) => (
                <Pressable
                  key={member.id}
                  style={styles.card}
                  onPress={() => { setSelectedCrewMember(member); setDetailsModalVisible(true); }}
                >
                  <View style={[styles.leftBorder, { backgroundColor: member.color }]} />
                  <View style={styles.cardContent}>
                    <View style={[styles.avatar, { backgroundColor: member.color }]}>
                      <Text style={styles.avatarText}>{member.initials}</Text>
                    </View>
                    <View style={styles.infoSection}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#999" />
                        <Text style={styles.dateText}>
                          {formatDateRange(member.current_period.start_date, member.current_period.end_date)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.hoursContainer}>
                      <Text style={styles.hoursValue}>{member.current_period.total_hours.toFixed(0)}h</Text>
                      <Text style={styles.hoursLabel}>Total</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </>
          )}

          {/* ── TIME OFF TAB ──────────────────────────────────────────────── */}
          {selectedTab === 'timeoff' && (
            <>
              {filteredCrew.map((member) => {
                const requests = member.time_off_requests;
                if (requests.length === 0) return null;
                return (
                  <View key={`tor-${member.id}`} style={styles.timeOffEmployeeCard}>
                    <View style={styles.timeOffEmployeeHeader}>
                      <View style={[styles.timeOffHeaderAvatar, { backgroundColor: member.color }]}>
                        <Text style={styles.timeOffHeaderAvatarText}>{member.initials}</Text>
                      </View>
                      <View style={styles.timeOffHeaderInfo}>
                        <Text style={styles.timeOffHeaderName}>{member.name}</Text>
                        <Text style={styles.timeOffHeaderCount}>
                          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                          {requests.filter((r) => r.status === 'pending').length > 0 &&
                            ` · ${requests.filter((r) => r.status === 'pending').length} pending`}
                        </Text>
                      </View>
                    </View>

                    {requests.map((request, idx) => (
                      <View key={request.id}>
                        <Pressable
                          style={styles.timeOffRequestItem}
                          onPress={() => {
                            setSelectedCrewMember(member);
                            setSelectedTimeOffRequest(request);
                            setTimeOffModalVisible(true);
                          }}
                        >
                          <View style={styles.timeOffRequestLeft}>
                            <View style={[styles.timeOffTypeBadge, { backgroundColor: `${getTimeOffTypeColor(request.type)}15` }]}>
                              <Text style={[styles.timeOffTypeText, { color: getTimeOffTypeColor(request.type) }]}>
                                {request.type}
                              </Text>
                            </View>
                            <View style={styles.timeOffDates}>
                              <View style={styles.timeOffDateRow}>
                                <Ionicons name="calendar-outline" size={14} color="#666" />
                                <Text style={styles.timeOffDateText}>
                                  {formatDateRange(request.start_date, request.end_date)}
                                </Text>
                              </View>
                              <Text style={styles.timeOffDaysText}>
                                {request.days} {request.days === 1 ? 'day' : 'days'}
                              </Text>
                            </View>
                            {request.reason ? (
                              <Text style={styles.timeOffReason} numberOfLines={2}>{request.reason}</Text>
                            ) : null}
                          </View>
                          <View style={styles.timeOffRequestRight}>
                            <View style={[styles.timeOffStatusBadge, { backgroundColor: `${getTimeOffStatusColor(request.status)}20` }]}>
                              <View style={[styles.statusDot, { backgroundColor: getTimeOffStatusColor(request.status) }]} />
                              <Text style={[styles.timeOffStatusText, { color: getTimeOffStatusColor(request.status) }]}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginTop: 8 }} />
                          </View>
                        </Pressable>
                        {idx < requests.length - 1 && <View style={styles.timeOffDivider} />}
                      </View>
                    ))}
                  </View>
                );
              })}

              {filteredCrew.every((m) => m.time_off_requests.length === 0) && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No time off requests</Text>
                  <Text style={styles.emptySubtext}>All caught up!</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── TIMECARD DETAILS MODAL ────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="time" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Timecard Details</Text>
              <Pressable onPress={() => setDetailsModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />

            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              {selectedCrewMember && (
                <>
                  <View style={styles.modalEmployeeSection}>
                    <View style={[styles.modalAvatar, { backgroundColor: selectedCrewMember.color }]}>
                      <Text style={styles.modalAvatarText}>{selectedCrewMember.initials}</Text>
                    </View>
                    <Text style={styles.modalEmployeeName}>{selectedCrewMember.name}</Text>
                    <Text style={styles.modalPeriodDate}>
                      {formatDateRange(selectedCrewMember.timecard.start_date, selectedCrewMember.timecard.end_date)}
                    </Text>
                    <View style={[styles.modalStatusBadge, { backgroundColor: `${getStatusColor(selectedCrewMember.timecard.status)}20` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedCrewMember.timecard.status) }]} />
                      <Text style={[styles.modalStatusText, { color: getStatusColor(selectedCrewMember.timecard.status) }]}>
                        {getStatusLabel(selectedCrewMember.timecard.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Daily hours table */}
                  <View style={styles.dailyBreakdown}>
                    <Text style={styles.sectionTitle}>Daily Hours</Text>
                    <View style={styles.dailyTable}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Day</Text>
                        <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'right' }]}>Hours</Text>
                      </View>
                      {selectedCrewMember.timecard.daily_hours.map((day, i) => (
                        <View key={i} style={styles.tableRow}>
                          <Text style={[styles.tableCellDate, { flex: 1 }]}>{formatDate(day.date)}</Text>
                          <Text style={[styles.tableCellDay, { flex: 1 }]}>{day.day_name}</Text>
                          <Text style={[styles.tableCellHours, { width: 60, textAlign: 'right' }]}>
                            {day.hours > 0 ? day.hours.toFixed(1) : '–'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Hours summary */}
                  <View style={styles.summarySection}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>REGULAR</Text>
                      <Text style={styles.summaryValue}>{selectedCrewMember.timecard.regular_hours.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>OVERTIME</Text>
                      <Text style={styles.summaryValue}>{selectedCrewMember.timecard.overtime_hours.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>TOTAL</Text>
                      <Text style={styles.totalValue}>{getTotalHours(selectedCrewMember.timecard).toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Signatures */}
                  <View style={styles.signaturesSection}>
                    {[
                      { label: 'Employee Signature',   signed: selectedCrewMember.timecard.employee_signed },
                      { label: 'Supervisor Signature', signed: selectedCrewMember.timecard.supervisor_signed },
                    ].map((sig) => (
                      <View key={sig.label} style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>{sig.label}</Text>
                        {sig.signed ? (
                          <View style={styles.signedIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#50c878" />
                            <Text style={styles.signedText}>Signed</Text>
                          </View>
                        ) : (
                          <Text style={styles.unsignedText}>Not signed</Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Approve button */}
                  {(selectedCrewMember.timecard.status === 'ready' ||
                    selectedCrewMember.timecard.status === 'pending') && (
                    <Pressable
                      style={[styles.actionButton, actionLoading && styles.buttonDisabled]}
                      onPress={() => handleApprove(selectedCrewMember)}
                      disabled={actionLoading}
                    >
                      {actionLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                      <Text style={styles.actionButtonText}>Approve Timecard</Text>
                    </Pressable>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── TIME OFF DETAILS MODAL ────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={timeOffModalVisible}
        onRequestClose={() => setTimeOffModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Time Off Request</Text>
              <Pressable onPress={() => setTimeOffModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />

            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              {selectedCrewMember && selectedTimeOffRequest && (
                <>
                  <View style={styles.modalEmployeeSection}>
                    <View style={[styles.modalAvatar, { backgroundColor: selectedCrewMember.color }]}>
                      <Text style={styles.modalAvatarText}>{selectedCrewMember.initials}</Text>
                    </View>
                    <Text style={styles.modalEmployeeName}>{selectedCrewMember.name}</Text>
                    <View style={[styles.timeOffTypeBadge, {
                      backgroundColor: `${getTimeOffTypeColor(selectedTimeOffRequest.type)}20`,
                      marginTop: 8, paddingHorizontal: 16, paddingVertical: 8,
                    }]}>
                      <Text style={[styles.timeOffTypeText, {
                        color: getTimeOffTypeColor(selectedTimeOffRequest.type),
                        fontSize: 14, fontWeight: '600',
                      }]}>
                        {selectedTimeOffRequest.type}
                      </Text>
                    </View>
                    <View style={[styles.modalStatusBadge, {
                      backgroundColor: `${getTimeOffStatusColor(selectedTimeOffRequest.status)}20`,
                      marginTop: 8,
                    }]}>
                      <View style={[styles.statusDot, { backgroundColor: getTimeOffStatusColor(selectedTimeOffRequest.status) }]} />
                      <Text style={[styles.modalStatusText, { color: getTimeOffStatusColor(selectedTimeOffRequest.status) }]}>
                        {selectedTimeOffRequest.status.charAt(0).toUpperCase() + selectedTimeOffRequest.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Details grid */}
                  <View style={styles.timeOffDetailsSection}>
                    {[
                      { icon: 'calendar-outline',          label: 'Date Range', value: formatDateRange(selectedTimeOffRequest.start_date, selectedTimeOffRequest.end_date) },
                      { icon: 'time-outline',              label: 'Duration',   value: `${selectedTimeOffRequest.days} ${selectedTimeOffRequest.days === 1 ? 'day' : 'days'}` },
                      { icon: 'document-text-outline',     label: 'Submitted',  value: formatDate(selectedTimeOffRequest.submitted_date) },
                      ...(selectedTimeOffRequest.reviewed_date
                        ? [{ icon: 'checkmark-circle-outline', label: 'Reviewed', value: formatDate(selectedTimeOffRequest.reviewed_date) }]
                        : []),
                    ].map((row) => (
                      <View key={row.label} style={styles.timeOffDetailRow}>
                        <Ionicons name={row.icon} size={20} color="#666" />
                        <View style={styles.timeOffDetailContent}>
                          <Text style={styles.timeOffDetailLabel}>{row.label}</Text>
                          <Text style={styles.timeOffDetailValue}>{row.value}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {selectedTimeOffRequest.reason ? (
                    <View style={styles.timeOffReasonSection}>
                      <Text style={styles.sectionTitle}>Reason</Text>
                      <View style={styles.timeOffReasonBox}>
                        <Text style={styles.timeOffReasonText}>{selectedTimeOffRequest.reason}</Text>
                      </View>
                    </View>
                  ) : null}

                  {selectedTimeOffRequest.status === 'denied' && selectedTimeOffRequest.denial_reason ? (
                    <View style={styles.timeOffReasonSection}>
                      <Text style={styles.sectionTitle}>Denial Reason</Text>
                      <View style={[styles.timeOffReasonBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                        <Text style={[styles.timeOffReasonText, { color: '#991b1b' }]}>
                          {selectedTimeOffRequest.denial_reason}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {selectedTimeOffRequest.status === 'pending' && (
                    <View style={styles.modalActions}>
                      <Pressable
                        style={[styles.approveButton, actionLoading && styles.buttonDisabled]}
                        onPress={() => handleApproveTimeOff(selectedTimeOffRequest)}
                        disabled={actionLoading}
                      >
                        {actionLoading
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                        <Text style={styles.actionButtonText}>Approve Request</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.denyButton, actionLoading && styles.buttonDisabled]}
                        onPress={() => handleDenyTimeOff(selectedTimeOffRequest)}
                        disabled={actionLoading}
                      >
                        <Ionicons name="close-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Deny Request</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyCrew;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: { backgroundColor: '#ff7a00', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderRadius: 10, paddingHorizontal: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 16, color: '#333' },

  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16,
    marginBottom: 16, borderRadius: 10, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabActive: { backgroundColor: '#fff3e6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#ff7a00' },
  badge: { backgroundColor: '#ff7a00', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: '#666' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: 32 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  leftBorder: { width: 4 },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  infoSection: { flex: 1 },
  memberName: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: '#999' },
  hoursContainer: { alignItems: 'flex-end' },
  hoursValue: { fontSize: 22, fontWeight: '700', color: '#333' },
  hoursLabel: { fontSize: 12, color: '#999', marginTop: 2 },

  readyToSignSection: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  readyToSignHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8, backgroundColor: '#fff8f3', borderBottomWidth: 1, borderBottomColor: '#ffe4cc' },
  readyToSignTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#ff7a00' },
  readyToSignSubtitle: { fontSize: 13, color: '#ff9a40' },
  readyToSignCard: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  readyToSignCardContent: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  readyToSignAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  readyToSignAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  readyToSignInfo: { flex: 1 },
  readyToSignName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  readyToSignStatusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  readyToSignStatusText: { fontSize: 12, fontWeight: '600' },
  readyToSignHours: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readyToSignHoursValue: { fontSize: 18, fontWeight: '700', color: '#333' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  timeOffEmployeeCard: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  timeOffEmployeeHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  timeOffHeaderAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  timeOffHeaderAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  timeOffHeaderInfo: { flex: 1 },
  timeOffHeaderName: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 2 },
  timeOffHeaderCount: { fontSize: 13, color: '#666' },
  timeOffRequestItem: { flexDirection: 'row', padding: 16 },
  timeOffRequestLeft: { flex: 1, marginRight: 12 },
  timeOffRequestRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  timeOffTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 8 },
  timeOffTypeText: { fontSize: 12, fontWeight: '600' },
  timeOffDates: { marginBottom: 8 },
  timeOffDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  timeOffDateText: { fontSize: 14, color: '#333', fontWeight: '500' },
  timeOffDaysText: { fontSize: 13, color: '#666', marginLeft: 20 },
  timeOffReason: { fontSize: 13, color: '#666', fontStyle: 'italic', lineHeight: 18 },
  timeOffStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  timeOffStatusText: { fontSize: 12, fontWeight: '600' },
  timeOffDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#333' },
  closeButton: { padding: 4 },
  modalDivider: { height: 1, backgroundColor: '#f0f0f0' },
  modalScrollView: {},
  modalScrollContent: { padding: 20, paddingBottom: 48 },
  modalEmployeeSection: { alignItems: 'center', marginBottom: 24 },
  modalAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalAvatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  modalEmployeeName: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 4 },
  modalPeriodDate: { fontSize: 14, color: '#666', marginBottom: 12 },
  modalStatusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  modalStatusText: { fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  dailyBreakdown: { marginBottom: 20 },
  dailyTable: { backgroundColor: '#f9f9f9', borderRadius: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 8 },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#666', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tableCellDate: { fontSize: 14, color: '#333' },
  tableCellDay: { fontSize: 14, color: '#666' },
  tableCellHours: { fontSize: 14, fontWeight: '600', color: '#333' },

  summarySection: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  summaryLabel: { fontSize: 13, color: '#666', fontWeight: '600', letterSpacing: 0.5 },
  summaryValue: { fontSize: 15, color: '#333', fontWeight: '600' },
  totalRow: { borderBottomWidth: 0, paddingTop: 12 },
  totalLabel: { fontSize: 14, color: '#333', fontWeight: '700' },
  totalValue: { fontSize: 16, color: '#ff7a00', fontWeight: '700' },

  signaturesSection: { marginBottom: 20 },
  signatureBox: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 12 },
  signatureLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  signedIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signedText: { fontSize: 14, color: '#50c878', fontWeight: '600' },
  unsignedText: { fontSize: 14, color: '#999', fontStyle: 'italic' },

  modalActions: { gap: 12 },
  actionButton: { flexDirection: 'row', backgroundColor: '#ff7a00', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 8 },
  approveButton: { flexDirection: 'row', backgroundColor: '#50c878', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 8 },
  denyButton: { flexDirection: 'row', backgroundColor: '#e74c3c', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  buttonDisabled: { opacity: 0.6 },

  timeOffDetailsSection: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 20 },
  timeOffDetailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  timeOffDetailContent: { marginLeft: 12, flex: 1 },
  timeOffDetailLabel: { fontSize: 12, color: '#666', marginBottom: 2, textTransform: 'uppercase', fontWeight: '600' },
  timeOffDetailValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  timeOffReasonSection: { marginBottom: 20 },
  timeOffReasonBox: { backgroundColor: '#f0f9ff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e0f2fe' },
  timeOffReasonText: { fontSize: 14, color: '#0c4a6e', lineHeight: 20 },
});