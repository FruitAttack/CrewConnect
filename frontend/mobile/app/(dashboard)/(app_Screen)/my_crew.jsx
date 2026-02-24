import {
  StyleSheet, Text, View, ScrollView, Pressable, Modal,
  ActivityIndicator, RefreshControl, TextInput, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useSession } from '../../../utils/ctx';
import {
  getUserProfile,
  getCrews,
  getTimeEntries,
  getTimecardApprovals,
  upsertTimecardApproval,
  getTimeOffAll,
  approveTimeOff,
  denyTimeOff,
} from '../../../utils/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Same overlap-based day calculator used in Timecard_Screen */
function calculateSecondsForDay(timeEntries, dateString) {
  if (!timeEntries || timeEntries.length === 0) return 0;
  const [year, month, day] = dateString.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const dayEnd   = new Date(year, month - 1, day, 23, 59, 59, 999);
  let totalSeconds = 0;
  timeEntries.forEach(entry => {
    const clockIn  = new Date(entry.clock_in);
    const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
    const overlapStart = Math.max(clockIn.getTime(), dayStart.getTime());
    const overlapEnd   = Math.min(clockOut.getTime(), dayEnd.getTime());
    if (overlapStart < overlapEnd) {
      const overlapSec   = (overlapEnd - overlapStart) / 1000;
      const entryDur     = (clockOut - clockIn) / 1000;
      const overlapRatio = overlapSec / entryDur;
      const breakSec     = (entry.break_minutes || 0) * 60 * overlapRatio;
      totalSeconds += Math.max(0, overlapSec - breakSec);
    }
  });
  return Math.round(totalSeconds);
}

/**
 * Returns the most recently COMPLETED Sun–Sat week.
 * Uses the same Sunday-based week boundary as Timecard_Screen so that
 * week_start values stored in the DB match on both sides.
 *
 * Example (called on a Wednesday Feb 19):
 *   This week started Sunday Feb 16  → not finished yet
 *   Last week started Sunday Feb  9  → returned
 */
function getLastCompletedWeekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find this week's Sunday
  const thisWeekSunday = new Date(today);
  thisWeekSunday.setDate(today.getDate() - today.getDay()); // back to Sunday

  // Last completed week = one week before this week's Sunday
  const lastWeekSunday = new Date(thisWeekSunday);
  lastWeekSunday.setDate(thisWeekSunday.getDate() - 7);

  const lastWeekSaturday = new Date(lastWeekSunday);
  lastWeekSaturday.setDate(lastWeekSunday.getDate() + 6);
  lastWeekSaturday.setHours(23, 59, 59, 999);

  const toISO = (dt) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  return { weekStart: toISO(lastWeekSunday), weekEnd: toISO(lastWeekSaturday) };
}

/** Convert a Date → 'YYYY-MM-DD' without timezone shift */
function toISO(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Given a 'YYYY-MM-DD' week-start string, return the matching week-end string (+6 days) */
function weekEndFromStart(weekStartStr) {
  const d = new Date(weekStartStr + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return toISO(d);
}

/** Navigate a week-start string by ±N weeks */
function shiftWeek(weekStartStr, weeks) {
  const d = new Date(weekStartStr + 'T00:00:00');
  d.setDate(d.getDate() + weeks * 7);
  return toISO(d);
}

/** 'YYYY-MM-DD' → friendly 'Jan 5 - Jan 11, 2025' */
function formatWeekLabel(weekStartStr) {
  const s = new Date(weekStartStr + 'T00:00:00');
  const e = new Date(weekStartStr + 'T00:00:00');
  e.setDate(s.getDate() + 6);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const year = s.getFullYear();
  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${year}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${year}`;
}

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#50c878', '#4a90e2', '#f39c12', '#9b59b6', '#e74c3c', '#1abc9c', '#e67e22'];
function colorForIndex(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }

// ─── Component ────────────────────────────────────────────────────────────────

const MyCrew = () => {
  const { session } = useSession();
  const token = session?.access_token;

  const [detailsModalVisible, setDetailsModalVisible]   = useState(false);
  const [timeOffModalVisible, setTimeOffModalVisible]   = useState(false);
  const [rejectModalVisible,  setRejectModalVisible]    = useState(false);
  const [selectedCrewMember,  setSelectedCrewMember]    = useState(null);
  const [selectedTimeOffRequest, setSelectedTimeOffRequest] = useState(null);
  const [rejectNotes,          setRejectNotes]          = useState('');
  const [crewMembers,          setCrewMembers]          = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [refreshing,           setRefreshing]           = useState(false);
  const [searchQuery,          setSearchQuery]          = useState('');
  const [selectedTab,          setSelectedTab]          = useState('timecards');
  const [error,                setError]                = useState(null);
  const [approvingId,          setApprovingId]          = useState(null); // userId being approved
  const [denyingTimeOffId,     setDenyingTimeOffId]     = useState(null);
  const [denyReason,           setDenyReason]           = useState('');
  const [denyModalVisible,     setDenyModalVisible]     = useState(false);

  // Week navigation — starts on the last completed week, can go back freely
  const { weekStart: defaultWeekStart } = getLastCompletedWeekRange();
  const [selectedWeekStart, setSelectedWeekStart] = useState(defaultWeekStart);
  const isLatestWeek = selectedWeekStart === defaultWeekStart;

  // ─── Fetch & assemble crew data ─────────────────────────────────────────────

  const fetchCrewMembers = async (weekStartOverride) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Logged-in user profile
      const meRes = await getUserProfile(token);
      const me = meRes?.data?.user;
      if (!me) throw new Error('Could not load user profile');
      const companyId = me.default_company_id || me.default_company?.id || me.company_id;
      const myUserId  = me.id;

      // 2. Crews where I am the foreman
      const crewsRes = await getCrews(token, companyId);
      const allCrews = crewsRes?.data?.crews || [];
      const myCrews  = allCrews.filter(c => String(c.foreman_id) === String(myUserId));

      console.log('[MyCrew] My user ID:', myUserId);
      console.log('[MyCrew] My crews:', myCrews.map(c => c.name));

      // Collect unique members (excluding myself)
      const memberMap = new Map();
      myCrews.forEach(crew => {
        (crew.crew_members || []).forEach(cm => {
          const u = cm.user;
          if (u && u.id !== myUserId && !memberMap.has(u.id)) {
            memberMap.set(u.id, { user: u });
          }
        });
      });

      if (memberMap.size === 0) {
        setCrewMembers([]);
        return;
      }

      // 3. Fetch for the selected week (or default to last completed)
      const weekStart = weekStartOverride || getLastCompletedWeekRange().weekStart;
      const weekEnd   = weekEndFromStart(weekStart);
      console.log('[MyCrew] Fetching week:', weekStart, '→', weekEnd);

      const [timeEntriesRes, approvalsRes, timeOffRes] = await Promise.all([
        getTimeEntries(token, {
          all_users: 'true',
          start_date: weekStart,
          end_date: weekEnd,
          limit: 500,
        }),
        getTimecardApprovals(token, { company_id: companyId, week_start: weekStart }),
        getTimeOffAll(token),
      ]);

      const allEntries   = timeEntriesRes?.data?.time_entries || [];
      const allApprovals = approvalsRes?.data || [];
      // Safely unwrap time-off: API returns { success, data: [...] }
      const rawTimeOffData = timeOffRes?.data;
      const allTimeOff = Array.isArray(rawTimeOffData?.data)
        ? rawTimeOffData.data
        : Array.isArray(rawTimeOffData)
          ? rawTimeOffData
          : [];

      console.log('[MyCrew] Approvals fetched:', allApprovals.length);
      console.log('[MyCrew] Time-off records:', allTimeOff.length);

      // Index by user_id
      const approvalByUser = {};
      allApprovals.forEach(a => { approvalByUser[a.user_id] = a; });

      const timeOffByUser = {};
      allTimeOff.forEach(req => {
        const uid = req.user_id;
        if (!timeOffByUser[uid]) timeOffByUser[uid] = [];
        timeOffByUser[uid].push(req);
      });

      // 4. Build member objects
      const built = [];
      let colorIndex = 0;

      memberMap.forEach(({ user }, userId) => {
        const userEntries = allEntries.filter(e => e.user_id === userId);

        // Daily hours breakdown
        const daily_hours = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart + 'T00:00:00');
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const seconds = calculateSecondsForDay(userEntries, dateStr);
          const hours   = Math.round((seconds / 3600) * 100) / 100;
          daily_hours.push({ date: dateStr, day_name: DAY_NAMES[d.getDay()], hours });
        }

        const totalHours   = daily_hours.reduce((sum, d) => sum + d.hours, 0);
        const regularHours = Math.min(totalHours, 40);
        const overtimeHours = Math.max(0, totalHours - 40);

        // Map DB approval status → UI status
        const approval = approvalByUser[userId] || null;
        let timecardStatus = 'not_submitted'; // no record at all
        if (approval) {
          switch (approval.status) {
            case 'approved':        timecardStatus = 'approved';  break;
            case 'pending':         timecardStatus = 'pending';   break;
            case 'rejected':        timecardStatus = 'rejected';  break;
            case 'pending_changes': timecardStatus = 'pending_changes'; break;
            default:                timecardStatus = approval.status;
          }
        }

        // Time-off requests
        const rawTimeOff = timeOffByUser[userId] || [];
        const time_off_requests = rawTimeOff.map(r => ({
          id:             r.id,
          start_date:     r.start_date,
          end_date:       r.end_date,
          type:           r.type || r.leave_type || 'PTO',
          status:         r.status,
          days:           r.total_hours ? Math.ceil(r.total_hours / 8) : (r.days || 1),
          reason:         r.reason || '',
          submitted_date: r.created_at ? r.created_at.split('T')[0] : '',
          reviewed_date:  r.reviewed_at ? r.reviewed_at.split('T')[0] : undefined,
          denial_reason:  r.denial_reason || undefined,
        }));

        built.push({
          id:      userId,
          name:    user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          initials: getInitials(user.full_name || `${user.first_name || ''} ${user.last_name || ''}`),
          color:   colorForIndex(colorIndex++),
          // Store raw approval + metadata needed to upsert
          _approval:   approval,
          _companyId:  companyId,
          _weekStart:  weekStart,
          _weekEnd:    weekEnd,
          current_period: {
            start_date:  weekStart,
            end_date:    weekEnd,
            total_hours: Math.round(totalHours * 100) / 100,
          },
          timecard: {
            start_date:       weekStart,
            end_date:         weekEnd,
            status:           timecardStatus,
            regular_hours:    Math.round(regularHours * 100) / 100,
            overtime_hours:   Math.round(overtimeHours * 100) / 100,
            employee_signed:  approval?.status === 'pending' || approval?.status === 'approved',
            supervisor_signed: approval?.status === 'approved',
            notes:            approval?.notes || null,
            daily_hours,
          },
          time_off_requests,
        });
      });

      setCrewMembers(built);
    } catch (err) {
      console.error('fetchCrewMembers error:', err);
      setError('Failed to load crew data. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCrewMembers(selectedWeekStart); }, [token, selectedWeekStart]);

  const onRefresh = () => { setRefreshing(true); fetchCrewMembers(selectedWeekStart); };

  // Navigate to a different week
  const navigateWeek = (direction) => {
    const next = shiftWeek(selectedWeekStart, direction);
    // Don't go forward past the last completed week
    if (direction > 0 && next > defaultWeekStart) return;
    setSelectedWeekStart(next);
  };

  // ─── Approve timecard ─────────────────────────────────────────────────────

  const handleApprove = async (member, notes = null) => {
    setApprovingId(member.id);
    try {
      const res = await upsertTimecardApproval(token, {
        company_id: member._companyId,
        user_id:    member.id,
        week_start: member._weekStart,
        week_end:   member._weekEnd,
        status:     'approved',
        notes:      notes || null,
      });
      if (res.success) {
        setCrewMembers(prev => prev.map(m => m.id !== member.id ? m : {
          ...m,
          _approval: res.data,
          timecard: {
            ...m.timecard,
            status:           'approved',
            supervisor_signed: true,
            employee_signed:   true,
          },
        }));
        setDetailsModalVisible(false);
        Alert.alert('Approved ✓', `${member.name}'s timecard has been approved.`);
      } else {
        Alert.alert('Error', res.message || 'Failed to approve timecard.');
      }
    } catch (err) {
      console.error('handleApprove error:', err);
      Alert.alert('Error', 'Failed to approve timecard.');
    } finally {
      setApprovingId(null);
    }
  };

  // ─── Reject timecard ──────────────────────────────────────────────────────

  const handleReject = async () => {
    if (!selectedCrewMember) return;
    const member = selectedCrewMember;
    setRejectModalVisible(false);
    setApprovingId(member.id);
    try {
      const res = await upsertTimecardApproval(token, {
        company_id: member._companyId,
        user_id:    member.id,
        week_start: member._weekStart,
        week_end:   member._weekEnd,
        status:     'rejected',
        notes:      rejectNotes.trim() || null,
      });
      if (res.success) {
        setCrewMembers(prev => prev.map(m => m.id !== member.id ? m : {
          ...m,
          _approval: res.data,
          timecard: {
            ...m.timecard,
            status:            'rejected',
            supervisor_signed: false,
            notes:             rejectNotes.trim() || null,
          },
        }));
        setDetailsModalVisible(false);
        setRejectNotes('');
        Alert.alert('Rejected', `${member.name}'s timecard has been rejected.`);
      } else {
        Alert.alert('Error', res.message || 'Failed to reject timecard.');
      }
    } catch (err) {
      console.error('handleReject error:', err);
      Alert.alert('Error', 'Failed to reject timecard.');
    } finally {
      setApprovingId(null);
    }
  };

  // ─── Time off handlers ────────────────────────────────────────────────────

  const handleApproveTimeOff = async (request) => {
    try {
      const res = await approveTimeOff(token, request.id);
      if (res.success) {
        setCrewMembers(prev => prev.map(m => ({
          ...m,
          time_off_requests: m.time_off_requests.map(r =>
            r.id === request.id ? { ...r, status: 'approved' } : r
          ),
        })));
        setTimeOffModalVisible(false);
      } else {
        Alert.alert('Error', res.message || 'Failed to approve time off.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to approve time off.');
    }
  };

  const handleDenyTimeOff = async () => {
    if (!selectedTimeOffRequest) return;
    setDenyModalVisible(false);
    try {
      const res = await denyTimeOff(token, selectedTimeOffRequest.id, denyReason.trim() || 'Denied by supervisor');
      if (res.success) {
        setCrewMembers(prev => prev.map(m => ({
          ...m,
          time_off_requests: m.time_off_requests.map(r =>
            r.id === selectedTimeOffRequest.id
              ? { ...r, status: 'denied', denial_reason: denyReason.trim() }
              : r
          ),
        })));
        setTimeOffModalVisible(false);
        setDenyReason('');
      } else {
        Alert.alert('Error', res.message || 'Failed to deny time off.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to deny time off.');
    }
  };

  // ─── UI helpers ───────────────────────────────────────────────────────────

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start, end) => {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end   + 'T00:00:00');
    const sm = s.toLocaleDateString('en-US', { month: 'short' });
    const em = e.toLocaleDateString('en-US', { month: 'short' });
    const year = s.getFullYear();
    return `${sm} ${s.getDate()} - ${em} ${e.getDate()}, ${year}`;
  };

  const getTotalHours = (timecard) =>
    (timecard.regular_hours || 0) + (timecard.overtime_hours || 0);

  const getStatusColor = (status) => ({
    approved:        '#50c878',
    pending:         '#f39c12',
    pending_changes: '#9b59b6',
    rejected:        '#e74c3c',
    not_submitted:   '#999',
  }[status] ?? '#999');

  const getStatusLabel = (status) => ({
    approved:        'Approved',
    pending:         'Pending Review',
    pending_changes: 'Changes Needed',
    rejected:        'Rejected',
    not_submitted:   'Not Submitted',
  }[status] ?? status);

  const getTimeOffStatusColor = (status) => ({
    approved: '#50c878', denied: '#e74c3c', pending: '#f39c12',
  }[status] ?? '#999');

  const getTimeOffTypeColor = (type) => ({
    VACATION: '#4a90e2', SICK: '#e74c3c', PERSONAL: '#9b59b6',
    Vacation: '#4a90e2', 'Sick Leave': '#e74c3c', Personal: '#9b59b6',
  }[type] ?? '#999');

  const getPendingCount = () =>
    crewMembers.filter(m => m.timecard.status === 'pending').length;

  const getPendingTimeOffCount = () =>
    crewMembers.reduce((n, m) =>
      n + (m.time_off_requests?.filter(r => r.status === 'pending').length || 0), 0);

  const filteredCrewMembers = crewMembers.filter(m =>
    !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Timecards that need the foreman's attention (pending = employee submitted, awaiting foreman)
  const actionableTimecards = filteredCrewMembers.filter(m =>
    m.timecard.status === 'pending' || m.timecard.status === 'rejected'
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Crew</Text>
        <Text style={styles.headerSubtitle}>
          {getPendingCount()} pending {getPendingCount() === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#e74c3c" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={18} color="#e74c3c" />
          </Pressable>
        </View>
      )}

      {/* Search — always visible */}
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
        <Pressable
          style={[styles.tab, selectedTab === 'timecards' && styles.tabActive]}
          onPress={() => setSelectedTab('timecards')}
        >
          <Ionicons name="time-outline" size={20} color={selectedTab === 'timecards' ? '#ff7a00' : '#999'} />
          <Text style={[styles.tabText, selectedTab === 'timecards' && styles.tabTextActive]}>Timecards</Text>
          {getPendingCount() > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{getPendingCount()}</Text></View>
          )}
        </Pressable>
        <Pressable
          style={[styles.tab, selectedTab === 'timeoff' && styles.tabActive]}
          onPress={() => setSelectedTab('timeoff')}
        >
          <Ionicons name="calendar-outline" size={20} color={selectedTab === 'timeoff' ? '#ff7a00' : '#999'} />
          <Text style={[styles.tabText, selectedTab === 'timeoff' && styles.tabTextActive]}>Time Off</Text>
          {getPendingTimeOffCount() > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{getPendingTimeOffCount()}</Text></View>
          )}
        </Pressable>
      </View>

      {/* Week navigator — only shown on Timecards tab */}
      {selectedTab === 'timecards' && (
        <View style={styles.weekNav}>
          <Pressable onPress={() => navigateWeek(-1)} style={styles.weekNavArrow}>
            <Ionicons name="chevron-back" size={20} color="#555" />
          </Pressable>
          <View style={styles.weekNavPill}>
            <Ionicons name="calendar-outline" size={14} color="#ff7a00" />
            <Text style={styles.weekNavText}>{formatWeekLabel(selectedWeekStart)}</Text>
          </View>
          <Pressable
            onPress={() => navigateWeek(1)}
            style={[styles.weekNavArrow, isLatestWeek && styles.weekNavArrowDisabled]}
            disabled={isLatestWeek}
          >
            <Ionicons name="chevron-forward" size={20} color={isLatestWeek ? '#ccc' : '#555'} />
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a00" />
          <Text style={styles.loadingText}>Loading crew members...</Text>
        </View>
      ) : filteredCrewMembers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No crew members found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try adjusting your search' : "You haven't been assigned as a foreman yet"}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff7a00" colors={["#ff7a00"]} />
          }
        >
          {selectedTab === 'timecards' ? (
            <>
              {/* Action needed section */}
              {actionableTimecards.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="alert-circle" size={20} color="#ff7a00" />
                    <Text style={styles.sectionTitle}>Needs Your Review</Text>
                    <Text style={styles.sectionSubtitle}>{formatWeekLabel(selectedWeekStart)}</Text>
                  </View>
                  {actionableTimecards.map(member => (
                    <Pressable
                      key={`action-${member.id}`}
                      style={styles.actionCard}
                      onPress={() => { setSelectedCrewMember(member); setDetailsModalVisible(true); }}
                    >
                      <View style={[styles.actionAvatar, { backgroundColor: member.color }]}>
                        <Text style={styles.actionAvatarText}>{member.initials}</Text>
                      </View>
                      <View style={styles.actionInfo}>
                        <Text style={styles.actionName}>{member.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(member.timecard.status)}20` }]}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.timecard.status) }]} />
                          <Text style={[styles.statusBadgeText, { color: getStatusColor(member.timecard.status) }]}>
                            {getStatusLabel(member.timecard.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.actionHours}>
                        <Text style={styles.actionHoursValue}>{getTotalHours(member.timecard).toFixed(0)}h</Text>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* All crew members */}
              <Text style={styles.allMembersLabel}>All Crew Members</Text>
              {filteredCrewMembers.map(member => (
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
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(member.timecard.status)}18` }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.timecard.status) }]} />
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(member.timecard.status) }]}>
                          {getStatusLabel(member.timecard.status)}
                        </Text>
                      </View>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#999" />
                        <Text style={styles.dateText}>{formatDateRange(member.current_period.start_date, member.current_period.end_date)}</Text>
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
          ) : (
            /* Time Off Tab */
            <>
              {filteredCrewMembers.map(member => {
                const requests = member.time_off_requests || [];
                if (requests.length === 0) return null;
                return (
                  <View key={`timeoff-${member.id}`} style={styles.timeOffEmployeeCard}>
                    <View style={styles.timeOffEmployeeHeader}>
                      <View style={[styles.timeOffHeaderAvatar, { backgroundColor: member.color }]}>
                        <Text style={styles.timeOffHeaderAvatarText}>{member.initials}</Text>
                      </View>
                      <View style={styles.timeOffHeaderInfo}>
                        <Text style={styles.timeOffHeaderName}>{member.name}</Text>
                        <Text style={styles.timeOffHeaderCount}>
                          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                          {requests.filter(r => r.status === 'pending').length > 0 &&
                            ` · ${requests.filter(r => r.status === 'pending').length} pending`}
                        </Text>
                      </View>
                    </View>
                    {requests.map((req, i) => (
                      <View key={req.id}>
                        <Pressable
                          style={styles.timeOffRequestItem}
                          onPress={() => { setSelectedCrewMember(member); setSelectedTimeOffRequest(req); setTimeOffModalVisible(true); }}
                        >
                          <View style={styles.timeOffRequestLeft}>
                            <View style={[styles.timeOffTypeBadge, { backgroundColor: `${getTimeOffTypeColor(req.type)}15` }]}>
                              <Text style={[styles.timeOffTypeText, { color: getTimeOffTypeColor(req.type) }]}>{req.type}</Text>
                            </View>
                            <View style={styles.timeOffDates}>
                              <View style={styles.timeOffDateRow}>
                                <Ionicons name="calendar-outline" size={14} color="#666" />
                                <Text style={styles.timeOffDateText}>{formatDateRange(req.start_date, req.end_date)}</Text>
                              </View>
                              <Text style={styles.timeOffDaysText}>{req.days} {req.days === 1 ? 'day' : 'days'}</Text>
                            </View>
                            {req.reason ? <Text style={styles.timeOffReason} numberOfLines={2}>{req.reason}</Text> : null}
                          </View>
                          <View style={styles.timeOffRequestRight}>
                            <View style={[styles.timeOffStatusBadge, { backgroundColor: `${getTimeOffStatusColor(req.status)}20` }]}>
                              <View style={[styles.statusDot, { backgroundColor: getTimeOffStatusColor(req.status) }]} />
                              <Text style={[styles.timeOffStatusText, { color: getTimeOffStatusColor(req.status) }]}>
                                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginTop: 8 }} />
                          </View>
                        </Pressable>
                        {i < requests.length - 1 && <View style={styles.timeOffDivider} />}
                      </View>
                    ))}
                  </View>
                );
              })}
              {filteredCrewMembers.every(m => !m.time_off_requests?.length) && (
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

      {/* ── Timecard Details Modal ─────────────────────────────────────────── */}
      <Modal animationType="fade" transparent visible={detailsModalVisible} onRequestClose={() => setDetailsModalVisible(false)}>
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
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              {selectedCrewMember && (() => {
                const m = selectedCrewMember;
                const tc = m.timecard;
                return (
                  <>
                    {/* Employee header */}
                    <View style={styles.modalEmployeeSection}>
                      <View style={[styles.modalAvatar, { backgroundColor: m.color }]}>
                        <Text style={styles.modalAvatarText}>{m.initials}</Text>
                      </View>
                      <Text style={styles.modalEmployeeName}>{m.name}</Text>
                      <Text style={styles.modalPeriodDate}>{formatDateRange(tc.start_date, tc.end_date)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(tc.status)}20`, marginTop: 8 }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(tc.status) }]} />
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(tc.status) }]}>{getStatusLabel(tc.status)}</Text>
                      </View>
                    </View>

                    {/* Supervisor notes (if any) */}
                    {tc.notes && (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{tc.notes}</Text>
                      </View>
                    )}

                    {/* Daily hours */}
                    <View style={styles.dailyBreakdown}>
                      <Text style={styles.sectionLabel}>Daily Hours</Text>
                      <View style={styles.dailyTable}>
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
                          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Day</Text>
                          <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'right' }]}>Hours</Text>
                        </View>
                        {tc.daily_hours?.map((day, idx) => (
                          <View key={idx} style={styles.tableRow}>
                            <Text style={[styles.tableCellDate, { flex: 1 }]}>{formatDate(day.date)}</Text>
                            <Text style={[styles.tableCellDay,  { flex: 1 }]}>{day.day_name}</Text>
                            <Text style={[styles.tableCellHours, { width: 60, textAlign: 'right' }]}>
                              {day.hours > 0 ? day.hours.toFixed(1) : '-'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Summary */}
                    <View style={styles.summarySection}>
                      {[
                        { label: 'REGULAR',  val: tc.regular_hours },
                        { label: 'OVERTIME', val: tc.overtime_hours },
                      ].map(({ label, val }) => (
                        <View key={label} style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>{label}</Text>
                          <Text style={styles.summaryValue}>{(val || 0).toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>TOTAL</Text>
                        <Text style={styles.totalValue}>{getTotalHours(tc).toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Signature status */}
                    <View style={styles.signaturesSection}>
                      {[
                        { label: 'Employee Signature',   signed: tc.employee_signed },
                        { label: 'Supervisor Signature', signed: tc.supervisor_signed },
                      ].map(({ label, signed }) => (
                        <View key={label} style={styles.signatureBox}>
                          <Text style={styles.signatureLabel}>{label}</Text>
                          {signed
                            ? <View style={styles.signedIndicator}><Ionicons name="checkmark-circle" size={20} color="#50c878" /><Text style={styles.signedText}>Signed</Text></View>
                            : <Text style={styles.unsignedText}>Not signed</Text>
                          }
                        </View>
                      ))}
                    </View>

                    {/* Actions — shown only when employee has submitted (pending) */}
                    {tc.status === 'pending' && (
                      <View style={styles.modalActions}>
                        <Pressable
                          style={[styles.approveButton, approvingId === m.id && { opacity: 0.6 }]}
                          onPress={() => handleApprove(m)}
                          disabled={approvingId === m.id}
                        >
                          {approvingId === m.id
                            ? <ActivityIndicator color="#fff" />
                            : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.actionButtonText}>Approve Timecard</Text></>
                          }
                        </Pressable>
                        <Pressable
                          style={styles.rejectButton}
                          onPress={() => setRejectModalVisible(true)}
                        >
                          <Ionicons name="close-circle" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Reject Timecard</Text>
                        </Pressable>
                      </View>
                    )}
                    {/* Already approved — show re-open option */}
                    {tc.status === 'approved' && (
                      <View style={styles.modalActions}>
                        <View style={styles.approvedBanner}>
                          <Ionicons name="checkmark-circle" size={22} color="#50c878" />
                          <Text style={styles.approvedBannerText}>This timecard has been approved</Text>
                        </View>
                      </View>
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Reject Notes Modal ─────────────────────────────────────────────── */}
      <Modal animationType="fade" transparent visible={rejectModalVisible} onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 360 }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="close-circle" size={24} color="#e74c3c" />
              <Text style={styles.modalTitle}>Reject Timecard</Text>
              <Pressable onPress={() => setRejectModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />
            <Text style={styles.rejectPrompt}>
              Provide a note so the employee knows what to fix (optional):
            </Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="e.g. Missing Thursday hours, clock-out time incorrect..."
              placeholderTextColor="#aaa"
              value={rejectNotes}
              onChangeText={setRejectNotes}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <View style={styles.rejectActions}>
              <Pressable style={styles.rejectCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.rejectCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.rejectConfirmBtn} onPress={handleReject}>
                <Text style={styles.rejectConfirmText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Time Off Details Modal ─────────────────────────────────────────── */}
      <Modal animationType="fade" transparent visible={timeOffModalVisible} onRequestClose={() => setTimeOffModalVisible(false)}>
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
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              {selectedCrewMember && selectedTimeOffRequest && (() => {
                const req = selectedTimeOffRequest;
                return (
                  <>
                    <View style={styles.modalEmployeeSection}>
                      <View style={[styles.modalAvatar, { backgroundColor: selectedCrewMember.color }]}>
                        <Text style={styles.modalAvatarText}>{selectedCrewMember.initials}</Text>
                      </View>
                      <Text style={styles.modalEmployeeName}>{selectedCrewMember.name}</Text>
                      <View style={[styles.timeOffTypeBadge, { backgroundColor: `${getTimeOffTypeColor(req.type)}20`, marginTop: 8, paddingHorizontal: 16, paddingVertical: 8 }]}>
                        <Text style={[styles.timeOffTypeText, { color: getTimeOffTypeColor(req.type), fontSize: 14, fontWeight: '600' }]}>{req.type}</Text>
                      </View>
                      <View style={[styles.timeOffStatusBadge, { backgroundColor: `${getTimeOffStatusColor(req.status)}20`, marginTop: 8 }]}>
                        <View style={[styles.statusDot, { backgroundColor: getTimeOffStatusColor(req.status) }]} />
                        <Text style={[styles.timeOffStatusText, { color: getTimeOffStatusColor(req.status) }]}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.timeOffDetailsSection}>
                      {[
                        { icon: 'calendar-outline', label: 'Date Range', value: formatDateRange(req.start_date, req.end_date) },
                        { icon: 'time-outline',     label: 'Duration',   value: `${req.days} ${req.days === 1 ? 'day' : 'days'}` },
                        { icon: 'document-text-outline', label: 'Submitted', value: formatDate(req.submitted_date) },
                        ...(req.reviewed_date ? [{ icon: 'checkmark-circle-outline', label: 'Reviewed', value: formatDate(req.reviewed_date) }] : []),
                      ].map(({ icon, label, value }) => (
                        <View key={label} style={styles.timeOffDetailRow}>
                          <Ionicons name={icon} size={20} color="#666" />
                          <View style={styles.timeOffDetailContent}>
                            <Text style={styles.timeOffDetailLabel}>{label}</Text>
                            <Text style={styles.timeOffDetailValue}>{value}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                    {req.reason ? (
                      <View style={styles.timeOffReasonSection}>
                        <Text style={styles.sectionLabel}>Reason</Text>
                        <View style={styles.timeOffReasonBox}>
                          <Text style={styles.timeOffReasonText}>{req.reason}</Text>
                        </View>
                      </View>
                    ) : null}
                    {req.status === 'denied' && req.denial_reason ? (
                      <View style={styles.timeOffReasonSection}>
                        <Text style={styles.sectionLabel}>Denial Reason</Text>
                        <View style={[styles.timeOffReasonBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                          <Text style={[styles.timeOffReasonText, { color: '#991b1b' }]}>{req.denial_reason}</Text>
                        </View>
                      </View>
                    ) : null}
                    {req.status === 'pending' && (
                      <View style={styles.modalActions}>
                        <Pressable style={styles.approveButton} onPress={() => handleApproveTimeOff(req)}>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Approve Request</Text>
                        </Pressable>
                        <Pressable
                          style={styles.rejectButton}
                          onPress={() => { setDenyingTimeOffId(req.id); setDenyModalVisible(true); }}
                        >
                          <Ionicons name="close-circle" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Deny Request</Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Deny Time Off Reason Modal ─────────────────────────────────────── */}
      <Modal animationType="fade" transparent visible={denyModalVisible} onRequestClose={() => setDenyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 360 }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="close-circle" size={24} color="#e74c3c" />
              <Text style={styles.modalTitle}>Deny Request</Text>
              <Pressable onPress={() => setDenyModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />
            <Text style={styles.rejectPrompt}>Reason for denial (optional):</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="e.g. Scheduling conflict, insufficient coverage..."
              placeholderTextColor="#aaa"
              value={denyReason}
              onChangeText={setDenyReason}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <View style={styles.rejectActions}>
              <Pressable style={styles.rejectCancelBtn} onPress={() => setDenyModalVisible(false)}>
                <Text style={styles.rejectCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.rejectConfirmBtn} onPress={handleDenyTimeOff}>
                <Text style={styles.rejectConfirmText}>Deny</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyCrew;

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f5f5' },
  header:         { backgroundColor: '#ff7a00', paddingVertical: 20, paddingHorizontal: 20, paddingTop: 60 },
  headerTitle:    { fontSize: 32, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },

  weekNav:              { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, marginBottom: 2, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  weekNavArrow:         { padding: 6, borderRadius: 20, backgroundColor: '#f2f2f2' },
  weekNavArrowDisabled: { backgroundColor: '#f9f9f9' },
  weekNavPill:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  weekNavText:          { fontSize: 14, fontWeight: '600', color: '#333' },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffeaea', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ffc8c8' },
  errorBannerText: { flex: 1, fontSize: 13, color: '#e74c3c' },

  searchContainer: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, marginBottom: 0, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  searchIcon:      { marginRight: 8 },
  searchInput:     { flex: 1, fontSize: 16, color: '#333' },

  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, marginBottom: 8, borderRadius: 12, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  tab:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, gap: 6 },
  tabActive:     { backgroundColor: '#fff3e6' },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#ff7a00' },
  badge:         { backgroundColor: '#ff7a00', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText:     { fontSize: 11, fontWeight: '700', color: '#fff' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: 12, fontSize: 16, color: '#666' },
  emptyContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText:        { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#999' },
  emptySubtext:     { marginTop: 8, fontSize: 14, color: '#ccc', textAlign: 'center' },

  scrollView:    { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 8 },

  // Action needed section
  sectionCard:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle:    { fontSize: 17, fontWeight: '700', color: '#333', marginLeft: 8, flex: 1 },
  sectionSubtitle: { fontSize: 12, color: '#999', fontWeight: '500' },
  sectionLabel:    { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  actionCard:        { backgroundColor: '#fafafa', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center', padding: 12 },
  actionAvatar:      { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionAvatarText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionInfo:        { flex: 1 },
  actionName:        { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  actionHours:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionHoursValue:  { fontSize: 16, fontWeight: '700', color: '#4a90e2' },

  allMembersLabel: { fontSize: 13, fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },

  card:         { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  leftBorder:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardContent:  { flexDirection: 'row', alignItems: 'center', padding: 16, paddingLeft: 20 },
  avatar:       { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  infoSection:  { flex: 1 },
  memberName:   { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },

  statusBadge:     { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 6, gap: 4 },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: '#999' },

  hoursContainer: { alignItems: 'flex-end', backgroundColor: '#e8f4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  hoursValue:     { fontSize: 18, fontWeight: '700', color: '#4a90e2', marginBottom: 2 },
  hoursLabel:     { fontSize: 11, color: '#4a90e2', textTransform: 'uppercase', fontWeight: '600' },

  // Modal
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent:         { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 500, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 },
  modalScrollView:      { flex: 1 },
  modalScrollContent:   { paddingBottom: 20 },
  modalHeader:          { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalTitle:           { fontSize: 20, fontWeight: '700', color: '#333', marginLeft: 12, flex: 1 },
  closeButton:          { padding: 4 },
  modalDivider:         { height: 1, backgroundColor: '#f0f0f0', marginBottom: 20 },
  modalEmployeeSection: { alignItems: 'center', marginBottom: 24 },
  modalAvatar:          { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalAvatarText:      { fontSize: 24, fontWeight: '700', color: '#fff' },
  modalEmployeeName:    { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  modalPeriodDate:      { fontSize: 14, color: '#999', marginBottom: 8 },

  notesBox:   { backgroundColor: '#fff8e1', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ffe082' },
  notesLabel: { fontSize: 12, color: '#f57c00', fontWeight: '600', marginBottom: 4 },
  notesText:  { fontSize: 13, color: '#5d4037' },

  dailyBreakdown: { marginBottom: 20 },
  dailyTable:     { backgroundColor: '#f9f9f9', borderRadius: 8, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 12 },
  tableHeaderText: { fontSize: 12, fontWeight: '600', color: '#666', textTransform: 'uppercase' },
  tableRow:        { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tableCellDate:   { fontSize: 13, color: '#666' },
  tableCellDay:    { fontSize: 13, color: '#4a90e2', fontWeight: '500' },
  tableCellHours:  { fontSize: 13, color: '#333', fontWeight: '600' },

  summarySection: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 20 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  summaryLabel:   { fontSize: 14, color: '#666', fontWeight: '600' },
  summaryValue:   { fontSize: 14, color: '#333', fontWeight: '600' },
  totalRow:       { borderBottomWidth: 0, borderTopWidth: 2, borderTopColor: '#ff7a00', marginTop: 4, paddingTop: 12 },
  totalLabel:     { fontSize: 16, color: '#333', fontWeight: '700' },
  totalValue:     { fontSize: 16, color: '#ff7a00', fontWeight: '700' },

  signaturesSection: { marginBottom: 20 },
  signatureBox:      { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 12 },
  signatureLabel:    { fontSize: 12, color: '#666', marginBottom: 6 },
  signedIndicator:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signedText:        { fontSize: 14, color: '#50c878', fontWeight: '600' },
  unsignedText:      { fontSize: 14, color: '#999', fontStyle: 'italic' },

  modalActions:       { gap: 12 },
  approveButton:      { flexDirection: 'row', backgroundColor: '#50c878', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 8 },
  rejectButton:       { flexDirection: 'row', backgroundColor: '#e74c3c', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionButtonText:   { fontSize: 14, fontWeight: '600', color: '#fff' },
  approvedBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#e8f5e9', borderRadius: 8, padding: 14 },
  approvedBannerText: { fontSize: 15, color: '#2e7d32', fontWeight: '600' },

  // Reject modal
  rejectPrompt:     { fontSize: 14, color: '#333', marginBottom: 12 },
  rejectInput:      { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 14, color: '#333', minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 16 },
  rejectActions:    { flexDirection: 'row', gap: 12 },
  rejectCancelBtn:  { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  rejectCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  rejectConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#e74c3c', alignItems: 'center' },
  rejectConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Time off
  timeOffEmployeeCard:   { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  timeOffEmployeeHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  timeOffHeaderAvatar:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  timeOffHeaderAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  timeOffHeaderInfo:     { flex: 1 },
  timeOffHeaderName:     { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 2 },
  timeOffHeaderCount:    { fontSize: 13, color: '#666' },

  timeOffRequestItem:  { flexDirection: 'row', padding: 16 },
  timeOffRequestLeft:  { flex: 1, marginRight: 12 },
  timeOffRequestRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  timeOffTypeBadge:    { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 8 },
  timeOffTypeText:     { fontSize: 12, fontWeight: '600' },
  timeOffDates:        { marginBottom: 8 },
  timeOffDateRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  timeOffDateText:     { fontSize: 14, color: '#333', fontWeight: '500' },
  timeOffDaysText:     { fontSize: 13, color: '#666', marginLeft: 20 },
  timeOffReason:       { fontSize: 13, color: '#666', fontStyle: 'italic', lineHeight: 18 },
  timeOffStatusBadge:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  timeOffStatusText:   { fontSize: 12, fontWeight: '600' },
  timeOffDivider:      { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },

  timeOffDetailsSection: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 20 },
  timeOffDetailRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  timeOffDetailContent: { marginLeft: 12, flex: 1 },
  timeOffDetailLabel:   { fontSize: 12, color: '#666', marginBottom: 2, textTransform: 'uppercase', fontWeight: '600' },
  timeOffDetailValue:   { fontSize: 14, color: '#333', fontWeight: '500' },
  timeOffReasonSection: { marginBottom: 20 },
  timeOffReasonBox:     { backgroundColor: '#f0f9ff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e0f2fe' },
  timeOffReasonText:    { fontSize: 14, color: '#0c4a6e', lineHeight: 20 },
});