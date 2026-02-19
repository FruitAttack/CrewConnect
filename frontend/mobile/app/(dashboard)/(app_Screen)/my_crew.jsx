import { StyleSheet, Text, View, ScrollView, Pressable, Modal, ActivityIndicator, RefreshControl, TextInput, Platform, StatusBar } from 'react-native';
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

/** Identical to the timecard screen's day-overlap calculator — clips entries to day boundaries */
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
      const overlapSeconds = (overlapEnd - overlapStart) / 1000;
      const entryDuration  = (clockOut - clockIn) / 1000;
      const overlapRatio   = overlapSeconds / entryDuration;
      const breakSeconds   = (entry.break_minutes || 0) * 60 * overlapRatio;
      totalSeconds += Math.max(0, overlapSeconds - breakSeconds);
    }
  });

  return Math.round(totalSeconds);
}
function getCurrentWeekRange() {
  const d = new Date();
  // Go back 7 days to land in the previous week
  d.setDate(d.getDate() - 7);
  const day = d.getDay(); // 0=Sun
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const toISO = (dt) => dt.toISOString().split('T')[0];
  return { weekStart: toISO(monday), weekEnd: toISO(sunday) };
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

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [timeOffModalVisible, setTimeOffModalVisible] = useState(false);
  const [selectedCrewMember, setSelectedCrewMember] = useState(null);
  const [selectedTimeOffRequest, setSelectedTimeOffRequest] = useState(null);
  const [crewMembers, setCrewMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('timecards'); // 'timecards' or 'timeoff'
  const [error, setError] = useState(null);

  // ─── Fetch & assemble crew data ─────────────────────────────────────────────
  const fetchCrewMembers = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get logged-in user + company
      const meRes = await getUserProfile(token);
      const me = meRes?.data?.user;
      if (!me) throw new Error('Could not load user profile');
      const companyId = me.default_company_id;
      const myUserId = me.id;

      // 2. Get all crews for company, filter client-side to ones where I'm the foreman
      const crewsRes = await getCrews(token, companyId);
      const allCrews = crewsRes?.data?.crews || [];

      // String comparison to be safe with UUID types
      const myCrews = allCrews.filter(c => String(c.foreman_id) === String(myUserId));

      console.log('[MyCrew] My user ID:', myUserId);
      console.log('[MyCrew] All crews:', allCrews.map(c => ({ name: c.name, foreman_id: c.foreman_id })));
      console.log('[MyCrew] My crews after filter:', myCrews.map(c => c.name));

      // Collect unique crew members ONLY from my crews
      const memberMap = new Map();
      myCrews.forEach(crew => {
        (crew.crew_members || []).forEach((cm) => {
          const u = cm.user;
          // Don't include myself (the foreman) in the list
          if (u && u.id !== myUserId && !memberMap.has(u.id)) {
            memberMap.set(u.id, { user: u });
          }
        });
      });

      console.log('[MyCrew] Crew members found:', memberMap.size);

      if (memberMap.size === 0) {
        setCrewMembers([]);
        return;
      }

      // 3. Get current week time entries for all crew members
      const { weekStart, weekEnd } = getCurrentWeekRange();
      const [timeEntriesRes, approvalsRes, timeOffRes] = await Promise.all([
        getTimeEntries(token, {
          all_users: 'true',
          start_date: weekStart,
          end_date: weekEnd,
          limit: 500,
        }),
        getTimecardApprovals(token, {
          company_id: companyId,
          week_start: weekStart,
        }),
        getTimeOffAll(token),
      ]);

      const allEntries = timeEntriesRes?.data?.time_entries || [];
      const allApprovals = approvalsRes?.data || [];
      const allTimeOff = timeOffRes?.data?.data || [];

      // Index approvals by user_id for fast lookup
      const approvalByUser = {};
      allApprovals.forEach(a => { approvalByUser[a.user_id] = a; });

      // Index time-off requests by user_id
      const timeOffByUser = {};
      allTimeOff.forEach(req => {
        const uid = req.user_id;
        if (!timeOffByUser[uid]) timeOffByUser[uid] = [];
        timeOffByUser[uid].push(req);
      });

      // 4. Build crew member objects
      const built = [];
      let colorIndex = 0;

      memberMap.forEach(({ user }, userId) => {
        // Get this user's entries for the week
        const userEntries = allEntries.filter(e => e.user_id === userId);

        // Generate 7-day array using the same overlap-based calculation as the timecard screen
        const daily_hours = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart + 'T00:00:00');
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const seconds = calculateSecondsForDay(userEntries, dateStr);
          const hours = Math.round((seconds / 3600) * 100) / 100;
          daily_hours.push({
            date: dateStr,
            day_name: DAY_NAMES[d.getDay()],
            hours,
          });
        }

        const totalHours = daily_hours.reduce((sum, d) => sum + d.hours, 0);
        const regularHours = Math.min(totalHours, 40);
        const overtimeHours = Math.max(0, totalHours - 40);

        // Map approval status → UI status
        const approval = approvalByUser[userId];
        let timecardStatus = 'ready'; // default: no approval yet = ready for supervisor
        if (approval) {
          if (approval.status === 'approved') timecardStatus = 'signed';
          else if (approval.status === 'pending') timecardStatus = 'pending';
          else if (approval.status === 'rejected') timecardStatus = 'ready';
          else timecardStatus = approval.status;
        }

        // Map time-off requests to expected shape
        const rawTimeOff = timeOffByUser[userId] || [];
        const time_off_requests = rawTimeOff.map(r => ({
          id: r.id,
          start_date: r.start_date,
          end_date: r.end_date,
          type: r.type || r.leave_type || 'PTO',
          status: r.status,
          days: r.total_hours ? Math.ceil(r.total_hours / 8) : (r.days || 1),
          reason: r.reason || '',
          submitted_date: r.created_at ? r.created_at.split('T')[0] : '',
          reviewed_date: r.reviewed_at ? r.reviewed_at.split('T')[0] : undefined,
          denial_reason: r.denial_reason || undefined,
        }));

        const color = colorForIndex(colorIndex++);

        built.push({
          id: userId,
          name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          initials: getInitials(user.full_name || `${user.first_name || ''} ${user.last_name || ''}`),
          color,
          // Approval record stored for use in handleApprove
          _approval: approval || null,
          _companyId: companyId,
          _weekStart: weekStart,
          _weekEnd: weekEnd,
          current_period: {
            start_date: weekStart,
            end_date: weekEnd,
            total_hours: Math.round(totalHours * 100) / 100,
          },
          timecard: {
            start_date: weekStart,
            end_date: weekEnd,
            status: timecardStatus,
            regular_hours: Math.round(regularHours * 100) / 100,
            overtime_hours: Math.round(overtimeHours * 100) / 100,
            employee_signed: approval?.status === 'approved' || false,
            supervisor_signed: approval?.status === 'approved' || false,
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

  useEffect(() => {
    fetchCrewMembers();
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCrewMembers();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const year = startDate.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}, ${year} - ${endMonth} ${endDate.getDate()}, ${year}`;
    }
    return `${startMonth} ${startDate.getDate()}, ${year} - ${endMonth} ${endDate.getDate()}, ${year}`;
  };

  const getTotalHours = (timecard) => {
    return (timecard.regular_hours || 0) + (timecard.overtime_hours || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'signed':
        return '#50c878';
      case 'pending':
        return '#f39c12';
      case 'ready':
        return '#4a90e2';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'signed':
        return 'Signed';
      case 'pending':
        return 'Pending';
      case 'ready':
        return 'Ready to Sign';
      default:
        return 'Draft';
    }
  };

  const handleViewDetails = (member) => {
    setSelectedCrewMember(member);
    setDetailsModalVisible(true);
  };

  const handleApprove = async (member) => {
    try {
      const res = await upsertTimecardApproval(token, {
        company_id: member._companyId,
        user_id: member.id,
        week_start: member._weekStart,
        week_end: member._weekEnd,
        status: 'approved',
      });
      if (res.success) {
        // Optimistically update local state — only supervisor signs here
        setCrewMembers(prev => prev.map(m => m.id === member.id ? {
          ...m,
          timecard: { ...m.timecard, status: 'signed', supervisor_signed: true },
        } : m));
        setDetailsModalVisible(false);
      } else {
        console.error('Approve timecard failed:', res.message);
      }
    } catch (err) {
      console.error('handleApprove error:', err);
    }
  };

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
      } else {
        console.error('Approve time off failed:', res.message);
      }
    } catch (err) {
      console.error('handleApproveTimeOff error:', err);
    }
    setTimeOffModalVisible(false);
  };

  const handleDenyTimeOff = async (request, reason) => {
    try {
      const res = await denyTimeOff(token, request.id, reason);
      if (res.success) {
        setCrewMembers(prev => prev.map(m => ({
          ...m,
          time_off_requests: m.time_off_requests.map(r =>
            r.id === request.id ? { ...r, status: 'denied', denial_reason: reason } : r
          ),
        })));
      } else {
        console.error('Deny time off failed:', res.message);
      }
    } catch (err) {
      console.error('handleDenyTimeOff error:', err);
    }
    setTimeOffModalVisible(false);
  };

  const getTimeOffStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#50c878';
      case 'denied':
        return '#e74c3c';
      case 'pending':
        return '#f39c12';
      default:
        return '#999';
    }
  };

  const getTimeOffTypeColor = (type) => {
    switch (type) {
      case 'Vacation':
        return '#4a90e2';
      case 'Sick Leave':
        return '#e74c3c';
      case 'Personal':
        return '#9b59b6';
      default:
        return '#999';
    }
  };

  const getPendingTimeOffCount = () => {
    return crewMembers.reduce((count, member) => {
      return count + (member.time_off_requests?.filter(r => r.status === 'pending').length || 0);
    }, 0);
  };

  const handleViewTimeOffDetails = (member, request) => {
    setSelectedCrewMember(member);
    setSelectedTimeOffRequest(request);
    setTimeOffModalVisible(true);
  };

  const getPendingCount = () => {
    return crewMembers.filter(m => m.timecard.status === 'ready' || m.timecard.status === 'pending').length;
  };

  const filteredCrewMembers = crewMembers.filter(member => {
    if (!searchQuery) return true;
    return member.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get timecards ready to sign for Jan 1-31, 2025
  const getReadyToSignTimecards = () => {
    const targetStart = '2025-01-01';
    const targetEnd = '2025-01-31';
    
    return crewMembers.filter(member => {
      const tcStart = member.timecard.start_date;
      const tcEnd = member.timecard.end_date;
      
      // Check if timecard period overlaps with Jan 1-31, 2025
      const isInTargetPeriod = (tcStart >= targetStart && tcStart <= targetEnd) || 
                               (tcEnd >= targetStart && tcEnd <= targetEnd);
      
      return isInTargetPeriod && (member.timecard.status === 'ready' || member.timecard.status === 'pending');
    });
  };

  const readyToSignTimecards = getReadyToSignTimecards();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Crew</Text>
        <Text style={styles.headerSubtitle}>
          {getPendingCount()} pending {getPendingCount() === 1 ? 'review' : 'reviews'}
        </Text>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#e74c3c" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={18} color="#e74c3c" />
          </Pressable>
        </View>
      )}

      {/* Search Bar */}
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
          <Ionicons 
            name="time-outline" 
            size={20} 
            color={selectedTab === 'timecards' ? '#ff7a00' : '#999'} 
          />
          <Text style={[styles.tabText, selectedTab === 'timecards' && styles.tabTextActive]}>
            Timecards
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{crewMembers.filter(m => m.timecard.status === 'ready').length}</Text>
          </View>
        </Pressable>

        <Pressable 
          style={[styles.tab, selectedTab === 'timeoff' && styles.tabActive]}
          onPress={() => setSelectedTab('timeoff')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={selectedTab === 'timeoff' ? '#ff7a00' : '#999'} 
          />
          <Text style={[styles.tabText, selectedTab === 'timeoff' && styles.tabTextActive]}>
            Time Off
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getPendingTimeOffCount()}</Text>
          </View>
        </Pressable>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a00" />
          <Text style={styles.loadingText}>Loading crew members...</Text>
        </View>
      ) : filteredCrewMembers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No crew members found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ff7a00"
              colors={["#ff7a00"]}
            />
          }
        >
          {selectedTab === 'timecards' ? (
            <>
              {/* Ready to Sign Section */}
              {readyToSignTimecards.length > 0 && (
                <View style={styles.readyToSignSection}>
                  <View style={styles.readyToSignHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#ff7a00" />
                    <Text style={styles.readyToSignTitle}>Ready to Sign</Text>
                    <Text style={styles.readyToSignSubtitle}>Jan 1, 2025 - Jan 31, 2025</Text>
                  </View>
                  
                  {readyToSignTimecards.map((member) => (
                    <Pressable 
                      key={`ready-${member.id}`}
                      style={styles.readyToSignCard}
                      onPress={() => handleViewDetails(member)}
                    >
                      <View style={styles.readyToSignCardContent}>
                        <View style={[styles.readyToSignAvatar, { backgroundColor: member.color }]}>
                          <Text style={styles.readyToSignAvatarText}>{member.initials}</Text>
                        </View>
                        
                        <View style={styles.readyToSignInfo}>
                          <Text style={styles.readyToSignName}>{member.name}</Text>
                          <View style={styles.readyToSignMeta}>
                            <View style={[styles.readyToSignStatusBadge, { backgroundColor: `${getStatusColor(member.timecard.status)}20` }]}>
                              <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.timecard.status) }]} />
                              <Text style={[styles.readyToSignStatusText, { color: getStatusColor(member.timecard.status) }]}>
                                {getStatusLabel(member.timecard.status)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.readyToSignHours}>
                          <Text style={styles.readyToSignHoursValue}>
                            {getTotalHours(member.timecard).toFixed(0)}h
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color="#999" />
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Crew Members List */}
              {filteredCrewMembers.map((member) => (
                <Pressable 
                  key={member.id} 
                  style={styles.card}
                  onPress={() => handleViewDetails(member)}
                >
                  {/* Left colored border indicator */}
                  <View style={[styles.leftBorder, { backgroundColor: member.color }]} />
                  
                  <View style={styles.cardContent}>
                    {/* Avatar with Initials */}
                    <View style={[styles.avatar, { backgroundColor: member.color }]}>
                      <Text style={styles.avatarText}>{member.initials}</Text>
                    </View>
                    
                    {/* Member Info */}
                    <View style={styles.infoSection}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {/* Status Badge */}
                      <View style={[styles.cardStatusBadge, { backgroundColor: `${getStatusColor(member.timecard.status)}18` }]}>
                        <View style={[styles.cardStatusDot, { backgroundColor: getStatusColor(member.timecard.status) }]} />
                        <Text style={[styles.cardStatusText, { color: getStatusColor(member.timecard.status) }]}>
                          {getStatusLabel(member.timecard.status)}
                        </Text>
                      </View>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={14} color="#999" />
                        <Text style={styles.dateText}>
                          {formatDateRange(member.current_period.start_date, member.current_period.end_date)}
                        </Text>
                      </View>
                    </View>

                    {/* Hours Display */}
                    <View style={styles.hoursContainer}>
                      <Text style={styles.hoursValue}>
                        {member.current_period.total_hours.toFixed(0)}h
                      </Text>
                      <Text style={styles.hoursLabel}>Total</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </>
          ) : (
            /* Time Off Requests View */
            <>
              {filteredCrewMembers.map((member) => {
                const requests = member.time_off_requests || [];
                if (requests.length === 0) return null;
                
                return (
                  <View key={`timeoff-${member.id}`} style={styles.timeOffEmployeeCard}>
                    {/* Employee Header */}
                    <View style={styles.timeOffEmployeeHeader}>
                      <View style={[styles.timeOffHeaderAvatar, { backgroundColor: member.color }]}>
                        <Text style={styles.timeOffHeaderAvatarText}>{member.initials}</Text>
                      </View>
                      <View style={styles.timeOffHeaderInfo}>
                        <Text style={styles.timeOffHeaderName}>{member.name}</Text>
                        <Text style={styles.timeOffHeaderCount}>
                          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                          {requests.filter(r => r.status === 'pending').length > 0 && 
                            ` Ã‚Â· ${requests.filter(r => r.status === 'pending').length} pending`
                          }
                        </Text>
                      </View>
                    </View>

                    {/* Time Off Requests */}
                    {requests.map((request, index) => (
                      <View key={request.id}>
                        <Pressable 
                          style={styles.timeOffRequestItem}
                          onPress={() => handleViewTimeOffDetails(member, request)}
                        >
                          <View style={styles.timeOffRequestLeft}>
                            {/* Type Badge */}
                            <View style={[styles.timeOffTypeBadge, { backgroundColor: `${getTimeOffTypeColor(request.type)}15` }]}>
                              <Text style={[styles.timeOffTypeText, { color: getTimeOffTypeColor(request.type) }]}>
                                {request.type}
                              </Text>
                            </View>
                            
                            {/* Dates */}
                            <View style={styles.timeOffDates}>
                              <View style={styles.timeOffDateRow}>
                                <Ionicons name="calendar-outline" size={14} color="#666" />
                                <Text style={styles.timeOffDateText}>
                                  {formatDateRange(request.start_date, request.end_date)}
                                </Text>
                              </View>
                              <Text style={styles.timeOffDaysText}>{request.days} {request.days === 1 ? 'day' : 'days'}</Text>
                            </View>

                            {/* Reason */}
                            {request.reason && (
                              <Text style={styles.timeOffReason} numberOfLines={2}>{request.reason}</Text>
                            )}
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
                        
                        {/* Divider between requests within same employee card */}
                        {index < requests.length - 1 && (
                          <View style={styles.timeOffDivider} />
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
              
              {filteredCrewMembers.every(m => !m.time_off_requests || m.time_off_requests.length === 0) && (
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

      {/* Timecard Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="time" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Timecard Details</Text>
              <Pressable 
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedCrewMember && (
                <>
                  {/* Employee Header */}
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

                  {/* Daily Breakdown */}
                  <View style={styles.dailyBreakdown}>
                    <Text style={styles.sectionTitle}>Daily Hours</Text>
                    <View style={styles.dailyTable}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>Day</Text>
                        <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'right' }]}>Hours</Text>
                      </View>
                      {selectedCrewMember.timecard.daily_hours?.map((day, index) => (
                        <View key={index} style={styles.tableRow}>
                          <Text style={[styles.tableCellDate, { flex: 1 }]}>{formatDate(day.date)}</Text>
                          <Text style={[styles.tableCellDay, { flex: 1 }]}>{day.day_name}</Text>
                          <Text style={[styles.tableCellHours, { width: 60, textAlign: 'right' }]}>
                            {day.hours > 0 ? day.hours.toFixed(1) : '-'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Hours Summary */}
                  <View style={styles.summarySection}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>REGULAR</Text>
                      <Text style={styles.summaryValue}>
                        {(selectedCrewMember.timecard.regular_hours || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>OVERTIME</Text>
                      <Text style={styles.summaryValue}>
                        {(selectedCrewMember.timecard.overtime_hours || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>TOTAL</Text>
                      <Text style={styles.totalValue}>
                        {getTotalHours(selectedCrewMember.timecard).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Signatures Section */}
                  {selectedCrewMember.timecard.status !== 'draft' && (
                    <View style={styles.signaturesSection}>
                      <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Employee Signature</Text>
                        {selectedCrewMember.timecard.employee_signed ? (
                          <View style={styles.signedIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#50c878" />
                            <Text style={styles.signedText}>Signed</Text>
                          </View>
                        ) : (
                          <Text style={styles.unsignedText}>Not signed</Text>
                        )}
                      </View>
                      
                      <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Supervisor Signature</Text>
                        {selectedCrewMember.timecard.supervisor_signed ? (
                          <View style={styles.signedIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="#50c878" />
                            <Text style={styles.signedText}>Signed</Text>
                          </View>
                        ) : (
                          <Text style={styles.unsignedText}>Not signed</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Actions */}
                  {(selectedCrewMember.timecard.status === 'ready' || selectedCrewMember.timecard.status === 'pending') && (
                    <View style={styles.modalActions}>
                      <Pressable 
                        style={styles.actionButton}
                        onPress={() => {
                          handleApprove(selectedCrewMember);
                          setDetailsModalVisible(false);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve Timecard</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Off Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={timeOffModalVisible}
        onRequestClose={() => setTimeOffModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={24} color="#ff7a00" />
              <Text style={styles.modalTitle}>Time Off Request</Text>
              <Pressable 
                onPress={() => setTimeOffModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            
            <View style={styles.modalDivider} />
            
            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedCrewMember && selectedTimeOffRequest && (
                <>
                  {/* Employee Header */}
                  <View style={styles.modalEmployeeSection}>
                    <View style={[styles.modalAvatar, { backgroundColor: selectedCrewMember.color }]}>
                      <Text style={styles.modalAvatarText}>{selectedCrewMember.initials}</Text>
                    </View>
                    <Text style={styles.modalEmployeeName}>{selectedCrewMember.name}</Text>
                    
                    <View style={[styles.timeOffTypeBadge, { 
                      backgroundColor: `${getTimeOffTypeColor(selectedTimeOffRequest.type)}20`,
                      marginTop: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                    }]}>
                      <Text style={[styles.timeOffTypeText, { 
                        color: getTimeOffTypeColor(selectedTimeOffRequest.type),
                        fontSize: 14,
                        fontWeight: '600',
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

                  {/* Request Details */}
                  <View style={styles.timeOffDetailsSection}>
                    <View style={styles.timeOffDetailRow}>
                      <Ionicons name="calendar-outline" size={20} color="#666" />
                      <View style={styles.timeOffDetailContent}>
                        <Text style={styles.timeOffDetailLabel}>Date Range</Text>
                        <Text style={styles.timeOffDetailValue}>
                          {formatDateRange(selectedTimeOffRequest.start_date, selectedTimeOffRequest.end_date)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timeOffDetailRow}>
                      <Ionicons name="time-outline" size={20} color="#666" />
                      <View style={styles.timeOffDetailContent}>
                        <Text style={styles.timeOffDetailLabel}>Duration</Text>
                        <Text style={styles.timeOffDetailValue}>
                          {selectedTimeOffRequest.days} {selectedTimeOffRequest.days === 1 ? 'day' : 'days'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timeOffDetailRow}>
                      <Ionicons name="document-text-outline" size={20} color="#666" />
                      <View style={styles.timeOffDetailContent}>
                        <Text style={styles.timeOffDetailLabel}>Submitted</Text>
                        <Text style={styles.timeOffDetailValue}>
                          {formatDate(selectedTimeOffRequest.submitted_date)}
                        </Text>
                      </View>
                    </View>

                    {selectedTimeOffRequest.reviewed_date && (
                      <View style={styles.timeOffDetailRow}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
                        <View style={styles.timeOffDetailContent}>
                          <Text style={styles.timeOffDetailLabel}>Reviewed</Text>
                          <Text style={styles.timeOffDetailValue}>
                            {formatDate(selectedTimeOffRequest.reviewed_date)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Reason */}
                  {selectedTimeOffRequest.reason && (
                    <View style={styles.timeOffReasonSection}>
                      <Text style={styles.sectionTitle}>Reason</Text>
                      <View style={styles.timeOffReasonBox}>
                        <Text style={styles.timeOffReasonText}>{selectedTimeOffRequest.reason}</Text>
                      </View>
                    </View>
                  )}

                  {/* Denial Reason */}
                  {selectedTimeOffRequest.status === 'denied' && selectedTimeOffRequest.denial_reason && (
                    <View style={styles.timeOffReasonSection}>
                      <Text style={styles.sectionTitle}>Denial Reason</Text>
                      <View style={[styles.timeOffReasonBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                        <Text style={[styles.timeOffReasonText, { color: '#991b1b' }]}>
                          {selectedTimeOffRequest.denial_reason}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Actions for Pending Requests */}
                  {selectedTimeOffRequest.status === 'pending' && (
                    <View style={styles.modalActions}>
                      <Pressable 
                        style={styles.approveButton}
                        onPress={() => handleApproveTimeOff(selectedTimeOffRequest)}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve Request</Text>
                      </Pressable>
                      
                      <Pressable 
                        style={styles.denyButton}
                        onPress={() => {
                          // In a real app, would show a text input for denial reason
                          handleDenyTimeOff(selectedTimeOffRequest, 'Scheduling conflict');
                        }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#ff7a00",
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#fff3e6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#ff7a00',
  },
  badge: {
    backgroundColor: '#ff7a00',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffeaea',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc8c8',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#e74c3c',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  // Ready to Sign Section Styles
  readyToSignSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  readyToSignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  readyToSignTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  readyToSignSubtitle: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  readyToSignCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  readyToSignCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  readyToSignAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  readyToSignAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  readyToSignInfo: {
    flex: 1,
  },
  readyToSignName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  readyToSignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyToSignStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  readyToSignStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readyToSignHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyToSignHoursValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a90e2',
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingLeft: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  infoSection: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  cardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
    gap: 4,
  },
  cardStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: "#999",
  },
  hoursContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#e8f4ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a90e2',
    marginBottom: 2,
  },
  hoursLabel: {
    fontSize: 11,
    color: '#4a90e2',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  modalEmployeeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  modalEmployeeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  modalPeriodDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dailyBreakdown: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dailyTable: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCellDate: {
    fontSize: 13,
    color: '#666',
  },
  tableCellDay: {
    fontSize: 13,
    color: '#4a90e2',
    fontWeight: '500',
  },
  tableCellHours: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  summarySection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#ff7a00',
    marginTop: 4,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    color: '#ff7a00',
    fontWeight: '700',
  },
  signaturesSection: {
    marginBottom: 20,
  },
  signatureBox: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  signatureLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  signedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signedText: {
    fontSize: 14,
    color: '#50c878',
    fontWeight: '600',
  },
  unsignedText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  modalActions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#ff7a00',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Time Off Styles
  timeOffEmployeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  timeOffEmployeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOffHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeOffHeaderAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  timeOffHeaderInfo: {
    flex: 1,
  },
  timeOffHeaderName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  timeOffHeaderCount: {
    fontSize: 13,
    color: '#666',
  },
  timeOffRequestItem: {
    flexDirection: 'row',
    padding: 16,
  },
  timeOffRequestLeft: {
    flex: 1,
    marginRight: 12,
  },
  timeOffRequestRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  timeOffContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  timeOffEmployeeSection: {
    marginBottom: 20,
  },
  timeOffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeOffAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  timeOffEmployeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  timeOffBadge: {
    backgroundColor: '#fff3e6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeOffBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff7a00',
  },
  timeOffCard: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  timeOffCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  timeOffCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  timeOffEmployeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeOffCardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  timeOffCardAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  timeOffCardEmployeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeOffTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  timeOffTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeOffDates: {
    marginBottom: 8,
  },
  timeOffDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeOffDateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeOffDaysText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 20,
  },
  timeOffReason: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  timeOffStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timeOffStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeOffDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  timeOffDetailsSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  timeOffDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timeOffDetailContent: {
    marginLeft: 12,
    flex: 1,
  },
  timeOffDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  timeOffDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeOffReasonSection: {
    marginBottom: 20,
  },
  timeOffReasonBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  timeOffReasonText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  approveButton: {
    flexDirection: 'row',
    backgroundColor: '#50c878',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  denyButton: {
    flexDirection: 'row',
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});